export interface PoeApiItemProperty {
	name: string;
	values: [string, number];
	displayMode: number;
	progress?: number;
	type?: number;
	suffix?: string;
}

export enum PoeApiFrameType {
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

export interface PoeApiCrucibleNodeInfo {
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

export interface PoeApiCrucibleInfo {
	layout: string;
	nodes: Record<string, PoeApiCrucibleNodeInfo>;
}

export interface PoeApiItemSocket {
	group: number;
	attr?: "S" | "D" | "I" | "G" | "A" | "DV";
	sColour?: "R" | "G" | "B" | "W" | "A" | "DV";
}

export interface PoeApiPublicStashItem {
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
	sockets?: PoeApiItemSocket[];
	socketedItems?: PoeApiPublicStashItem[];
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
	properties?: PoeApiItemProperty[];
	notableProperties?: PoeApiItemProperty[];
	requirements?: PoeApiItemProperty[];
	additionalProperties?: PoeApiItemProperty[];
	nextLevelRequirements?: PoeApiItemProperty[];
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
	crucible?: PoeApiCrucibleInfo;
	ruthless?: true;
	frameType: PoeApiFrameType;
	artFilename?: string;
	hybrid?: {
		isVaalGem?: boolean;
		baseTypeName: string;
		properties: PoeApiItemProperty[];
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

export interface PoeApiPublicStashChange {
	id: string;
	public: boolean;
	accountName?: string;
	stash?: string;
	stashType: string;
	league?: string;
	items: PoeApiPublicStashItem[];
}

export interface PoeApiPublicStashResponse {
	next_change_id: string;
	stashes: PoeApiPublicStashChange[];
}
