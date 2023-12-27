import { parseNote, PublicStashChange, PublicStashItem } from "../poe-api.ts";
import { ItemListing } from "@prisma/client";

export function toItemListing(
  stash: PublicStashChange,
  item: PublicStashItem,
): ItemListing {
  const { priceValue, priceUnit } = parseNote(item.note);
  return {
    id: item.id!,
    stashId: stash.id,
    league: stash.league!,
    name: itemName(item),
    baseType: item.baseType!,
    typeLine: item.typeLine,
    itemLevel: item.itemLevel ?? 0,
    category: item.extended.category!,
    subcategories: item.extended.subcategories?.join(",") ?? "",
    priceValue: priceValue ?? 0,
    priceUnit: priceUnit ?? "",
  };
}

const accountName = (accountName: string | undefined) => {
  if (!accountName || accountName.length == 0) {
    return "$$$unknown";
  }

  return accountName;
};

const itemName = (item: PublicStashItem) => {
  switch (item.extended.category) {
    case "cards":
    case "gems":
    case "maps":
    case "currency":
      return item.baseType;
    case "flasks":
    case "jewels":
    case "armour":
    case "accessories":
    case "weapons":
    case "leaguestones":
      return item.typeLine != "" ? item.typeLine : item.baseType;
    default:
      if (item.name === "") {
        console.warn("Empty name for item!", JSON.stringify(item));
      }
      return item.name === "" ? "<empty>" : item.name;
  }
};
