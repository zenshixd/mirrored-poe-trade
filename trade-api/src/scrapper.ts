import { S3 } from "@aws-sdk/client-s3";
import {
  authorize,
  BUCKET_NAME,
  getPublicStashes,
  publicStashFilename,
} from "./poe-api.ts";
import { elapsed } from "./utils/elapsed.ts";
import { repeatUntil } from "./utils/repeatUntil.ts";
import { prisma } from "./db/db.ts";

const s3 = new S3();

let queuePromise = Promise.resolve();

async function validateIntegrity(): Promise<{
  missingStashChangesIds: string[];
}> {
  console.log("Verifying data integrity...");
  const missingStashChangesIds = [];

  let cursor = 0;
  let previousStashChange = await prisma.publicStashChange.findFirst({
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
    const list = await prisma.publicStashChange.findMany({
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
  const startTime = process.hrtime.bigint();
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

    const promise = s3.putObject({
      Bucket: BUCKET_NAME,
      Key: publicStashFilename(nextChangeId),
      Body: JSON.stringify(result),
    });

    queuePromise = queuePromise
      .then(() => promise)
      .then(async () => {
        console.log(
          `[${nextChangeId}] Retrieving public stashes and putting them in S3 took ${elapsed(
            startTime,
          )}ms`,
        );
        await prisma.publicStashChange.create({
          data: {
            index: publicStashChangeIndex,
            changeId: nextChangeId ?? "undefined",
            nextChangeId: result.next_change_id,
          },
        });
      });
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

  let latestItem = await prisma.publicStashChange.findFirst({
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
