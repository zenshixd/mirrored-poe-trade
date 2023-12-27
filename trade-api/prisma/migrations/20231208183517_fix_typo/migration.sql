/*
  Warnings:

  - You are about to drop the column `baseLine` on the `ItemListing` table. All the data in the column will be lost.
  - Added the required column `baseType` to the `ItemListing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ItemListing` DROP COLUMN `baseLine`,
    ADD COLUMN `baseType` VARCHAR(191) NOT NULL;
