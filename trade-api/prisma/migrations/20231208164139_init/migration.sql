-- CreateTable
CREATE TABLE `ItemListing` (
    `id` VARCHAR(191) NOT NULL,
    `stashId` VARCHAR(191) NOT NULL,
    `stashName` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `league` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `typeLine` VARCHAR(191) NOT NULL,
    `baseLine` VARCHAR(191) NOT NULL,
    `itemLevel` INTEGER NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `subcategories` VARCHAR(191) NOT NULL,
    `priceValue` INTEGER NOT NULL,
    `priceUnit` VARCHAR(191) NOT NULL,

    INDEX `ItemListing_name_league_idx`(`name`, `league`),
    INDEX `ItemListing_category_league_idx`(`category`, `league`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
