-- CreateEnum
CREATE TYPE "MerchantRequestType" AS ENUM ('TRANSACTION_IN', 'PAYOUT_CREATE');

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "wellbitCallbackUrl" TEXT;

-- CreateTable
CREATE TABLE "MerchantRequestLog" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" "MerchantRequestType" NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellbitBankMapping" (
    "id" SERIAL NOT NULL,
    "wellbitBankCode" TEXT NOT NULL,
    "wellbitBankName" TEXT NOT NULL,
    "ourBankName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellbitBankMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantRequestLog_merchantId_idx" ON "MerchantRequestLog"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantRequestLog_createdAt_idx" ON "MerchantRequestLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WellbitBankMapping_wellbitBankCode_key" ON "WellbitBankMapping"("wellbitBankCode");

-- AddForeignKey
ALTER TABLE "MerchantRequestLog" ADD CONSTRAINT "MerchantRequestLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert bank mappings
INSERT INTO "WellbitBankMapping" ("wellbitBankCode", "wellbitBankName", "ourBankName", "updatedAt") VALUES
('TCSBRUB', 'Т-Банк (Тинькоф)', 'TBANK', CURRENT_TIMESTAMP),
('SBERRUB', 'Сбербанк', 'SBERBANK', CURRENT_TIMESTAMP),
('TBRUB', 'ВТБ', 'VTB', CURRENT_TIMESTAMP),
('ACRUB', 'Альфа Банк', 'ALFABANK', CURRENT_TIMESTAMP),
('RFBRUB', 'Райффайзен', 'RAIFFEISEN', CURRENT_TIMESTAMP),
('ROSBRUB', 'Росбанк', 'ROSBANK', CURRENT_TIMESTAMP),
('SNRRUB', 'Синара', 'SINARA', CURRENT_TIMESTAMP),
('KUBRUB', 'Кредит Урал Банк', 'URALSIB', CURRENT_TIMESTAMP),
('RSSBRUB', 'Ренессанс Кредит', 'RENAISSANCE', CURRENT_TIMESTAMP),
('PSBRUB', 'Промсвязьбанк', 'PROMSVYAZBANK', CURRENT_TIMESTAMP),
('GPBRUB', 'Газпромбанк', 'GAZPROMBANK', CURRENT_TIMESTAMP),
('OZONBRUB', 'Ozon Банк', 'OZONBANK', CURRENT_TIMESTAMP),
('SVCMBRUB', 'Совкомбанк', 'SOVCOMBANK', CURRENT_TIMESTAMP),
('OTPBRUB', 'ОТП Банк', 'OTPBANK', CURRENT_TIMESTAMP),
('YANDXBRUB', 'Яндекс банк', 'TBANK', CURRENT_TIMESTAMP),
('RSHBRUB', 'Россельхозбанк', 'ROSSELKHOZBANK', CURRENT_TIMESTAMP),
('URSBRUB', 'Уралсиб', 'URALSIB', CURRENT_TIMESTAMP),
('MTSBRUB', 'МТС Банк', 'MTSBANK', CURRENT_TIMESTAMP),
('POSTBRUB', 'Почта Банк', 'POCHTABANK', CURRENT_TIMESTAMP),
('WBRUB', 'Вайлдберриз Банк', 'SBERBANK', CURRENT_TIMESTAMP),
('FORARUB', 'Фора Банк', 'FORABANK', CURRENT_TIMESTAMP),
('AKBRSRUB', 'Акбарс банк', 'AKBARS', CURRENT_TIMESTAMP),
('BKSRUB', 'БКС Банк', 'BCSBANK', CURRENT_TIMESTAMP),
('MKBRUB', 'Московский Кредитный Банк', 'MKB', CURRENT_TIMESTAMP),
('AVBRUB', 'Банк Авангард', 'AVANGARD', CURRENT_TIMESTAMP),
('BSPBRUB', 'Банк Санкт-Петербург', 'SPBBANK', CURRENT_TIMESTAMP),
('HMERUB', 'Хоум Кредит', 'HOMECREDIT', CURRENT_TIMESTAMP),
('LOKRUB', 'Локо Банк', 'LOKOBANK', CURRENT_TIMESTAMP),
('GENRUB', 'ГЕНБАНК', 'GENBANK', CURRENT_TIMESTAMP),
('ABSLRUB', 'Абсолют', 'ABSOLUTBANK', CURRENT_TIMESTAMP),
('TOCHRUB', 'Точка Банк', 'OTKRITIE', CURRENT_TIMESTAMP),
('CIBRUB', 'Центр-инвест Банк', 'SBERBANK', CURRENT_TIMESTAMP),
('REALISTRUB', 'Реалист Банк', 'SBERBANK', CURRENT_TIMESTAMP),
('MILLRUB', 'Миллионбанк', 'SBERBANK', CURRENT_TIMESTAMP),
('ATBRUB', 'АТБ', 'ALFABANK', CURRENT_TIMESTAMP),
('RENSRUB', 'Ренессанс банк', 'RENAISSANCE', CURRENT_TIMESTAMP);
