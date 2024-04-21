CREATE TABLE `itemListing` (
	`id` text PRIMARY KEY NOT NULL,
	`stashId` text NOT NULL,
	`league` text NOT NULL,
	`name` text NOT NULL,
	`typeLine` text NOT NULL,
	`baseType` text NOT NULL,
	`itemLevel` integer NOT NULL,
	`category` text NOT NULL,
	`subcategories` text NOT NULL,
	`priceValue` integer NOT NULL,
	`priceUnit` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `publicStash` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`accountName` text NOT NULL,
	`league` text NOT NULL,
	`itemsCount` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `itemListing_stashId_idx` ON `itemListing` (`stashId`);--> statement-breakpoint
CREATE INDEX `league_name_idx` ON `itemListing` (`league`,`name`);--> statement-breakpoint
CREATE INDEX `league_baseType_idx` ON `itemListing` (`league`,`baseType`);--> statement-breakpoint
CREATE INDEX `league_typeLine_idx` ON `itemListing` (`league`,`typeLine`);--> statement-breakpoint
CREATE INDEX `itemListing_category_idx` ON `itemListing` (`category`);--> statement-breakpoint
CREATE INDEX `league_accountName_idx` ON `publicStash` (`league`,`accountName`);