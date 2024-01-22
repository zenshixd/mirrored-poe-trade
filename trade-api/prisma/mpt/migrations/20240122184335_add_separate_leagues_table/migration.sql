/*
  Warnings:

  - You are about to drop the column `league` on the `PublicStash` table. All the data in the column will be lost.
  - Added the required column `leagueId` to the `PublicStash` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `ItemListing_stashId_fkey` ON `ItemListing`;

-- AlterTable
ALTER TABLE `PublicStash` DROP COLUMN `league`,
    ADD COLUMN `leagueId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `PublicStash` ADD CONSTRAINT `PublicStash_leagueId_fkey` FOREIGN KEY (`leagueId`) REFERENCES `League`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemListing` ADD CONSTRAINT `ItemListing_leagueId_fkey` FOREIGN KEY (`leagueId`) REFERENCES `League`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
