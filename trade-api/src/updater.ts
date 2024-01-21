import { PublicStashChange, PublicStashResponse } from "./poe-api";
import { isStandardLeague, toItemListing } from "./db/item-listing.utils.ts";
import { getNextChangeId, setNextChangeId } from "./db/next-change.utils.ts";
import { mptPrisma, scrapperPrisma } from "./db/db.ts";
import { ItemListing, PrismaPromise } from "./generated/client-mpt";
import { elapsed } from "./utils/elapsed.ts";
import { repeatUntil } from "./utils/repeatUntil.ts";
import { mysqlReplaceMany } from "./db/mysql-replace-many.ts";

let nextChangeId = await getNextChangeId();

type BatchItem =
  | BatchItemCreateStash
  | BatchItemDeleteStash
  | BatchItemUpdate
  | BatchItemUpdateMany
  | BatchItemDropItems;

export interface BatchItemUpdate {
  type: "update";
  data: ItemListing;
}

export interface BatchItemUpdateMany {
  type: "updateMany";
  data: ItemListing[];
}

interface BatchItemCreateStash {
  type: "createStash";
  stash: PublicStashChange;
  items: ItemListing[];
}

interface BatchItemDeleteStash {
  type: "delete";
  stashId: string;
}

interface BatchItemDropItems {
  type: "dropItems";
  stashId: string;
  notIn: string[];
}

function prismaBatch(batch: BatchItem[]): PrismaPromise<any>[] {
  let createStashCount = 0;
  let createStashItemsCount = 0;
  let updateItemCount = 0;
  let updateManyCount = 0;
  let dropItemsCount = 0;
  let deleteStashCount = 0;

  const prismaPromises = batch.reduce((prismaBatchArr, item) => {
    if (item.type === "createStash") {
      createStashCount++;
      createStashItemsCount += item.items.length;
      prismaBatchArr.push(
        mptPrisma.publicStash.create({
          data: {
            id: item.stash.id!,
            name: item.stash.stash ?? "<no stash name>",
            accountName: item.stash.accountName ?? "<unknown account>",
            league: item.stash.league!,
          },
        }),
      );
      prismaBatchArr.push(
        mptPrisma.itemListing.createMany({
          data: item.items,
        }),
      );
    } else if (item.type === "update") {
      updateItemCount++;
      prismaBatchArr.push(
        mptPrisma.itemListing.upsert({
          create: item.data,
          update: item.data,
          where: {
            id: item.data.id,
          },
        }),
      );
    } else if (item.type === "updateMany") {
      updateManyCount++;
      prismaBatchArr.push(mysqlReplaceMany(mptPrisma, item.data));
    } else if (item.type === "delete") {
      deleteStashCount++;
      prismaBatchArr.push(
        mptPrisma.publicStash.delete({
          where: {
            id: item.stashId,
          },
        }),
      );
    } else if (item.type === "dropItems") {
      dropItemsCount++;
      prismaBatchArr.push(
        mptPrisma.itemListing.deleteMany({
          where: {
            stashId: item.stashId,
            id: {
              notIn: item.notIn,
            },
          },
        }),
      );
    } else {
      throw new Error(`Unknown batchItem type ${(item as any).type}`);
    }

    return prismaBatchArr;
  }, [] as PrismaPromise<any>[]);

  console.log(
    `createStash: ${createStashCount} (items: ${createStashItemsCount}), updateItem: ${updateItemCount}, updateMany: ${updateManyCount}, dropItems: ${dropItemsCount}, deleteStash: ${deleteStashCount}`,
  );

  return prismaPromises;
}

async function updateDb() {
  const startTime = process.hrtime.bigint();
  console.log(`Request public stashes for next_change_id=${nextChangeId}...`);
  const result = await scrapperPrisma.publicStashChange.findUnique({
    where: {
      stashChangeId: nextChangeId ?? "undefined",
    },
  });

  if (!result) {
    console.log(
      `Couldnt find stash change with id ${nextChangeId}! Seems there are holes in data?`,
    );
    return;
  }

  const { stashes, next_change_id } =
    result.data as unknown as PublicStashResponse;

  if (stashes.length === 0) {
    console.log(
      "Found nuffin! Waiting for scrapper to get latest stash change.",
    );
    await Bun.sleep(1000);
    return;
  }
  const batchItems: BatchItem[] = [];
  console.log(
    `Found ${stashes.length} public stashes! Took ${elapsed(startTime)}ms`,
  );

  console.log(`[stashes] Querying changed stashes...`);
  const stashIds = stashes.map((stash) => stash.id);
  const dbStashes = await mptPrisma.publicStash.findMany({
    where: {
      id: {
        in: stashIds,
      },
    },
    orderBy: {
      id: "asc",
    },
  });
  console.log(
    `[stashes] Querying complete! Took ${elapsed(startTime)}ms and found ${
      dbStashes.length
    } stashes!`,
  );

  for (const stash of stashes) {
    const dbStash = dbStashes.find((dbStash) => dbStash.id === stash.id);
    if (dbStash && !stash.public) {
      // Stash got unlisted - remove all items from db
      dbStashes.forEach((item) => {
        batchItems.push({
          type: "delete",
          stashId: stash.id,
        });
      });
    }

    if (!dbStash && stash.public) {
      // we havent indexed this stash tab
      // just put everything in

      const itemListings = await stash.items.reduce(
        async (arrPromise, item) => {
          const arr = await arrPromise;

          arr.push(await toItemListing(stash, item));

          return arr;
        },
        Promise.resolve([] as ItemListing[]),
      );

      batchItems.push({
        type: "createStash",
        stash: stash,
        items: itemListings,
      });
    }

    if (dbStash && stash.public) {
      // add items that need to be created
      const itemIds: string[] = [];
      const itemListings = await stash.items.reduce(
        async (arrPromise, item) => {
          const arr = await arrPromise;

          itemIds.push(item.id!);
          arr.push(await toItemListing(stash, item));

          return arr;
        },
        Promise.resolve([] as ItemListing[]),
      );

      if (itemListings.length > 0) {
        batchItems.push({
          type: "updateMany",
          data: itemListings,
        });
      }
      // drop all items beside specified
      batchItems.push({
        type: "dropItems",
        stashId: stash.id,
        notIn: itemIds,
      });
    }
  }

  if (Object.keys(batchItems).length > 0) {
    console.log(`Executing ${batchItems.length} batch items ...`);

    await mptPrisma.$transaction(prismaBatch(batchItems));
  }

  console.log(
    `Processing ${stashes.length} stashes done in ${elapsed(startTime)}ms!`,
  );
  nextChangeId = next_change_id;
  console.log("Saving next_change_id:", nextChangeId);
  await setNextChangeId(nextChangeId!);
}

async function run() {
  Bun.serve({
    fetch() {
      return new Response("pong", {
        status: 200,
      });
    },
    port: 8080,
  });

  repeatUntil(
    () => true,
    async () => {
      try {
        await updateDb();
      } catch (err) {
        console.error("Couldnt update DB !");
        console.error(err);
      }
    },
    0,
  );
}

await run();
