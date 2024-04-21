import { eq } from "drizzle-orm";
import { deleteStash, deleteStashItems, getDb, queryStashes } from "./db";
import { toItemListing, toPublicStash } from "./db/item-listing.utils";
import { getLatestIndex, setLatestIndex } from "./db/next-change.utils";
import { itemListing, publicStash } from "./db/schema";
import { getPublicStashesFromR2 } from "./poe-api/poe-api";
import { formatStashIndex } from "./r2/utils";
import { elapsed } from "./utils/elapsed";

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
	const dbStashes = await queryStashes(stashIds);
	console.log(
		`[stashes] Querying complete! Took ${elapsed(startTime)}ms and found ${
			dbStashes.length
		} stashes!`,
	);

	let leagueSkipped = 0;
	let createStashCount = 0;
	let createStashItemsCount = 0;
	let updateItemCount = 0;
	let updateStashCount = 0;
	let deleteStashCount = 0;
	let deleteStashItemsCount = 0;
	for (const stash of stashes) {
		// if (
		// 	isStandardLeague(stash.league) ||
		// 	isPrivateLeague(stash.league)
		// ) {
		// 	// skip standard and private leagues
		// 	leagueSkipped++;
		// 	continue;
		// }

		const dbStash = dbStashes.find((dbStash) => dbStash.id === stash.id);
		if (!stash.public && dbStash) {
			// Stash got unlisted - remove all items from db
			// const deletedItems = await db
			// 	.delete(itemListing)
			// 	.where(eq(itemListing.stashId, stash.id))
			// 	.returning({ id: itemListing.id });
			// const deletedStashes = await db
			// 	.delete(publicStash)
			// 	.where(eq(publicStash.id, stash.id))
			// 	.returning({ id: publicStash.id });

			deleteStashCount += await deleteStash(stash.id);
			deleteStashItemsCount += await deleteStashItems(stash.id);
		}

		if (!stash.league) {
			// league is not set, so we can't do anything with it
			leagueSkipped++;
			continue;
		}

		const db = getDb(stash.league);
		if (!dbStash && stash.public) {
			// we havent indexed this stash tab
			// just put everything in
			await db.insert(publicStash).values(await toPublicStash(stash));
			if (stash.items.length > 0) {
				await db
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
			const dbItems = await Promise.all(
				stash.items.map((item) => toItemListing(stash, item)),
			);

			await db
				.delete(itemListing)
				.where(eq(itemListing.stashId, stash.id))
				.returning({ id: itemListing.id });
			if (dbItems.length > 0) {
				await db.insert(itemListing).values(dbItems);

				updateItemCount += dbItems.length;
			}

			updateStashCount++;
		}
	}

	console.log(
		`leagueSkipped: ${leagueSkipped}, createStash: ${createStashCount} (items: ${createStashItemsCount}), updateStash: ${updateStashCount}, updateItem: ${updateItemCount}, deleteStash: ${deleteStashCount} (items: ${deleteStashItemsCount})`,
	);

	console.log(
		`Processing ${stashes.length} stashes done in ${elapsed(startTime)}ms!`,
	);
	latestIndex++;
	console.log("Saving latest index:", latestIndex);
	await setLatestIndex(latestIndex);
}

async function run() {
	while (true) {
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
	}
}

await run();
