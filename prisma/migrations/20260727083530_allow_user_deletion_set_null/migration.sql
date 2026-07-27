-- DropForeignKey
ALTER TABLE `rides` DROP FOREIGN KEY `rides_clientId_fkey`;

-- DropIndex
DROP INDEX `rides_clientId_fkey` ON `rides`;

-- AlterTable
ALTER TABLE `rides` MODIFY `clientId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `rides` ADD CONSTRAINT `rides_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
