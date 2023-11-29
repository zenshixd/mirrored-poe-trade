import { StashItem } from "./db/stash-item.entity.ts";

let result;

while ((result = await StashItem.scan())) {
  result;
}
