import { parseNote } from "../poe-api/poe-api";
import type {
	PoeApiPublicStashChange,
	PoeApiPublicStashItem,
} from "../poe-api/types";
import type { ItemListing, PublicStash } from "./schema";

export async function toPublicStash(
	stash: PoeApiPublicStashChange,
): Promise<PublicStash> {
	return {
		id: stash.id,
		name: stash.stash ?? "<empty>",
		accountName: stash.accountName ?? "<no accountname>",
		league: stash.league ?? "<no league>",
		itemsCount: stash.items?.length ?? 0,
	};
}

export async function toItemListing(
	stash: PoeApiPublicStashChange,
	item: PoeApiPublicStashItem,
) {
	const { priceValue, priceUnit } = parseNote(item.note);
	return {
		id: item.id ?? "<unknown id>",
		stashId: stash.id,
		league: stash.league ?? "<no league>",
		name: itemName(item),
		baseType: item.baseType ?? "<unknown baseType>",
		typeLine: item.typeLine,
		itemLevel: item.itemLevel ?? 0,
		category: itemCategory(item),
		subcategories: item.extended.subcategories?.join(",") ?? "",
		priceValue: priceValue ?? 0,
		priceUnit: priceUnit ?? "",
	} satisfies ItemListing;
}

const accountName = (accountName: string | undefined) => {
	if (!accountName || accountName.length === 0) {
		return "$$$unknown";
	}

	return accountName;
};

const itemName = (item: PoeApiPublicStashItem) => {
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
			return item.typeLine !== "" ? item.typeLine : item.baseType;
		case "sentinel":
		case "heistequipment":
		case "heistmission":
		case "logbook":
		case "monsters":
		case "azmeri":
			return item.baseType;
		default:
			if (item.name === "") {
				console.warn("Empty name for item!", JSON.stringify(item));
			}
			return item.name === "" ? "$$$empty" : item.name;
	}
};

const itemCategory = (item: PoeApiPublicStashItem) => {
	if (
		item.extended.category === "monsters" &&
		item.extended.subcategories?.includes("beast")
	) {
		return "beast";
	}

	return item.extended.category ?? "<unknown category>";
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
