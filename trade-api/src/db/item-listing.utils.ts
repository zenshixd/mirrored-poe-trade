import { parseNote, PublicStashChange, PublicStashItem } from "../poe-api.ts";
import { ItemListing } from "../generated/client-mpt";
import { mptPrisma } from "./db.ts";

const leaguesCache: Record<string, number> = {};
export async function getLeagueId(leagueName: string) {
  if (!(leagueName in leaguesCache)) {
    let league = await mptPrisma.league.findUnique({
      where: {
        name: leagueName,
      },
    });

    if (!league) {
      league = await mptPrisma.league.create({
        data: {
          name: leagueName,
          isEventLeague: isEventLeague(leagueName),
          isPrivateLeague: isPrivateLeague(leagueName),
          isStandardLeague: isStandardLeague(leagueName),
        },
      });
    }

    leaguesCache[leagueName] = league.id;
  }

  return leaguesCache[leagueName];
}

export async function toItemListing(
  stash: PublicStashChange,
  item: PublicStashItem,
) {
  const { priceValue, priceUnit } = parseNote(item.note);
  return {
    id: item.id!,
    stashId: stash.id,
    leagueId: await getLeagueId(stash.league!),
    name: itemName(item),
    baseType: item.baseType!,
    typeLine: item.typeLine,
    itemLevel: item.itemLevel ?? 0,
    category: itemCategory(item),
    subcategories: item.extended.subcategories?.join(",") ?? "",
    priceValue: priceValue ?? 0,
    priceUnit: priceUnit ?? "",
  } as ItemListing;
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
    case "memoryline":
      return item.typeLine != "" ? item.typeLine : item.baseType;
    case "sentinel":
    case "heistequipment":
    case "heistmission":
    case "logbook":
    case "monsters":
      return item.baseType;
    default:
      if (item.name === "") {
        console.warn("Empty name for item!", JSON.stringify(item));
      }
      return item.name === "" ? "$$$empty" : item.name;
  }
};

const itemCategory = (item: PublicStashItem) => {
  if (
    item.extended.category === "monsters" &&
    item.extended.subcategories?.includes("beast")
  ) {
    return "beast";
  }

  return item.extended.category!;
};

export const isPrivateLeague = (leagueName: string) =>
  /\(PL\d+\)/.test(leagueName);
export const isEventLeague = (leagueName: string) =>
  /\((DE|NRE)\d+\)/.test(leagueName) ||
  leagueName.includes("Class Gauntlet") ||
  leagueName.includes("Exilecon Qualifier Race");
export const isStandardLeague = (leagueName: string) => {
  switch (leagueName) {
    case "Standard":
    case "Solo Self-Found":
    case "Hardcore":
    case "Hardcore SSF":
    case "Ruthless":
    case "Ruthless with Gold":
    case "Hardcore Ruthless":
    case "SSF Ruthless":
    case "Hardcore SSF Ruthless":
      return true;
    default:
      return false;
  }
};
