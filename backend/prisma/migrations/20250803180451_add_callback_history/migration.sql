-- CreateTable
CREATE TABLE "CallbackHistory" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" TEXT,
    "statusCode" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallbackHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallbackHistory_transactionId_idx" ON "CallbackHistory"("transactionId");

-- CreateIndex
CREATE INDEX "CallbackHistory_createdAt_idx" ON "CallbackHistory"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CallbackHistory" ADD CONSTRAINT "CallbackHistory_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
