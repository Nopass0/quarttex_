CREATE TYPE "MerchantStaffRole" AS ENUM ('owner','staff');

CREATE TABLE "MerchantStaff" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "MerchantStaffRole" NOT NULL DEFAULT 'staff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MerchantStaff_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MerchantStaff_token_key" UNIQUE ("token"),
    CONSTRAINT "MerchantStaff_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "MerchantStaff_merchantId_idx" ON "MerchantStaff"("merchantId");
