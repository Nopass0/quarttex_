-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "token" TEXT,
    "traderId" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "batteryLevel" INTEGER NOT NULL DEFAULT 100,
    "networkInfo" TEXT NOT NULL DEFAULT 'Wi-Fi',
    "deviceModel" TEXT NOT NULL DEFAULT 'Xiaomi Redmi Note 10',
    "androidVersion" TEXT NOT NULL DEFAULT '13',
    "appVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "lastPing" DATETIME,
    "lastHealthCheck" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Device" ("createdAt", "deviceKey", "id", "isActive", "isConnected", "lastHealthCheck", "lastPing", "name", "updatedAt") SELECT "createdAt", "deviceKey", "id", "isActive", "isConnected", "lastHealthCheck", "lastPing", "name", "updatedAt" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
CREATE UNIQUE INDEX "Device_deviceKey_key" ON "Device"("deviceKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
