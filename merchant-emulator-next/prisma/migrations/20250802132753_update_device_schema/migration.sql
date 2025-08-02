/*
  Warnings:

  - You are about to drop the column `bankName` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `cardLast4` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `cardholderName` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `bankName` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `deviceKey` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPing" DATETIME,
    "lastHealthCheck" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Device" ("createdAt", "id", "isActive", "isConnected", "lastHealthCheck", "lastPing", "name", "updatedAt") SELECT "createdAt", "id", "isActive", "isConnected", "lastHealthCheck", "lastPing", "name", "updatedAt" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
CREATE UNIQUE INDEX "Device_deviceKey_key" ON "Device"("deviceKey");
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("amount", "createdAt", "deviceId", "id", "isProcessed", "message") SELECT "amount", "createdAt", "deviceId", "id", "isProcessed", "message" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
