-- DropForeignKey
ALTER TABLE `Participant` DROP FOREIGN KEY `Participant_contestId_fkey`;

-- DropForeignKey
ALTER TABLE `Vote` DROP FOREIGN KEY `Vote_contestId_fkey`;

-- DropForeignKey
ALTER TABLE `Vote` DROP FOREIGN KEY `Vote_participantCodeName_fkey`;

-- AddForeignKey
ALTER TABLE `Participant` ADD CONSTRAINT `Participant_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_participantCodeName_fkey` FOREIGN KEY (`participantCodeName`) REFERENCES `Participant`(`codeName`) ON DELETE CASCADE ON UPDATE CASCADE;
