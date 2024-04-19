import { asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "./db";
import { toItemListing, toPublicStash } from "./db/item-listing.utils.ts";
import { getLatestIndex, setLatestIndex } from "./db/next-change.utils.ts";
import { itemListing, publicStash } from "./db/schema.ts";
import { getPublicStashesFromR2 } from "./poe-api/poe-api.ts";
import { formatStashIndex } from "./r2/utils.ts";
import { elapsed } from "./utils/elapsed.ts";
import { repeatUntil } from "./utils/repeatUntil.ts";

let latestIndex = await getLatestIndex();

async function updateDb() {
	const startTime = process.hrtime.bigint();
	console.log(
		`Request public stashes for next_change_id=${formatStashIndex(
			latestIndex,
		)}...`,
	);

	const { stashes, next_change_id } = await getPublicStashesFromR2(latestIndex);

	if (stashes.length === 0) {
		console.log(
			"Found nuffin! Waiting for scrapper to get latest stash change.",
		);
		await Bun.sleep(1000);
		return;
	}
	console.log(
		`Found ${stashes.length} public stashes! Took ${elapsed(startTime)}ms`,
	);

	console.log("[stashes] Querying changed stashes...");
	const stashIds = stashes.map((stash) => stash.id);
	const dbStashes = await db.query.publicStash.findMany({
		where: inArray(publicStash.id, stashIds),
		orderBy: asc(publicStash.id),
	});
	console.log(
		`[stashes] Querying complete! Took ${elapsed(startTime)}ms and found ${
			dbStashes.length
		} stashes!`,
	);

	let createStashCount = 0;
	let createStashItemsCount = 0;
	let updateItemCount = 0;
	const dropItemsCount = 0;
	let deleteStashCount = 0;
	await db.transaction(async (tx) => {
		for (const stash of stashes) {
			if (
				!stash.league /*||
			isStandardLeague(stash.league) ||
			isPrivateLeague(stash.league)*/
			) {
				// skip standard and private leagues
				continue;
			}

			const dbStash = dbStashes.find((dbStash) => dbStash.id === stash.id);
			if (dbStash && !stash.public) {
				// Stash got unlisted - remove all items from db
				await tx.delete(publicStash).where(eq(publicStash.id, stash.id));
				deleteStashCount++;
			}

			if (!dbStash && stash.public) {
				// we havent indexed this stash tab
				// just put everything in
				await tx.insert(publicStash).values(await toPublicStash(stash));

				if (stash.items.length > 0) {
					await tx
						.insert(itemListing)
						.values(
							await Promise.all(
								stash.items.map((item) => toItemListing(stash, item)),
							),
						);
				}
				createStashCount++;
				createStashItemsCount += stash.items.length;
			}

			if (dbStash && stash.public) {
				// add items that need to be created
				const itemIds: string[] = [];
				const dbItems = await Promise.all(
					stash.items.map((item) => {
						itemIds.push(item.id ?? "<unknown id>");
						return toItemListing(stash, item);
					}),
				);

				if (dbItems.length > 0) {
					await tx
						.insert(itemListing)
						.values(dbItems)
						.onConflictDoUpdate({
							target: itemListing.id,
							set: {
								priceValue: sql.raw(`excluded.${itemListing.priceValue.name}`),
								priceUnit: sql.raw(`excluded.${itemListing.priceUnit.name}`),
							},
						});

					await tx
						.delete(itemListing)
						.where(notInArray(itemListing.id, itemIds));

					updateItemCount += dbItems.length;
				}
			}
		}

		console.log(
			`createStash: ${createStashCount} (items: ${createStashItemsCount}), updateItem: ${updateItemCount}, dropItems: ${dropItemsCount}, deleteStash: ${deleteStashCount}`,
		);
	});

	console.log(
		`Processing ${stashes.length} stashes done in ${elapsed(startTime)}ms!`,
	);
	latestIndex++;
	console.log("Saving latest index:", latestIndex);
	await setLatestIndex(latestIndex);
}

async function run() {
	repeatUntil(
		() => true,
		async () => {
			try {
				await updateDb();
			} catch (err) {
				if (err instanceof Error && err.message.includes("NoSuchKey")) {
					console.log(
						"No such key, waiting for scrapper to get latest stash change.",
					);
					await Bun.sleep(5000);
					return;
				}
				console.error("Couldnt update DB !");
				console.error(err);
				await Bun.sleep(1000);
			}
		},
		0,
	);
}

await run();
