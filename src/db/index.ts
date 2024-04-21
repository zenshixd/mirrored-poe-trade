import { Database } from "bun:sqlite";
import fs from "node:fs/promises";
import { eq, inArray } from "drizzle-orm";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { sum } from "lodash";
import * as schema from "./schema";
import { itemListing, publicStash } from "./schema";

const dbName = (league) => `db/mpt-${league}.db`;
const leagueDbs: Record<string, BunSQLiteDatabase<typeof schema>> = {};

export function doesDbExist(league: string) {
	return fs.exists(dbName(league));
}

export function getDb(league: string) {
	if (!leagueDbs[league]) {
		console.log(`Creating db for league ${league}`);
		leagueDbs[league] = drizzle(new Database(dbName(league)), {
			schema,
		});
		console.log("Running migrations for league", league);
		migrate(leagueDbs[league], {
			migrationsFolder: "./migrations",
		});
		console.log("Migrations done for league", league);
	}
	return leagueDbs[league];
}

export async function queryStashes(stashIds: string[]) {
	const foundStashes = await Promise.all(
		Object.values(leagueDbs).map(async (db) =>
			db.query.publicStash.findMany({
				where: inArray(publicStash.id, stashIds),
			}),
		),
	);

	return foundStashes.flatMap((stashes) => stashes);
}

export async function deleteStash(stashId: string) {
	const deletedStashCounts = await Promise.all(
		Object.values(leagueDbs).map(async (db) => {
			const deletedStashes = await db
				.delete(publicStash)
				.where(eq(publicStash.id, stashId))
				.returning({ id: publicStash.id });

			return deletedStashes.length;
		}),
	);

	return sum(deletedStashCounts);
}

export async function deleteStashItems(stashId: string) {
	const itemListingCounts = await Promise.all(
		Object.values(leagueDbs).map(async (db) => {
			const deletedItems = await db
				.delete(itemListing)
				.where(eq(itemListing.stashId, stashId))
				.returning({ id: itemListing.id });

			return deletedItems.length;
		}),
	);

	return sum(itemListingCounts);
}
