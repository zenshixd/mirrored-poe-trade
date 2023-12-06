import "./instrumentation";
import { authorize, getPublicStashes } from "./poe-api";
import { StashItem, toStashItem } from "./db/stash-item.entity.ts";
import { mirroredPoeTradeTable } from "./db/db.ts";
import { WriteRequest } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommandOutput } from "@aws-sdk/lib-dynamodb";
import { chunkify } from "./utils/chunkify";
import { parallelize } from "./utils/parallelize.ts";
import { getNextChangeId, setNextChangeId } from "./db/next-change.entity.ts";

let nextChangeId = await getNextChangeId();

async function updateDb(token: string) {
  console.log(`Request public stashes for next_change_id=${nextChangeId}...`);
  const { stashes, next_change_id } = await getPublicStashes(
    token,
    nextChangeId,
  );
  console.log(`Found ${stashes.length} public stashes!`);
  const batchItems: Record<string, WriteRequest> = {};
  for (const stashesChunk of chunkify(stashes, 25)) {
    await parallelize(stashesChunk, async (stash) => {
      console.log(`[stash ${stash.id}] Querying changed stash...`);
      const startTime = process.hrtime.bigint();
      const { Items } = await StashItem.query(stash.id, {
        index: "stashIdIndex",
      });
      const queryTime = (process.hrtime.bigint() - startTime) / 1_000_000n;
      console.log(`[stash ${stash.id}] Querying complete! Took ${queryTime}ms`);

      if (!Items) {
        console.log(
          `[Stash ${stash.id}] Items is undefined for some reason. Skip.`,
        );
        return;
      }

      if (Items.length > 0 && !stash.public) {
        // Stash got unlisted - remove all items from db
        Items.forEach((item) => {
          batchItems[item.id] = StashItem.deleteBatch({
            pk: item.id,
            sk: item.id,
          });
        });
      }

      if (Items.length === 0 && stash.public) {
        // we havent indexed this stash tab
        // just put everything in
        stash.items.forEach((item) => {
          batchItems[item.id!] = StashItem.putBatch({
            pk: item.id!,
            sk: item.id!,
            ...toStashItem(stash, item),
          });
        });
      }

      if (Items.length > 0 && stash.public) {
        // we need to create a diff between stash and db

        // add items that need to be created
        stash.items.forEach((item) => {
          const alreadyExists = Items.some((dbItem) => item.id === dbItem.id);

          if (!alreadyExists) {
            batchItems[item.id!] = StashItem.putBatch({
              pk: item.id!,
              sk: item.id!,
              ...toStashItem(stash, item),
            });
          }
        });

        // delete items which are not present in stash info
        Items.forEach((item) => {
          const stillExists = stash.items.some(
            (stashItem) => stashItem.id === item.id,
          );

          if (!stillExists) {
            batchItems[item.id!] = StashItem.deleteBatch({
              pk: item.id!,
              sk: item.id!,
            });
          }
        });
      }
    });
  }

  if (Object.keys(batchItems).length > 0) {
    const batchExecute = async (
      n: number,
      promise: Promise<BatchWriteCommandOutput>,
    ) => {
      console.log(`[batch #${n}] Starting batch ...`);
      try {
        const response = await promise;
        console.log(`[batch #${n}] Batch completed.`);
      } catch (e) {
        debugger;
        console.error(`[batch #${n}] Batch failed!`);
        throw e;
      }
    };

    const promises = [];
    let itemsCreated = 0;
    let itemsDeleted = 0;
    console.log(`Executing ${batchItems.length} batches...`);
    for (let batch of chunkify(Object.values(batchItems), 25)) {
      batch.forEach((item) => {
        if (item.PutRequest) {
          itemsCreated++;
        } else if (item.DeleteRequest) {
          itemsDeleted++;
        }
      });
      promises.push(
        batchExecute(
          promises.length + 1,
          mirroredPoeTradeTable.batchWrite(batch),
        ),
      );
    }

    await Promise.all(promises);
    console.log(
      `Added/updated ${itemsCreated} items and deleted ${itemsDeleted}!`,
    );
  }

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
