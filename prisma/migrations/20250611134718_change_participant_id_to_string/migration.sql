/*
  Warnings:

  - The primary key for the `Participant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfVotes` on the `Vote` table. All the data in the column will be lost.
  - You are about to drop the column `participantId` on the `Vote` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `about` to the `Participant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codeName` to the `Participant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `Participant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `Participant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `participantCodeName` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Vote` DROP FOREIGN KEY `Vote_participantId_fkey`;

-- AlterTable
ALTER TABLE `Participant` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    DROP COLUMN `name`,
    ADD COLUMN `about` VARCHAR(191) NOT NULL,
    ADD COLUMN `codeName` VARCHAR(191) NOT NULL,
    ADD COLUMN `email` VARCHAR(191) NOT NULL,
    ADD COLUMN `fullName` VARCHAR(191) NOT NULL,
    ADD COLUMN `photo` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`codeName`);

-- AlterTable
ALTER TABLE `Vote` DROP COLUMN `numberOfVotes`,
    DROP COLUMN `participantId`,
    ADD COLUMN `participantCodeName` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Participant_email_key` ON `Participant`(`email`);

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_participantCodeName_fkey` FOREIGN KEY (`participantCodeName`) REFERENCES `Participant`(`codeName`) ON DELETE RESTRICT ON UPDATE CASCADE;
