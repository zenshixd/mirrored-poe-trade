import { asc, eq, inArray } from "drizzle-orm";
import { notInArray } from "drizzle-orm/sql/expressions/conditions";
import { db } from "./db";
import { toItemListing, toPublicStash } from "./db/item-listing.utils.ts";
import { getNextChangeId, setNextChangeId } from "./db/next-change.utils.ts";
import { itemListing, publicStash, publicStashChange } from "./db/schema.ts";
import { getPublicStashesFromR2 } from "./poe-api.ts";
import { elapsed } from "./utils/elapsed.ts";
import { repeatUntil } from "./utils/repeatUntil.ts";

let nextChangeId = await getNextChangeId();

async function updateDb() {
	const startTime = process.hrtime.bigint();
	console.log(`Request public stashes for next_change_id=${nextChangeId}...`);
	const result = await db.query.publicStashChange.findFirst({
		where: eq(publicStashChange.stashChangeId, nextChangeId ?? "undefined"),
	});

	if (!result) {
		console.log(
			`Couldnt find stash change with id ${nextChangeId}! Seems there are holes in data?`,
		);
		await Bun.sleep(1000);
		return;
	}

	const { stashes, next_change_id } =
		await getPublicStashesFromR2(nextChangeId);

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
				for (const item of stash.items) {
					if (!item.id) {
						console.warn("Missing id for item!", JSON.stringify(item));
					}
					itemIds.push(item.id ?? "<unknown id>");
					const dbItem = await toItemListing(stash, item);
					await tx
						.insert(itemListing)
						.values(dbItem)
						.onConflictDoUpdate({
							target: itemListing.id,
							set: {
								priceValue: dbItem.priceValue,
								priceUnit: dbItem.priceUnit,
							},
						});
					updateItemCount++;
				}

				if (itemIds.length > 0) {
					await tx
						.delete(itemListing)
						.where(notInArray(itemListing.id, itemIds));
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
	nextChangeId = next_change_id;
	console.log("Saving next_change_id:", nextChangeId);
	await setNextChangeId(nextChangeId);
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
				await Bun.sleep(1000);
			}
		},
		0,
	);
}

await run();
