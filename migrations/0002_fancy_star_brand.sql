CREATE INDEX `league_name_idx` ON `itemListing` (`league`,`name`);--> statement-breakpoint
CREATE INDEX `league_baseType_idx` ON `itemListing` (`league`,`baseType`);--> statement-breakpoint
CREATE INDEX `league_typeLine_idx` ON `itemListing` (`league`,`typeLine`);--> statement-breakpoint
CREATE INDEX `league_accountName_idx` ON `publicStash` (`league`,`accountName`);