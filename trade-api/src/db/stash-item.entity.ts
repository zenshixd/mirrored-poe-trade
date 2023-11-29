import { Entity, EntityItem } from "dynamodb-toolbox";
import { mirroredPoeTradeTable } from "./db.ts";
import { parseNote, PublicStashChange, PublicStashItem } from "../poe-api.ts";

export const StashItem = new Entity({
  table: mirroredPoeTradeTable,
  name: "StashItem",
  attributes: {
    pk: {
      type: "string",
      partitionKey: true,
      hidden: true,
    },
    sk: {
      type: "string",
      sortKey: true,
      hidden: true,
    },
    stash_id: {
      required: true,
      type: "string",
    },
    stash_name: {
      type: "string",
    },
    stash_accountName: {
      required: true,
      type: "string",
    },
    stash_league: {
      required: true,
      type: "string",
    },

    id: {
      required: true,
      type: "string",
    },
    name: {
      required: true,
      type: "string",
    },
    itemNameAndLeague: {
      type: "string",
      partitionKey: "itemNameAndLeagueIndex",
      default: (data: any) =>
        itemNameAndLeagueValue(data.name, data.stash_league),
    },
    typeLine: {
      type: "string",
    },
    baseType: {
      type: "string",
    },
    itemLevel: {
      type: "number",
    },
    category: {
      type: "string",
    },
    subcategories: {
      type: "set",
      setType: "string",
    },
    priceValue: {
      type: "number",
    },
    priceUnit: {
      type: "string",
    },
  },
});

export const itemNameAndLeagueValue = (name: string, league: string) =>
  `${name}#${league}`;

export function toStashItem(
  stash: PublicStashChange,
  item: PublicStashItem,
): EntityItem<typeof StashItem> {
  const { priceValue, priceUnit } = parseNote(item.note);
  return {
    stash_id: stash.id,
    stash_accountName: stash.accountName!,
    stash_league: stash.league!,
    stash_name: stash.stash,

    id: item.id!,
    name: item.name === "" ? "<empty>" : item.name,
    baseType: item.baseType,
    typeLine: item.typeLine,
    itemLevel: item.itemLevel,
    category: item.extended.category,
    subcategories: item.extended.subcategories,
    priceValue,
    priceUnit,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    entity: StashItem.name,
  };
}
