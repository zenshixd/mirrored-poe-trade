-- CreateTable
CREATE TABLE `PublicStashChange` (
    `index` INTEGER NOT NULL,
    `stashChangeId` VARCHAR(191) NOT NULL,
    `data` JSON NOT NULL,
    `nextChangeId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `PublicStashChange_stashChangeId_key`(`stashChangeId`),
    PRIMARY KEY (`index`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
