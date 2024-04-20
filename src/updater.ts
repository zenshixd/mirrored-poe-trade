import { asc, eq, inArray, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./db";
import { toItemListing, toPublicStash } from "./db/item-listing.utils.ts";
import { getLatestIndex, setLatestIndex } from "./db/next-change.utils.ts";
import { itemListing, publicStash } from "./db/schema.ts";
import { getPublicStashesFromR2 } from "./poe-api/poe-api.ts";
import { formatStashIndex } from "./r2/utils.ts";
import { elapsed } from "./utils/elapsed.ts";

let latestIndex = await getLatestIndex();

const deleteItemListingsQuery = db
	.delete(itemListing)
	.where(eq(itemListing.stashId, sql.placeholder("stashId")))
	.prepare();
const deletePublicStashesQuery = db
	.delete(publicStash)
	.where(eq(publicStash.id, sql.placeholder("stashId")))
	.prepare();
const insertPublicStashQuery = db
	.insert(publicStash)
	.values({
		id: sql.placeholder("id"),
		name: sql.placeholder("name"),
		league: sql.placeholder("league"),
		accountName: sql.placeholder("accountName"),
		itemsCount: sql.placeholder("itemsCount"),
	})
	.prepare();

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

	const leagueSkipped = 0;
	let createStashCount = 0;
	let createStashItemsCount = 0;
	let updateItemCount = 0;
	let updateStashCount = 0;
	let deleteStashCount = 0;
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
		if (!stash.public) {
			// Stash got unlisted - remove all items from db
			deleteItemListingsQuery.run({ stashId: stash.id });
			deletePublicStashesQuery.run({ stashId: stash.id });
			deleteStashCount++;
		}

		if (!dbStash && stash.public) {
			// we havent indexed this stash tab
			// just put everything in
			insertPublicStashQuery.run(await toPublicStash(stash));
			if (stash.items.length > 0) {
				db.insert(itemListing).values(
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

			deleteItemListingsQuery.run({ stashId: stash.id });
			if (dbItems.length > 0) {
				db.insert(itemListing).values(dbItems);

				updateItemCount += dbItems.length;
			}

			updateStashCount++;
		}
	}

	console.log(
		`leagueSkipped: ${leagueSkipped}, createStash: ${createStashCount} (items: ${createStashItemsCount}), updateStash: ${updateStashCount}, updateItem: ${updateItemCount}, deleteStash: ${deleteStashCount}`,
	);

	console.log(
		`Processing ${stashes.length} stashes done in ${elapsed(startTime)}ms!`,
	);
	latestIndex++;
	console.log("Saving latest index:", latestIndex);
	await setLatestIndex(latestIndex);
}

async function run() {
	migrate(db, {
		migrationsFolder: "./migrations",
	});

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
