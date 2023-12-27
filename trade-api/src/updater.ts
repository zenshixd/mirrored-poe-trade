import { ItemListing } from "@prisma/client";
import { authorize, getPublicStashes, PublicStashChange } from "./poe-api";
import { chunkify } from "./utils/chunkify";
import { toItemListing } from "./db/item-listing.utils.ts";
import { getNextChangeId, setNextChangeId } from "./db/next-change.utils.ts";
import { prisma } from "./db/db.ts";

let nextChangeId = await getNextChangeId();

type BatchItem =
  | BatchItemCreateStash
  | BatchItemDeleteStash
  | BatchItemUpdate
  | BatchItemDropItems;

export interface BatchItemUpdate {
  type: "update";
  data: ItemListing;
}

interface BatchItemCreateStash {
  type: "createStash";
  stash: PublicStashChange;
}

interface BatchItemDeleteStash {
  type: "delete";
  stashId: string;
}

interface BatchItemDropItems {
  type: "dropItems";
  stashId: string;
  itemIds: string[];
}

async function prismaBatch(batch: BatchItem[]): Promise<any> {
  return await Promise.all(
    batch.map((item) => {
      if (item.type === "createStash") {
        console.log(`pushing stash ${item.stash.id}`);
        return prisma.publicStash.create({
          data: {
            id: item.stash.id!,
            name: item.stash.stash ?? "<no stash name>",
            accountName: item.stash.accountName ?? "<unknown account>",
            league: item.stash.league!,
            items: {
              createMany: {
                data: item.stash.items.map((stashItem) => {
                  const { stashId, ...itemListing } = toItemListing(
                    item.stash,
                    stashItem,
                  );

                  return itemListing;
                }),
              },
            },
          },
        });
      } else if (item.type === "update") {
        return prisma.itemListing.upsert({
          create: item.data,
          update: item.data,
          where: {
            id: item.data.id,
          },
        });
      } else if (item.type === "delete") {
        return prisma.publicStash.delete({
          where: {
            id: item.stashId,
          },
        });
      } else if (item.type === "dropItems") {
        return prisma.itemListing.deleteMany({
          where: {
            stashId: item.stashId,
            id: {
              notIn: item.itemIds,
            },
          },
        });
      }
    }),
  );
}

async function updateDb(token: string) {
  console.log(`Request public stashes for next_change_id=${nextChangeId}...`);
  const { stashes, next_change_id } = await getPublicStashes(
    token,
    nextChangeId,
  );
  const batchItems: BatchItem[] = [];
  console.log(`Found ${stashes.length} public stashes!`);

  console.log(`[stashes] Querying changed stashes...`);
  const startTime = process.hrtime.bigint();
  const stashIds = stashes.map((stash) => stash.id);
  const dbStashes = await prisma.publicStash.findMany({
    where: {
      id: {
        in: stashIds,
      },
    },
    orderBy: {
      id: "asc",
    },
  });
  const queryTime = (process.hrtime.bigint() - startTime) / 1_000_000n;
  console.log(
    `[stashes] Querying complete! Took ${queryTime}ms and found ${dbStashes.length} stashes!`,
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
      batchItems.push({
        type: "createStash",
        stash: stash,
      });
    }

    if (dbStash && stash.public) {
      // add items that need to be created
      const itemIds: string[] = [];
      stash.items.forEach((item) => {
        batchItems.push({
          type: "update",
          data: toItemListing(stash, item),
        });
        itemIds.push(item.id!);
      });

      // drop all items beside specified
      batchItems.push({
        type: "dropItems",
        stashId: stash.id,
        itemIds,
      });
    }
  }

  if (Object.keys(batchItems).length > 0) {
    let itemsCreated = 0;
    let itemsDeleted = 0;
    console.log(`Executing ${batchItems.length} batches...`);

    let batchN = 1;
    for (let batch of chunkify(Object.values(batchItems), 25)) {
      batch.forEach((item) => {
        if (item.type == "update") {
          itemsCreated++;
        } else if (item.type === "delete") {
          itemsDeleted++;
        }
      });
      console.log(`[batch #${batchN}] Starting batch ...`);
      try {
        const response = await prismaBatch(batch);
        console.log(`[batch #${batchN}] Batch completed.`);
        batchN++;
      } catch (e) {
        debugger;
        console.error(`[batch #${batchN}] Batch failed!`);
        throw e;
      }
    }

    console.log(
      `Added/updated ${itemsCreated} items and deleted ${itemsDeleted}!`,
    );
  }

  const completeTime = (process.hrtime.bigint() - startTime) / 1_000_000n;
  console.log(
    `Processing ${stashes.length} stashes done in ${completeTime}ms!`,
  );
  nextChangeId = next_change_id;
  console.log("Saving next_change_id:", nextChangeId);
  await setNextChangeId(nextChangeId!);
}

async function run() {
  const token = await authorize();

  Bun.serve({
    fetch() {
      return new Response("pong", {
        status: 200,
      });
    },
    port: 8080,
  });

  const scheduleStashLoading = async () => {
    await updateDb(token);
    setTimeout(() => scheduleStashLoading(), 1_000);
  };

  await scheduleStashLoading();
}

await run();
