import { authorize, getPublicStashes } from "./poe-api.ts";
import { elapsed } from "./utils/elapsed.ts";
import { repeatUntil } from "./utils/repeatUntil.ts";
import { scrapperPrisma } from "./db/db.ts";
import { Prisma } from "./generated/client-scrapper";
import InputJsonValue = Prisma.InputJsonValue;

let queuePromise = Promise.resolve();

async function validateIntegrity(): Promise<{
  missingStashChangesIds: string[];
}> {
  console.log("Verifying data integrity...");
  const missingStashChangesIds = [];

  let cursor = 0;
  let previousStashChange = await scrapperPrisma.publicStashChange.findFirst({
    select: {
      index: true,
      stashChangeId: true,
      nextChangeId: true,
    },
    orderBy: {
      index: "asc",
    },
  });

  if (!previousStashChange) {
    console.log(
      "There is nothing in the PublicStashChange table. Skipping validation.",
    );
    return { missingStashChangesIds: [] };
  }

  while (true) {
    const list = await scrapperPrisma.publicStashChange.findMany({
      select: {
        index: true,
        stashChangeId: true,
        nextChangeId: true,
      },
      take: 100,
      skip: 1,
      cursor: {
        index: cursor,
      },
      orderBy: {
        index: "asc",
      },
    });

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item.index !== previousStashChange.index + 1) {
        missingStashChangesIds.push(previousStashChange.nextChangeId);
      }

      previousStashChange = item;
      cursor = item.index;
    }

    // that was last batch
    if (list.length < 100) {
      break;
    }
  }

  console.log(
    `Data integrity verification complete! Found ${missingStashChangesIds.length} missing stash changes. Loading them before searching for newest ones.`,
  );
  return { missingStashChangesIds };
}

async function loadPublicStashes(
  token: string,
  publicStashChangeIndex: number,
  nextChangeId: string,
) {
  let startTime = process.hrtime.bigint();
  try {
    console.log(`[${nextChangeId}] Requesting public stashes...`);
    const result = await getPublicStashes(token, nextChangeId);
    console.log(
      `[${nextChangeId}] Retrieved stashes in ${elapsed(startTime)}ms`,
    );
    if (result.stashes.length === 0) {
      console.log("No stashes found! Skipping.");
      return nextChangeId;
    }

    // const promise = s3.putObject({
    //   Bucket: BUCKET_NAME,
    //   Key: publicStashFilename(nextChangeId),
    //   Body: JSON.stringify(result),
    // });
    //
    // queuePromise = queuePromise
    //   .then(() => promise)
    //   .then(async () => {
    //     console.log(
    //       `[${nextChangeId}] Retrieving public stashes and putting them in S3 took ${elapsed(
    //         startTime,
    //       )}ms`,
    //     );
    //     await scrapperPrisma.publicStashChange.create({
    //       data: {
    //         index: publicStashChangeIndex,
    //         stashChangeId: nextChangeId ?? "undefined",
    //         data: result as InputJsonValue,
    //         nextChangeId: result.next_change_id,
    //       },
    //     });
    //   });

    startTime = process.hrtime.bigint();
    await scrapperPrisma.publicStashChange.create({
      data: {
        index: publicStashChangeIndex,
        stashChangeId: nextChangeId ?? "undefined",
        data: result as unknown as InputJsonValue,
        nextChangeId: result.next_change_id,
      },
    });
    console.log(
      `[${nextChangeId}] Putting data to DB took ${elapsed(startTime)}ms`,
    );

    return result.next_change_id;
  } catch (err) {
    console.error(`Couldnt retrieve public stashes for id=${nextChangeId} !`);
    console.error(err);
    return nextChangeId;
  }
}

async function scrap() {
  Bun.serve({
    fetch() {
      return new Response("pong", {
        status: 200,
      });
    },
    port: 8081,
  });
  await validateIntegrity();

  let latestItem = await scrapperPrisma.publicStashChange.findFirst({
    orderBy: {
      index: "desc",
    },
  });
  let nextChangeIndex = latestItem ? latestItem.index + 1 : 0;
  let nextChangeId = latestItem?.nextChangeId ?? "undefined";

  const token = await authorize();

  repeatUntil(
    () => true,
    async () => {
      const newNextChangeId = await loadPublicStashes(
        token,
        nextChangeIndex,
        nextChangeId,
      );

      if (nextChangeId !== newNextChangeId) {
        nextChangeId = newNextChangeId;
        nextChangeIndex++;
      }
    },
    1000,
  );
}

await scrap();
