-- Data migration for v1.6
-- This script should be run before applying the schema migration

-- 1. Set merchantRate to current rate for existing payouts
UPDATE "Payout" 
SET "merchantRate" = "rate"
WHERE "merchantRate" IS NULL;

-- 2. Recalculate rate based on merchantRate + rateDelta for existing payouts
-- Since rateDelta defaults to 0, this won't change existing rates
UPDATE "Payout" 
SET "rate" = COALESCE("merchantRate", "rate") + COALESCE("rateDelta", 0)
WHERE "direction" = 'OUT' OR "direction" IS NULL;

-- Note: The schema migration will handle adding the new columns with defaults