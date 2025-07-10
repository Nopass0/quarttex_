import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { PayoutService } from "../services/payout.service";
import { db } from "../db";
import { createTestMerchant, createTestTrader, cleanupTestData } from "./utils/test-helpers";

const payoutService = PayoutService.getInstance();

describe("Payout Service Tests", () => {
  let merchant: any;
  let trader: any;
  
  beforeAll(async () => {
    await cleanupTestData();
    merchant = await createTestMerchant();
    trader = await createTestTrader();
  });
  
  afterAll(async () => {
    await cleanupTestData();
  });
  
  describe("Create Payout", () => {
    test("should create OUT payout with rate calculations", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 10000, // 10,000 RUB
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
        direction: "OUT",
        rateDelta: 2, // +2 to merchant rate
        feePercent: 1.5, // 1.5% fee
        externalReference: "TEST-REF-001",
      });
      
      expect(payout).toBeDefined();
      expect(payout.amount).toBe(10000);
      expect(payout.merchantRate).toBe(100);
      expect(payout.rate).toBe(102); // merchantRate + rateDelta
      expect(payout.rateDelta).toBe(2);
      expect(payout.feePercent).toBe(1.5);
      expect(payout.total).toBe(10150); // amount * (1 + feePercent/100)
      expect(payout.amountUsdt).toBeCloseTo(98.04, 2); // amount / rate
      expect(payout.totalUsdt).toBeCloseTo(99.51, 2); // total / rate
      expect(payout.direction).toBe("OUT");
      expect(payout.status).toBe("CREATED");
    });
    
    test("should create IN payout without rate delta", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 5000,
        wallet: "79001234567",
        bank: "TINKOFF",
        isCard: false,
        merchantRate: 95,
        direction: "IN",
        feePercent: 2,
      });
      
      expect(payout).toBeDefined();
      expect(payout.direction).toBe("IN");
      expect(payout.rate).toBe(95); // No rate delta for IN
      expect(payout.total).toBe(5100); // amount * (1 + feePercent/100)
    });
  });
  
  describe("Accept Payout", () => {
    test("should accept payout and freeze balance", async () => {
      // Give trader enough balance
      await db.user.update({
        where: { id: trader.id },
        data: { payoutBalance: 20000 },
      });
      
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 5000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      const acceptedPayout = await payoutService.acceptPayout(payout.id, trader.id);
      
      expect(acceptedPayout.status).toBe("ACTIVE");
      expect(acceptedPayout.traderId).toBe(trader.id);
      expect(acceptedPayout.acceptedAt).toBeDefined();
      
      // Check trader balance was frozen
      const updatedTrader = await db.user.findUnique({
        where: { id: trader.id },
      });
      expect(updatedTrader?.payoutBalance).toBe(15000); // 20000 - 5000
      expect(updatedTrader?.frozenPayoutBalance).toBe(5000);
    });
    
    test("should not accept expired payout", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 1000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      // Manually expire the payout
      await db.payout.update({
        where: { id: payout.id },
        data: { expireAt: new Date(Date.now() - 1000) }, // 1 second ago
      });
      
      await expect(
        payoutService.acceptPayout(payout.id, trader.id)
      ).rejects.toThrow("Payout has expired");
    });
  });
  
  describe("Rate Adjustment", () => {
    test("admin should adjust payout rate", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 10000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
        direction: "OUT",
        rateDelta: 2,
        feePercent: 1,
      });
      
      const adjustedPayout = await payoutService.adjustPayoutRate(
        payout.id,
        "admin-123",
        5, // new rateDelta
        2  // new feePercent
      );
      
      expect(adjustedPayout.rateDelta).toBe(5);
      expect(adjustedPayout.feePercent).toBe(2);
      expect(adjustedPayout.rate).toBe(105); // merchantRate + new rateDelta
      expect(adjustedPayout.total).toBe(10200); // amount * (1 + new feePercent/100)
      
      // Check audit was created
      const audit = await db.payoutRateAudit.findFirst({
        where: { payoutId: payout.id },
      });
      expect(audit).toBeDefined();
      expect(audit?.oldRateDelta).toBe(2);
      expect(audit?.newRateDelta).toBe(5);
      expect(audit?.oldFeePercent).toBe(1);
      expect(audit?.newFeePercent).toBe(2);
    });
  });
  
  describe("Merchant Operations", () => {
    test("merchant should update payout rate", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 5000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      const updated = await payoutService.updatePayoutRate(
        payout.id,
        merchant.id,
        102, // new merchant rate
        6000 // new amount
      );
      
      expect(updated.merchantRate).toBe(102);
      expect(updated.amount).toBe(6000);
      expect(updated.rate).toBe(102); // updated merchantRate
    });
    
    test("merchant should cancel payout", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 3000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      const cancelled = await payoutService.cancelPayoutByMerchant(
        payout.id,
        merchant.id,
        "TEST_CANCEL"
      );
      
      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.cancelReasonCode).toBe("TEST_CANCEL");
      expect(cancelled.cancelledAt).toBeDefined();
    });
  });
  
  describe("Dispute Flow", () => {
    test("should create dispute for checking payout", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 7000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      // Accept and confirm payout to get it to CHECKING
      await db.user.update({
        where: { id: trader.id },
        data: { payoutBalance: 10000 },
      });
      
      await payoutService.acceptPayout(payout.id, trader.id);
      await payoutService.confirmPayout(payout.id, trader.id, ["proof1.jpg"]);
      
      const disputed = await payoutService.createDispute(
        payout.id,
        merchant.id,
        ["dispute1.jpg", "dispute2.jpg"],
        "Incorrect amount received"
      );
      
      expect(disputed.status).toBe("DISPUTED");
      expect(disputed.disputeFiles).toEqual(["dispute1.jpg", "dispute2.jpg"]);
      expect(disputed.disputeMessage).toBe("Incorrect amount received");
    });
  });
});