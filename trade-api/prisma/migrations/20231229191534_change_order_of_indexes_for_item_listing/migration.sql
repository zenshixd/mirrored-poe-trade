-- DropIndex
DROP INDEX `ItemListing_category_league_idx` ON `ItemListing`;

-- DropIndex
DROP INDEX `ItemListing_name_league_idx` ON `ItemListing`;

-- CreateIndex
CREATE INDEX `ItemListing_league_name_idx` ON `ItemListing`(`league`, `name`);

-- CreateIndex
CREATE INDEX `ItemListing_league_category_idx` ON `ItemListing`(`league`, `category`);
