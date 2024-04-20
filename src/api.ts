import { and, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Elysia } from "elysia";
import { db } from "./db";
import { getLeagueId } from "./db/item-listing.utils.ts";
import { itemListing } from "./db/schema.ts";

const port = process.env.PORT || 4000;

migrate(db, {
	migrationsFolder: "./migrations",
});

new Elysia()
	.get("/query", async (context) => {
		const startTime = process.hrtime.bigint();
		const { name, league } = context.query;
		console.log(`Querying for ${name} in ${league}...`);

		if (!name || !league) {
			context.set.status = 400;
			return {
				error: "missing_parameters",
			};
		}

		const leagueId = await getLeagueId(league);

		if (!leagueId) {
			return {
				error: "unknown_league",
			};
		}

		const result = await db.query.itemListing.findMany({
			where: and(eq(itemListing.name, name), eq(itemListing.league, leagueId)),
			limit: 20,
		});

		const time = (process.hrtime.bigint() - startTime) / 1_000_000n;
		console.log(`Querying for ${name} in ${league} done in ${time}ms`);
		return result;
	})
	.listen(port, () => console.log(`Listening on ${port}...`));
