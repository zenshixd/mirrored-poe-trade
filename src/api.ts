import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { doesDbExist, getDb } from "./db";
import { itemListing } from "./db/schema";

const port = process.env.PORT || 4000;

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

		if (!(await doesDbExist(league))) {
			context.set.status = 404;
			return {
				error: "league_not_found",
			};
		}

		const db = getDb(league);

		const result = await db.query.itemListing.findMany({
			where: eq(itemListing.name, name),
			limit: 20,
		});

		const time = (process.hrtime.bigint() - startTime) / 1_000_000n;
		console.log(`Querying for ${name} in ${league} done in ${time}ms`);
		return result;
	})
	.listen(port, () => console.log(`Listening on ${port}...`));
