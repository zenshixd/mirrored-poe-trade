import { Elysia } from "elysia";
import { itemNameAndLeagueValue, StashItem } from "./db/stash-item.entity.ts";

new Elysia()
  .get("/query", async ({ query, set }) => {
    const { name, league } = query;

    if (!name || !league) {
      set.status = 400;
      return {
        error: "missing_parameters",
      };
    }

    const result = await StashItem.query(itemNameAndLeagueValue(name, league), {
      index: "itemNameAndLeagueIndex",
    });
    return;
  })
  .listen(8000);
