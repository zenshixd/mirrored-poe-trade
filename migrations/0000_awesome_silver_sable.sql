CREATE TABLE `appState` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `itemListing` (
	`id` text PRIMARY KEY NOT NULL,
	`stashId` text NOT NULL,
	`league` integer NOT NULL,
	`name` text NOT NULL,
	`typeLine` text NOT NULL,
	`baseType` text NOT NULL,
	`itemLevel` integer NOT NULL,
	`category` text NOT NULL,
	`subcategories` text NOT NULL,
	`priceValue` integer NOT NULL,
	`priceUnit` text NOT NULL,
	FOREIGN KEY (`league`) REFERENCES `league`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `league` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`isStandardLeague` integer NOT NULL,
	`isPrivateLeague` integer NOT NULL,
	`isEventLeague` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `publicStash` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`accountName` text NOT NULL,
	`league` integer NOT NULL,
	FOREIGN KEY (`league`) REFERENCES `league`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `publicStashChange` (
	`index` integer PRIMARY KEY NOT NULL,
	`stashChangeId` text NOT NULL,
	`nextStashChangeId` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `league_name_unique` ON `league` (`name`);--> statement-breakpoint
CREATE INDEX `stashChangeId_idx` ON `publicStashChange` (`stashChangeId`);