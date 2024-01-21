-- CreateTable
CREATE TABLE `PublicStash` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `league` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `League` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isStandardLeague` BOOLEAN NOT NULL,
    `isPrivateLeague` BOOLEAN NOT NULL,
    `isEventLeague` BOOLEAN NOT NULL,

    UNIQUE INDEX `League_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemListing` (
    `id` VARCHAR(191) NOT NULL,
    `stashId` VARCHAR(191) NOT NULL,
    `leagueId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `typeLine` VARCHAR(191) NOT NULL,
    `baseType` VARCHAR(191) NOT NULL,
    `itemLevel` INTEGER NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `subcategories` VARCHAR(191) NOT NULL,
    `priceValue` INTEGER NOT NULL,
    `priceUnit` VARCHAR(191) NOT NULL,

    INDEX `ItemListing_leagueId_name_idx`(`leagueId`, `name`),
    INDEX `ItemListing_leagueId_category_idx`(`leagueId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppState` (
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ItemListing` ADD CONSTRAINT `ItemListing_stashId_fkey` FOREIGN KEY (`stashId`) REFERENCES `PublicStash`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemListing` ADD CONSTRAINT `ItemListing_leagueId_fkey` FOREIGN KEY (`leagueId`) REFERENCES `League`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
