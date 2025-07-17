import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { db } from "../db";
import DisputeExpirationService from "../services/DisputeExpirationService";

describe("Dispute Expiration Service", () => {
  let service: DisputeExpirationService;
  let testMerchant: any;
  let testTrader: any;
  let testDeal: any;
  let testPayout: any;

  beforeAll(async () => {
    // Create test data
    testTrader = await db.user.create({
      data: {
        email: "test-dispute-trader@test.com",
        name: "Test Dispute Trader",
        password: "test123",
        balanceUsdt: 1000,
        balanceRub: 0,
        frozenUsdt: 0,
        profitFromDeals: 0,
        profitFromPayouts: 0
      }
    });

    testMerchant = await db.merchant.create({
      data: {
        name: "Test Dispute Merchant",
        token: "test-dispute-merchant-token",
        balanceUsdt: 5000,
        disabled: false,
        banned: false
      }
    });

    // Create test method
    const testMethod = await db.paymentMethod.create({
      data: {
        name: "Test Method",
        type: "SBP",
        currency: "RUB",
        minAmount: 100,
        maxAmount: 100000,
        isActive: true
      }
    });

    // Create test deal
    testDeal = await db.transaction.create({
      data: {
        amount: 1000,
        currency: "RUB",
        merchantId: testMerchant.id,
        traderId: testTrader.id,
        methodId: testMethod.id,
        methodName: testMethod.name,
        status: "DISPUTED"
      }
    });

    // Create test payout
    testPayout = await db.payout.create({
      data: {
        merchantId: testMerchant.id,
        traderId: testTrader.id,
        methodId: testMethod.id,
        amount: 500,
        currency: "RUB",
        status: "DISPUTED"
      }
    });

    // Initialize service
    service = new DisputeExpirationService();
  });

  afterAll(async () => {
    // Clean up test data
    await db.dealDisputeMessage.deleteMany({
      where: { dispute: { dealId: testDeal.id } }
    });
    await db.dealDispute.deleteMany({
      where: { dealId: testDeal.id }
    });
    await db.withdrawalDisputeMessage.deleteMany({
      where: { dispute: { payoutId: testPayout.id } }
    });
    await db.withdrawalDispute.deleteMany({
      where: { payoutId: testPayout.id }
    });
    await db.transaction.delete({ where: { id: testDeal.id } });
    await db.payout.delete({ where: { id: testPayout.id } });
    await db.merchant.delete({ where: { id: testMerchant.id } });
    await db.user.delete({ where: { id: testTrader.id } });
  });

  test("should expire deal disputes after timeout", async () => {
    // Set dispute timeout to 1 minute for testing
    await db.systemConfig.upsert({
      where: { key: "disputeDayShiftTimeoutMinutes" },
      update: { value: "1" },
      create: { key: "disputeDayShiftTimeoutMinutes", value: "1" }
    });

    // Create an expired dispute (created 2 minutes ago)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const expiredDispute = await db.dealDispute.create({
      data: {
        dealId: testDeal.id,
        merchantId: testMerchant.id,
        traderId: testTrader.id,
        status: "OPEN",
        createdAt: twoMinutesAgo
      }
    });

    // Run the service tick
    await (service as any).tick();

    // Check that the dispute was resolved
    const updatedDispute = await db.dealDispute.findUnique({
      where: { id: expiredDispute.id }
    });

    expect(updatedDispute?.status).toBe("RESOLVED_SUCCESS");
    expect(updatedDispute?.resolution).toContain("автоматически закрыт");
    expect(updatedDispute?.resolvedAt).toBeTruthy();

    // Check that a system message was added
    const messages = await db.dealDisputeMessage.findMany({
      where: { disputeId: expiredDispute.id }
    });
    
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].senderType).toBe("ADMIN");
    expect(messages[0].message).toContain("автоматически закрыт");

    // Clean up
    await db.dealDisputeMessage.deleteMany({
      where: { disputeId: expiredDispute.id }
    });
    await db.dealDispute.delete({
      where: { id: expiredDispute.id }
    });
  });

  test("should not expire disputes within timeout period", async () => {
    // Set dispute timeout to 60 minutes
    await db.systemConfig.upsert({
      where: { key: "disputeDayShiftTimeoutMinutes" },
      update: { value: "60" },
      create: { key: "disputeDayShiftTimeoutMinutes", value: "60" }
    });

    // Create a recent dispute (created 5 minutes ago)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentDispute = await db.dealDispute.create({
      data: {
        dealId: testDeal.id,
        merchantId: testMerchant.id,
        traderId: testTrader.id,
        status: "OPEN",
        createdAt: fiveMinutesAgo
      }
    });

    // Run the service tick
    await (service as any).tick();

    // Check that the dispute was NOT resolved
    const updatedDispute = await db.dealDispute.findUnique({
      where: { id: recentDispute.id }
    });

    expect(updatedDispute?.status).toBe("OPEN");
    expect(updatedDispute?.resolvedAt).toBeFalsy();

    // Clean up
    await db.dealDispute.delete({
      where: { id: recentDispute.id }
    });
  });

  test("should expire withdrawal disputes after timeout", async () => {
    // Set dispute timeout to 1 minute for testing
    await db.systemConfig.upsert({
      where: { key: "disputeNightShiftTimeoutMinutes" },
      update: { value: "1" },
      create: { key: "disputeNightShiftTimeoutMinutes", value: "1" }
    });

    // Create an expired withdrawal dispute (created at night 2 minutes ago)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    twoMinutesAgo.setHours(22); // Set to night time
    
    const expiredDispute = await db.withdrawalDispute.create({
      data: {
        payoutId: testPayout.id,
        merchantId: testMerchant.id,
        traderId: testTrader.id,
        status: "OPEN",
        createdAt: twoMinutesAgo
      }
    });

    // Run the service tick
    await (service as any).tick();

    // Check that the dispute was resolved
    const updatedDispute = await db.withdrawalDispute.findUnique({
      where: { id: expiredDispute.id }
    });

    expect(updatedDispute?.status).toBe("RESOLVED_SUCCESS");
    expect(updatedDispute?.resolution).toContain("автоматически закрыт");

    // Clean up
    await db.withdrawalDisputeMessage.deleteMany({
      where: { disputeId: expiredDispute.id }
    });
    await db.withdrawalDispute.delete({
      where: { id: expiredDispute.id }
    });
  });
});