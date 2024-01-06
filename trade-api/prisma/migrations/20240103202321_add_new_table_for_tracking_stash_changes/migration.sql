-- CreateTable
CREATE TABLE `PublicStashChangeList` (
    `index` INTEGER NOT NULL,
    `changeId` VARCHAR(191) NOT NULL,
    `nextChangeId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `PublicStashChangeList_changeId_key`(`changeId`),
    PRIMARY KEY (`index`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
