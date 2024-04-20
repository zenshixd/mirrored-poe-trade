DROP TABLE `publicStashChange`;--> statement-breakpoint
CREATE INDEX `itemListing_stashId_idx` ON `itemListing` (`stashId`);--> statement-breakpoint
CREATE INDEX `itemListing_category_idx` ON `itemListing` (`category`);