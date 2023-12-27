/*
  Warnings:

  - You are about to drop the column `accountName` on the `ItemListing` table. All the data in the column will be lost.
  - You are about to drop the column `stashName` on the `ItemListing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ItemListing` DROP COLUMN `accountName`,
    DROP COLUMN `stashName`,
    MODIFY `stashId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PublicStash` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `league` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ItemListing` ADD CONSTRAINT `ItemListing_stashId_fkey` FOREIGN KEY (`stashId`) REFERENCES `PublicStash`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
