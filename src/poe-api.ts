import { NoSuchKey, S3 } from "@aws-sdk/client-s3";

export async function authorize() {
	const { poe_client_id, poe_client_secret } = process.env;

	if (!poe_client_id || !poe_client_secret) {
		throw new Error("client_id or client_secret is not specified!");
	}

	const params = new URLSearchParams();
	params.set("scope", "service:psapi");
	params.set("grant_type", "client_credentials");
	params.set("client_id", poe_client_id);
	params.set("client_secret", poe_client_secret);
	const response = await fetch("https://www.pathofexile.com/oauth/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent":
				"OAuth mirroredpoetrade/1.0.0 (contact: ownelek@protonmail.com) StrictMode",
		},
		body: params.toString(),
	});

	if (!response.ok) {
		throw new Error(`Authorization request failed! ${await response.text()}`);
	}

	const { access_token } = (await response.json()) as { access_token: string };

	return access_token;
}

export interface ItemProperty {
	name: string;
	values: [string, number];
	displayMode: number;
	progress?: number;
	type?: number;
	suffix?: string;
}

export enum FrameType {
	Normal,
	Magic,
	Rare,
	Unique,
	Gem,
	Currency,
	DivinationCard,
	Quest,
	Prophecy,
	Foil,
	SupporterFoil,
}

export interface CrucibleNodeInfo {
	skill?: number;
	tier?: string;
	icon?: string;
	allocated?: true;
	isNotable?: true;
	isReward?: true;
	stats?: string[];
	reminderText?: string[];
	orbit?: number;
	orbitIndex?: number;
	out?: string[];
	in?: string[];
}

export interface CrucibleInfo {
	layout: string;
	nodes: Record<string, CrucibleNodeInfo>;
}

export interface ItemSocket {
	group: number;
	attr?: "S" | "D" | "I" | "G" | "A" | "DV";
	sColour?: "R" | "G" | "B" | "W" | "A" | "DV";
}

export interface PublicStashItem {
	verified: boolean;
	w: number;
	h: number;
	icon: string;
	support?: true;
	stackSize?: number;
	maxStackSize?: number;
	stackSizeText?: string;
	league?: string;
	id?: string;
	influences?: unknown;
	elder?: true;
	shaper?: true;
	searing?: true;
	tangled?: true;
	abyssJewel?: true;
	delve?: true;
	fractured?: true;
	synthesised?: true;
	sockets?: ItemSocket[];
	socketedItems?: PublicStashItem[];
	name: string;
	typeLine: string;
	baseType: string;
	identified: boolean;
	itemLevel?: number;
	note?: string;
	forum_note?: string;
	lockedToCharacter?: true;
	lockedToAccount?: true;
	duplicated?: true;
	split?: true;
	corrupted?: true;
	unmodifiable?: true;
	cisRaceReward?: true;
	seaRaceReward?: true;
	thRaceReward?: true;
	properties?: ItemProperty[];
	notableProperties?: ItemProperty[];
	requirements?: ItemProperty[];
	additionalProperties?: ItemProperty[];
	nextLevelRequirements?: ItemProperty[];
	talismanTier?: number;
	rewards?: {
		label: string;
		rewards: Record<string, number>;
	}[];
	secDescrText?: string;
	utilityMods?: string[];
	logbookMods?: {
		name: string;
		faction: {
			id: "Faction1" | "Faction2" | "Faction3" | "Faction4";
			name: string;
		};
		mods: string[];
	};
	enchantMods?: string[];
	scourgeMods?: string[];
	implicitMods?: string[];
	ultimatumMods?: {
		type: string;
		tier: number;
	}[];
	explicitMods?: string[];
	craftedMods?: string[];
	fracturedMods?: string[];
	crucibleMods?: string[];
	cosmeticMods?: string[];
	veiledMods?: string[];
	veiled?: true;
	descrText?: string;
	flavourText?: string;
	flavourTextParsed?: string[];
	flavourTextNote?: string;
	prophecyText?: string;
	isRelic?: true;
	foilVariation?: number;
	replica?: true;
	foreseeing?: true;
	incubatedItem?: {
		name: string;
		level: number;
		progress: number;
		total: number;
	};
	scourged?: {
		tier: number;
		level?: number;
		progress?: number;
		total?: number;
	};
	crucible?: CrucibleInfo;
	ruthless?: true;
	frameType: FrameType;
	artFilename?: string;
	hybrid?: {
		isVaalGem?: boolean;
		baseTypeName: string;
		properties: ItemProperty[];
		explicitMods?: string[];
		secDesctText?: string;
	};
	extended: {
		category?: string;
		subcategories?: string[];
		prefixes?: number;
		suffixes?: number;
	};
	x?: number;
	y?: number;
	inventoryId?: string;
	socket?: number;
	colour?: "S" | "D" | "I" | "G";
}

export interface PublicStashChange {
	id: string;
	public: boolean;
	accountName?: string;
	stash?: string;
	stashType: string;
	league?: string;
	items: PublicStashItem[];
}

export interface PublicStashResponse {
	next_change_id: string;
	stashes: PublicStashChange[];
}

export async function getPublicStashes(
	token: string,
	nextChangeId?: string,
): Promise<PublicStashResponse> {
	const response = await fetch(
		`https://api.pathofexile.com/public-stash-tabs${
			nextChangeId ? `?id=${nextChangeId}` : ""
		}`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				"User-Agent":
					"OAuth mirroredpoetrade/1.0.0 (contact: ownelek@protonmail.com) StrictMode",
			},
		},
	);

	if (!response.ok) {
		throw new Error(`Authorization request failed! ${await response.text()}`);
	}

	return (await response.json()) as PublicStashResponse;
}

const r2 = new S3({
	endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	region: "auto",
});
export const BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "mpt-stashes-dev";
console.log("Using bucket", BUCKET_NAME);
export const publicStashFilename = (nextChangeId: string | undefined) =>
	`${nextChangeId}.json.gz`;

export async function getPublicStashesFromR2(
	nextChangeId?: string,
): Promise<PublicStashResponse> {
	try {
		const obj = await r2.getObject({
			Bucket: BUCKET_NAME,
			Key: publicStashFilename(nextChangeId),
		});
		if (!obj.Body) {
			return { stashes: [], next_change_id: "" };
		}

		const body = new TextDecoder("utf8").decode(
			Bun.gunzipSync(await obj.Body.transformToByteArray()),
		);

		return JSON.parse(body) as PublicStashResponse;
	} catch (e) {
		if (e instanceof NoSuchKey) {
			return { stashes: [], next_change_id: "" };
		}
		throw e;
	}
}

export function parseNote(note?: string): {
	priceValue: number | undefined;
	priceUnit: string | undefined;
} {
	const empty = {
		priceUnit: undefined,
		priceValue: undefined,
	};
	if (!note) {
		return empty;
	}

	const parts = note.split(" ");

	if (parts.length !== 3) {
		return empty;
	}

	return {
		priceValue:
			Math.min(Number.parseFloat(parts[1]), Number.MAX_SAFE_INTEGER) || 0,
		priceUnit: parts[2],
	};
}
