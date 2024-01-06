/*
  Warnings:

  - You are about to drop the `PublicStashChangeList` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `PublicStashChangeList`;

-- CreateTable
CREATE TABLE `PublicStashChange` (
    `index` INTEGER NOT NULL,
    `changeId` VARCHAR(191) NOT NULL,
    `nextChangeId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `PublicStashChange_changeId_key`(`changeId`),
    PRIMARY KEY (`index`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
