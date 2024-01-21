// import { PublicStashChange } from "./generated/client-mpt";
// import { getPublicStashesFromS3 } from "./poe-api.ts";
// import { mptPrisma, scrapperPrisma } from "./db/db.ts";
// import { Prisma } from "./generated/client-scrapper";
// import InputJsonValue = Prisma.InputJsonValue;
// import { repeatUntil } from "./utils/repeatUntil.ts";
// import { elapsed } from "./utils/elapsed.ts";
//
// async function migrateBatch(items: PublicStashChange[]) {
//   const startTime = process.hrtime.bigint();
//   console.log(
//     `Migrating stash changes with index between ${items[0].index} - ${
//       items[items.length - 1].index
//     }...`,
//   );
//   const itemsData = await Promise.all(
//     items.map((item) => getPublicStashesFromS3(item.changeId)),
//   );
//   console.log(`Getting items from s3 done! Took ${elapsed(startTime)}ms`);
//   await scrapperPrisma.$transaction(
//     items.map((item, index) => {
//       const data = itemsData[index];
//
//       return scrapperPrisma.publicStashChange.create({
//         data: {
//           index: item.index,
//           stashChangeId: item.changeId,
//           data: data as unknown as InputJsonValue,
//           nextChangeId: item.nextChangeId,
//         },
//       });
//     }),
//   );
//   console.log(`Migration done in ${elapsed(startTime)}ms!`);
// }
//
// async function run() {
//   console.log("Starting migration ...");
//   const batchSize = 100;
//   let retrieveAnother = true;
//   const latestStashChange = await scrapperPrisma.publicStashChange.findFirst({
//     orderBy: {
//       index: "desc",
//     },
//   });
//
//   if (latestStashChange) {
//     console.log(
//       `There are already some items in target db! Latest index: ${latestStashChange.index}`,
//     );
//   }
//   let cursor = latestStashChange?.index;
//
//   await repeatUntil(
//     () => retrieveAnother,
//     async () => {
//       try {
//         const startTime = process.hrtime.bigint();
//         console.log(`Querying for items in old db, cursor ${cursor} ...`);
//         const result = await mptPrisma.publicStashChange.findMany({
//           take: batchSize,
//           skip: cursor != null ? 1 : 0,
//           cursor:
//             cursor != null
//               ? {
//                   index: cursor,
//                 }
//               : undefined,
//           orderBy: {
//             index: "asc",
//           },
//         });
//
//         if (result.length < batchSize) {
//           retrieveAnother = false;
//         }
//         console.log(
//           `Querying items for cursor ${cursor} done in ${elapsed(
//             startTime,
//           )}ms! Found ${result.length} items!`,
//         );
//
//         await migrateBatch(result);
//
//         cursor = result[result.length - 1].index;
//       } catch (e) {
//         console.error(e);
//       }
//     },
//     0,
//   );
// }
//
// await run();
