import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { PayoutService } from "../services/payout.service";
import { db } from "../db";
import { createTestMerchant, createTestTrader, cleanupTestData } from "./utils/test-helpers";

const payoutService = PayoutService.getInstance();

describe("Payout Integration Tests", () => {
  let merchant: any;
  let trader: any;
  let trader2: any;
  
  beforeAll(async () => {
    await cleanupTestData();
    merchant = await createTestMerchant();
    trader = await createTestTrader();
    trader2 = await createTestTrader();
    
    // Give traders initial balance
    await db.user.update({
      where: { id: trader.id },
      data: { payoutBalance: 50000 },
    });
    await db.user.update({
      where: { id: trader2.id },
      data: { payoutBalance: 30000 },
    });
  });
  
  afterAll(async () => {
    await cleanupTestData();
  });
  
  describe("Complete Payout Flow", () => {
    test("full payout lifecycle: create -> accept -> confirm -> approve", async () => {
      // 1. Merchant creates payout
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 10000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
        direction: "OUT",
        rateDelta: 2,
        feePercent: 1.5,
        externalReference: "INT-TEST-001",
        webhookUrl: "https://example.com/webhook",
      });
      
      expect(payout.status).toBe("CREATED");
      expect(payout.rate).toBe(102);
      expect(payout.total).toBe(10150);
      
      // 2. Trader accepts payout
      const acceptedPayout = await payoutService.acceptPayout(payout.id, trader.id);
      expect(acceptedPayout.status).toBe("ACTIVE");
      expect(acceptedPayout.traderId).toBe(trader.id);
      
      // Check trader balance was frozen
      const traderAfterAccept = await db.user.findUnique({
        where: { id: trader.id },
      });
      expect(traderAfterAccept?.payoutBalance).toBe(39850); // 50000 - 10150
      expect(traderAfterAccept?.frozenPayoutBalance).toBe(10150);
      
      // 3. Trader confirms with proof
      const confirmedPayout = await payoutService.confirmPayout(
        payout.id,
        trader.id,
        ["proof1.jpg", "proof2.jpg"]
      );
      expect(confirmedPayout.status).toBe("CHECKING");
      expect(confirmedPayout.proofFiles).toHaveLength(2);
      
      // 4. Merchant approves
      const completedPayout = await payoutService.approvePayout(payout.id, merchant.id);
      expect(completedPayout.status).toBe("COMPLETED");
      
      // Check trader received USDT
      const traderAfterComplete = await db.user.findUnique({
        where: { id: trader.id },
      });
      expect(traderAfterComplete?.frozenPayoutBalance).toBe(0);
      expect(traderAfterComplete?.balanceUsdt).toBeCloseTo(99.51, 2); // totalUsdt
      expect(traderAfterComplete?.profitFromPayouts).toBeCloseTo(1.47, 2); // totalUsdt - amountUsdt
    });
    
    test("dispute flow: create -> accept -> confirm -> dispute", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 15000,
        wallet: "79001234567",
        bank: "TINKOFF",
        isCard: false,
        merchantRate: 98,
      });
      
      await payoutService.acceptPayout(payout.id, trader2.id);
      await payoutService.confirmPayout(payout.id, trader2.id, ["proof.jpg"]);
      
      // Merchant disputes
      const disputedPayout = await payoutService.createDispute(
        payout.id,
        merchant.id,
        ["dispute1.jpg", "dispute2.jpg"],
        "Wrong amount transferred - expected 15000, got 14500"
      );
      
      expect(disputedPayout.status).toBe("DISPUTED");
      expect(disputedPayout.disputeMessage).toContain("Wrong amount");
      
      // Trader balance should still be frozen
      const traderAfterDispute = await db.user.findUnique({
        where: { id: trader2.id },
      });
      expect(traderAfterDispute?.frozenPayoutBalance).toBe(15000);
    });
    
    test("cancellation flow with balance restoration", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 8000,
        wallet: "41001234567890",
        bank: "ALFA",
        isCard: true,
        merchantRate: 100,
      });
      
      const initialBalance = trader.payoutBalance;
      
      await payoutService.acceptPayout(payout.id, trader.id);
      
      // Check balance was frozen
      const traderAfterAccept = await db.user.findUnique({
        where: { id: trader.id },
      });
      expect(traderAfterAccept?.payoutBalance).toBe(initialBalance - 8000);
      expect(traderAfterAccept?.frozenPayoutBalance).toBe(8000);
      
      // Trader cancels
      await payoutService.cancelPayout(
        payout.id,
        trader.id,
        "Cannot process - bank system maintenance",
        false
      );
      
      // Check balance was restored
      const traderAfterCancel = await db.user.findUnique({
        where: { id: trader.id },
      });
      expect(traderAfterCancel?.payoutBalance).toBe(initialBalance);
      expect(traderAfterCancel?.frozenPayoutBalance).toBe(0);
    });
  });
  
  describe("Rate Adjustment Integration", () => {
    test("admin adjusts rate during processing", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 20000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
        direction: "OUT",
        rateDelta: 1,
        feePercent: 1,
      });
      
      expect(payout.total).toBe(20200); // 20000 * 1.01
      
      // Admin adjusts rates
      const adjusted = await payoutService.adjustPayoutRate(
        payout.id,
        "admin-123",
        3, // new rateDelta
        2  // new feePercent
      );
      
      expect(adjusted.rate).toBe(103); // 100 + 3
      expect(adjusted.total).toBe(20400); // 20000 * 1.02
      
      // Trader accepts with new rate
      await payoutService.acceptPayout(payout.id, trader.id);
      
      const traderAfterAccept = await db.user.findUnique({
        where: { id: trader.id },
      });
      expect(traderAfterAccept?.frozenPayoutBalance).toBe(20400);
    });
  });
  
  describe("Concurrent Operations", () => {
    test("multiple traders cannot accept same payout", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 5000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      // First trader accepts
      await payoutService.acceptPayout(payout.id, trader.id);
      
      // Second trader tries to accept
      await expect(
        payoutService.acceptPayout(payout.id, trader2.id)
      ).rejects.toThrow("Payout is not available for acceptance");
    });
    
    test("handle rapid status changes", async () => {
      const payouts = await Promise.all([
        payoutService.createPayout({
          merchantId: merchant.id,
          amount: 1000,
          wallet: "41001234567890",
          bank: "SBER",
          isCard: true,
          merchantRate: 100,
        }),
        payoutService.createPayout({
          merchantId: merchant.id,
          amount: 2000,
          wallet: "41001234567890",
          bank: "SBER",
          isCard: true,
          merchantRate: 100,
        }),
        payoutService.createPayout({
          merchantId: merchant.id,
          amount: 3000,
          wallet: "41001234567890",
          bank: "SBER",
          isCard: true,
          merchantRate: 100,
        }),
      ]);
      
      // Accept all rapidly
      await Promise.all([
        payoutService.acceptPayout(payouts[0].id, trader.id),
        payoutService.acceptPayout(payouts[1].id, trader.id),
        payoutService.acceptPayout(payouts[2].id, trader2.id),
      ]);
      
      // Verify all were accepted correctly
      const [p1, p2, p3] = await Promise.all(
        payouts.map((p) => db.payout.findUnique({ where: { id: p.id } }))
      );
      
      expect(p1?.status).toBe("ACTIVE");
      expect(p1?.traderId).toBe(trader.id);
      expect(p2?.status).toBe("ACTIVE");
      expect(p2?.traderId).toBe(trader.id);
      expect(p3?.status).toBe("ACTIVE");
      expect(p3?.traderId).toBe(trader2.id);
    });
  });
  
  describe("Edge Cases", () => {
    test("handle maximum simultaneous payouts limit", async () => {
      // Set trader limit
      await db.user.update({
        where: { id: trader.id },
        data: { maxSimultaneousPayouts: 2 },
      });
      
      // Create and accept 2 payouts
      const payout1 = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 1000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      const payout2 = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 2000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      await payoutService.acceptPayout(payout1.id, trader.id);
      await payoutService.acceptPayout(payout2.id, trader.id);
      
      // Try to accept third
      const payout3 = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 3000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      await expect(
        payoutService.acceptPayout(payout3.id, trader.id)
      ).rejects.toThrow("Maximum simultaneous payouts reached");
    });
    
    test("handle insufficient balance", async () => {
      // Set low balance
      await db.user.update({
        where: { id: trader2.id },
        data: { payoutBalance: 100 },
      });
      
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 1000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      await expect(
        payoutService.acceptPayout(payout.id, trader2.id)
      ).rejects.toThrow("Insufficient balance");
    });
  });
});