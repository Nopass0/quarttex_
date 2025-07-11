import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { MerchantEmulatorService } from "../services/merchant-emulator.service";
import { db } from "../db";
// import { closeMongo } from "../db/mongo";
import { randomUUID } from "crypto";

describe("Merchant Emulator Service", () => {
  let emulator: MerchantEmulatorService;
  let testMerchant: any;

  beforeAll(async () => {
    emulator = new MerchantEmulatorService();
    await emulator.start();

    // Create test merchant
    testMerchant = await db.merchant.create({
      data: {
        name: "Test Emulator Merchant",
        token: `test-emulator-${randomUUID()}`,
      },
    });
  });

  afterAll(async () => {
    await db.merchant.delete({
      where: { id: testMerchant.id },
    });
    await emulator.stop();
    // await closeMongo();
  });

  describe("Mock Data Generation", () => {
    test("should generate mock deal with default values", () => {
      const deal = emulator.generateMockDeal();

      expect(deal.type).toBe("deal");
      expect(deal.amount).toBeGreaterThanOrEqual(1000);
      expect(deal.amount).toBeLessThanOrEqual(50000);
      expect(deal.currency).toBe("RUB");
      expect(deal.cardNumber).toMatch(/^\d{16}$/);
      expect(deal.bank).toBeTruthy();
      expect(deal.externalReference).toMatch(/^EMU-/);
      expect(deal.metadata.emulated).toBe(true);
    });

    test("should generate mock deal with custom values", () => {
      const customAmount = 25000;
      const customBank = "Sberbank";
      const deal = emulator.generateMockDeal({
        amount: customAmount,
        bank: customBank,
      });

      expect(deal.amount).toBe(customAmount);
      expect(deal.bank).toBe(customBank);
    });

    test("should generate mock withdrawal", () => {
      const withdrawal = emulator.generateMockWithdrawal();

      expect(withdrawal.type).toBe("withdrawal");
      expect(withdrawal.amount).toBeGreaterThanOrEqual(5000);
      expect(withdrawal.amount).toBeLessThanOrEqual(100000);
      expect(withdrawal.wallet).toMatch(/^\d{16}$/);
      expect(withdrawal.externalReference).toMatch(/^EMU-WD-/);
    });

    test("should generate valid card numbers", () => {
      // Generate multiple cards to test randomness
      const cards = new Set();
      for (let i = 0; i < 10; i++) {
        const deal = emulator.generateMockDeal();
        cards.add(deal.cardNumber);
      }

      // All should be unique
      expect(cards.size).toBe(10);

      // All should start with 4, 5, or 6
      cards.forEach((card) => {
        expect(["4", "5", "6"]).toContain(card![0]);
      });
    });
  });

  // Skip MongoDB-dependent tests
  describe.skip("Statistics", () => {
    test("should return empty statistics for new merchant", async () => {
      const stats = await emulator.getStatistics(testMerchant.id);

      expect(stats.deals.success).toBe(0);
      expect(stats.deals.error).toBe(0);
      expect(stats.withdrawals.success).toBe(0);
      expect(stats.withdrawals.error).toBe(0);
      expect(stats.total).toBe(0);
    });
  });

  describe.skip("Logs", () => {
    test("should return empty logs initially", async () => {
      const { logs, total } = await emulator.getLogs({
        merchantId: testMerchant.id,
      });

      expect(logs).toEqual([]);
      expect(total).toBe(0);
    });
  });

  describe("Batch Generation Options", () => {
    test("should validate batch count limit", async () => {
      await expect(
        emulator.generateBatch({
          merchantId: testMerchant.id,
          transactionType: "deal",
          count: 1001, // Exceeds limit
        })
      ).rejects.toThrow("Batch size cannot exceed 1000 transactions");
    });

    test("should validate merchant exists", async () => {
      await expect(
        emulator.generateBatch({
          merchantId: "non-existent-id",
          transactionType: "deal",
          count: 10,
        })
      ).rejects.toThrow("Merchant not found");
    });
  });
});