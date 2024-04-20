import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const league = sqliteTable("league", {
	id: integer("id").notNull().primaryKey(),
	name: text("name").notNull().unique(),
	isStandardLeague: integer("isStandardLeague", { mode: "boolean" }).notNull(),
	isPrivateLeague: integer("isPrivateLeague", { mode: "boolean" }).notNull(),
	isEventLeague: integer("isEventLeague", { mode: "boolean" }).notNull(),
});
export type League = typeof league.$inferSelect;

export const publicStash = sqliteTable(
	"publicStash",
	{
		id: text("id").notNull().primaryKey(),
		name: text("name").notNull(),
		accountName: text("accountName").notNull(),
		league: integer("league")
			.notNull()
			.references(() => league.id),
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
		league: integer("league")
			.notNull()
			.references(() => league.id),
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

export const appState = sqliteTable("appState", {
	key: text("key").notNull().primaryKey(),
	value: text("value").notNull(),
});
export type AppState = typeof appState.$inferSelect;
