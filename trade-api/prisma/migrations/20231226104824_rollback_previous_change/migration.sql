/*
  Warnings:

  - The primary key for the `ItemListing` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE `ItemListing` DROP PRIMARY KEY,
    ADD PRIMARY KEY (`id`);
