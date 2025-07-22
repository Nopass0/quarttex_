-- CreateEnum
CREATE TYPE "KkkOperationType" AS ENUM ('PLUS', 'MINUS');

-- CreateTable (if not exists)
CREATE TABLE IF NOT EXISTS "RateSettings" (
    "id" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "kkkPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "RateSettings_methodId_key" ON "RateSettings"("methodId");

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'RateSettings_methodId_fkey'
    ) THEN
        ALTER TABLE "RateSettings" ADD CONSTRAINT "RateSettings_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable
ALTER TABLE "RateSettings" ADD COLUMN IF NOT EXISTS "kkkOperation" "KkkOperationType" NOT NULL DEFAULT 'MINUS';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "kkkOperation" "KkkOperationType";