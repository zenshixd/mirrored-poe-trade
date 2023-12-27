import { Elysia } from "elysia";
import { prisma } from "./db/db.ts";

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

    const result = await prisma.itemListing.findMany({
      where: {
        name,
        league,
      },
    });

    const time = (process.hrtime.bigint() - startTime) / 1_000_000n;
    console.log(`Querying for ${name} in ${league} done in ${time}ms`);
    return result;
  })
  .listen(port, () => console.log(`Listening on ${port}...`));
