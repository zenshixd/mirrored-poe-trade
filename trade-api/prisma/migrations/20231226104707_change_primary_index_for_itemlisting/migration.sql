/*
  Warnings:

  - The primary key for the `ItemListing` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `stashId` on table `ItemListing` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `ItemListing` DROP FOREIGN KEY `ItemListing_stashId_fkey`;

-- AlterTable
ALTER TABLE `ItemListing` DROP PRIMARY KEY,
    MODIFY `stashId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`, `stashId`);

-- AddForeignKey
ALTER TABLE `ItemListing` ADD CONSTRAINT `ItemListing_stashId_fkey` FOREIGN KEY (`stashId`) REFERENCES `PublicStash`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
