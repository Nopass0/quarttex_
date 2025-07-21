-- CreateEnum
CREATE TYPE "KkkOperationType" AS ENUM ('PLUS', 'MINUS');

-- AlterTable
ALTER TABLE "RateSettings" ADD COLUMN "kkkOperation" "KkkOperationType" NOT NULL DEFAULT 'MINUS';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "kkkOperation" "KkkOperationType";