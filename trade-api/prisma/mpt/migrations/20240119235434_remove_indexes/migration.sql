-- DropForeignKey
ALTER TABLE `ItemListing` DROP FOREIGN KEY `ItemListing_leagueId_fkey`;

-- DropForeignKey
ALTER TABLE `ItemListing` DROP FOREIGN KEY `ItemListing_stashId_fkey`;

-- DropIndex
DROP INDEX `ItemListing_leagueId_category_idx` ON `ItemListing`;

-- DropIndex
DROP INDEX `ItemListing_leagueId_name_idx` ON `ItemListing`;
