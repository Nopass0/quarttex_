/*
  Warnings:

  - You are about to drop the column `dailyLimit` on the `BankDetail` table. All the data in the column will be lost.
  - You are about to drop the column `dailyTraffic` on the `BankDetail` table. All the data in the column will be lost.
  - You are about to drop the column `maxCountTransactions` on the `BankDetail` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyLimit` on the `BankDetail` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyTraffic` on the `BankDetail` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BankDetail" DROP COLUMN "dailyLimit",
DROP COLUMN "dailyTraffic",
DROP COLUMN "maxCountTransactions",
DROP COLUMN "monthlyLimit",
DROP COLUMN "monthlyTraffic",
ADD COLUMN     "currentTotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "maxActiveTransactions" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "operationLimit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sumLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmountLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "transactionLimit" INTEGER NOT NULL DEFAULT 0;
