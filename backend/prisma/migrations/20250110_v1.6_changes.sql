-- DropForeignKey
ALTER TABLE "PayoutRateAudit" DROP CONSTRAINT "PayoutRateAudit_payoutId_fkey";

-- DropIndex
DROP INDEX "Payout_direction_status_idx";

-- AlterTable
ALTER TABLE "Payout" DROP COLUMN "cancelReasonCode",
DROP COLUMN "direction",
DROP COLUMN "externalReference",
DROP COLUMN "feePercent",
DROP COLUMN "merchantRate",
DROP COLUMN "rateDelta";

-- DropTable
DROP TABLE "PayoutRateAudit";

-- DropTable
DROP TABLE "TelegramLink";

-- DropEnum
DROP TYPE "PayoutDirection";

