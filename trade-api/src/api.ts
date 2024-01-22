import { Elysia } from "elysia";
import { mptPrisma } from "./db/db.ts";
import { getLeagueId } from "./db/item-listing.utils.ts";

const port = process.env.PORT || 8000;
new Elysia()
  .get("/query", async ({ query, set }) => {
    const startTime = process.hrtime.bigint();
    const { name, league } = query;
    console.log(`Querying for ${name} in ${league}...`);

    if (!name || !league) {
      set.status = 400;
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

    const result = await mptPrisma.itemListing.findMany({
      where: {
        name,
        leagueId,
      },
    });

    const time = (process.hrtime.bigint() - startTime) / 1_000_000n;
    console.log(`Querying for ${name} in ${league} done in ${time}ms`);
    return result;
  })
  .listen(port, () => console.log(`Listening on ${port}...`));
