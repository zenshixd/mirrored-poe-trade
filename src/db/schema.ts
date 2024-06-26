import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const publicStash = sqliteTable(
	"publicStash",
	{
		id: text("id").notNull().primaryKey(),
		name: text("name").notNull(),
		accountName: text("accountName").notNull(),
		league: text("league").notNull(),
		itemsCount: integer("itemsCount").notNull(),
	},
	(t) => ({
		accountName_idx: index("league_accountName_idx").on(
			t.league,
			t.accountName,
		),
	}),
);
export type PublicStash = typeof publicStash.$inferSelect;

export const itemListing = sqliteTable(
	"itemListing",
	{
		id: text("id").notNull().primaryKey(),
		stashId: text("stashId").notNull(),
		league: text("league").notNull(),
		name: text("name").notNull(),
		typeLine: text("typeLine").notNull(),
		baseType: text("baseType").notNull(),
		itemLevel: integer("itemLevel").notNull(),
		category: text("category").notNull(),
		subcategories: text("subcategories").notNull(),
		priceValue: integer("priceValue").notNull(),
		priceUnit: text("priceUnit").notNull(),
	},
	(t) => ({
		stashId_idx: index("itemListing_stashId_idx").on(t.stashId),
		league_name_idx: index("league_name_idx").on(t.league, t.name),
		league_baseType_idx: index("league_baseType_idx").on(t.league, t.baseType),
		league_typeLine_idx: index("league_typeLine_idx").on(t.league, t.typeLine),
		category_idx: index("itemListing_category_idx").on(t.category),
	}),
);
export type ItemListing = typeof itemListing.$inferSelect;
