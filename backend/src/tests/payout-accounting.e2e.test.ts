import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { db } from "../db";
import { payoutAccountingService } from "../services/payout-accounting.service";
import { PayoutService } from "../services/payout.service";
import { randomUUID } from "crypto";

describe("Payout Accounting E2E Tests", () => {
  let testMerchant: any;
  let testTrader1: any;
  let testTrader2: any;
  let testMethod: any;
  const payoutService = PayoutService.getInstance();

  beforeAll(async () => {
    // Create test merchant
    testMerchant = await db.merchant.create({
      data: {
        name: "Test Merchant Accounting",
        token: `test-merchant-accounting-${randomUUID()}`,
      },
    });

    // Create test method
    testMethod = await db.method.findFirst();
    if (!testMethod) {
      testMethod = await db.method.create({
        data: {
          code: "TEST_METHOD",
          name: "Test Method",
          type: "c2c",
          commissionPayin: 1.5,
          commissionPayout: 1.5,
          maxPayin: 1000000,
          minPayin: 100,
          maxPayout: 1000000,
          minPayout: 100,
          chancePayin: 95,
          chancePayout: 95,
        },
      });
    }

    // Create test traders with initial balances
    testTrader1 = await db.user.create({
      data: {
        email: `test-trader1-accounting-${randomUUID()}@example.com`,
        password: "password123",
        name: "Test Trader 1 Accounting",
        balanceUsdt: 1000, // Initial USDT balance
        balanceRub: 50000, // Initial RUB balance
        payoutBalance: 0, // Not used in new system
        maxSimultaneousPayouts: 5,
      },
    });

    testTrader2 = await db.user.create({
      data: {
        email: `test-trader2-accounting-${randomUUID()}@example.com`,
        password: "password123",
        name: "Test Trader 2 Accounting",
        balanceUsdt: 500,
        balanceRub: 30000,
        payoutBalance: 0,
        maxSimultaneousPayouts: 5,
      },
    });

    // Create merchant-trader relationships
    await db.traderMerchant.create({
      data: {
        traderId: testTrader1.id,
        merchantId: testMerchant.id,
        methodId: testMethod.id,
        isMerchantEnabled: true,
      },
    });

    await db.traderMerchant.create({
      data: {
        traderId: testTrader2.id,
        merchantId: testMerchant.id,
        methodId: testMethod.id,
        isMerchantEnabled: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await db.payout.deleteMany({
      where: { merchantId: testMerchant.id },
    });
    await db.traderMerchant.deleteMany({
      where: { merchantId: testMerchant.id },
    });
    await db.user.deleteMany({
      where: {
        id: { in: [testTrader1.id, testTrader2.id] },
      },
    });
    await db.merchant.delete({
      where: { id: testMerchant.id },
    });
  });

  test("Scenario 1: Confirm - Complete payout flow with proper accounting", async () => {
    // Initial balances
    const initialTrader = await db.user.findUnique({
      where: { id: testTrader1.id },
    });
    expect(initialTrader!.balanceRub).toBe(50000);
    expect(initialTrader!.balanceUsdt).toBe(1000);

    // Create payout
    const payout = await payoutService.createPayout({
      merchantId: testMerchant.id,
      amount: 10000, // 10,000 RUB
      wallet: "1234567890123456",
      bank: "Sberbank",
      isCard: true,
      merchantRate: 100,
      direction: "OUT",
      rateDelta: 0,
      feePercent: 2, // 2% fee
    });

    expect(payout.amount).toBe(10000);
    expect(payout.total).toBe(10200); // 10,000 + 2% = 10,200 RUB
    expect(payout.totalUsdt).toBe(102); // 10,200 / 100 = 102 USDT

    // Accept payout
    const acceptedPayout = await payoutAccountingService.acceptPayoutWithAccounting(
      payout.id,
      testTrader1.id
    );

    expect(acceptedPayout.status).toBe("ACTIVE");
    expect(acceptedPayout.sumToWriteOffUSDT).toBe(102);

    // Check trader balance after acceptance
    const traderAfterAccept = await db.user.findUnique({
      where: { id: testTrader1.id },
    });
    expect(traderAfterAccept!.balanceRub).toBe(40000); // 50,000 - 10,000
    expect(traderAfterAccept!.frozenRub).toBe(10000); // Frozen amount
    expect(traderAfterAccept!.balanceUsdt).toBe(1000); // Unchanged

    // Confirm payout (trader submits proof)
    const confirmedPayout = await payoutService.confirmPayout(
      payout.id,
      testTrader1.id,
      ["proof1.jpg"]
    );
    expect(confirmedPayout.status).toBe("CHECKING");

    // Complete payout (merchant approves)
    const completedPayout = await payoutAccountingService.completePayoutWithAccounting(
      payout.id,
      testMerchant.id
    );
    expect(completedPayout.status).toBe("COMPLETED");

    // Check final balances
    const traderFinal = await db.user.findUnique({
      where: { id: testTrader1.id },
    });
    expect(traderFinal!.balanceRub).toBe(40000); // Still 40,000 (RUB consumed)
    expect(traderFinal!.frozenRub).toBe(0); // Unfrozen
    expect(traderFinal!.balanceUsdt).toBe(1102); // 1000 + 102 USDT
    expect(traderFinal!.profitFromPayouts).toBe(2); // 102 - 100 = 2 USDT profit
  });

  test("Scenario 2: Cancel - Payout cancelled and RUB returned", async () => {
    // Reset trader balance
    await db.user.update({
      where: { id: testTrader1.id },
      data: {
        balanceRub: 50000,
        frozenRub: 0,
        balanceUsdt: 1000,
      },
    });

    // Create payout
    const payout = await payoutService.createPayout({
      merchantId: testMerchant.id,
      amount: 15000, // 15,000 RUB
      wallet: "9876543210987654",
      bank: "Tinkoff",
      isCard: true,
      merchantRate: 100,
      direction: "OUT",
      rateDelta: 0,
      feePercent: 1.5, // 1.5% fee
    });

    expect(payout.amount).toBe(15000);
    expect(payout.total).toBe(15225); // 15,000 + 1.5% = 15,225 RUB
    expect(payout.totalUsdt).toBe(152.25); // 15,225 / 100 = 152.25 USDT

    // Accept payout
    const acceptedPayout = await payoutAccountingService.acceptPayoutWithAccounting(
      payout.id,
      testTrader1.id
    );

    expect(acceptedPayout.status).toBe("ACTIVE");
    expect(acceptedPayout.sumToWriteOffUSDT).toBeCloseTo(152.25, 2);

    // Check balance after acceptance
    const traderAfterAccept = await db.user.findUnique({
      where: { id: testTrader1.id },
    });
    expect(traderAfterAccept!.balanceRub).toBe(35000); // 50,000 - 15,000
    expect(traderAfterAccept!.frozenRub).toBe(15000);

    // Cancel payout
    const cancelledPayout = await payoutAccountingService.cancelPayoutWithAccounting(
      payout.id,
      testTrader1.id,
      "Test cancellation",
      "test_cancel"
    );

    expect(cancelledPayout.status).toBe("CREATED"); // Returned to pool
    expect(cancelledPayout.traderId).toBeNull();
    expect(cancelledPayout.sumToWriteOffUSDT).toBeNull();

    // Check RUB returned
    const traderAfterCancel = await db.user.findUnique({
      where: { id: testTrader1.id },
    });
    expect(traderAfterCancel!.balanceRub).toBe(50000); // RUB returned
    expect(traderAfterCancel!.frozenRub).toBe(0); // Unfrozen
    expect(traderAfterCancel!.balanceUsdt).toBe(1000); // USDT unchanged
  });

  test("Scenario 3: Reassign - Payout reassigned to another trader", async () => {
    // Reset trader balances
    await db.user.update({
      where: { id: testTrader1.id },
      data: {
        balanceRub: 20000, // Lower balance
        frozenRub: 0,
        balanceUsdt: 1000,
      },
    });

    await db.user.update({
      where: { id: testTrader2.id },
      data: {
        balanceRub: 30000,
        frozenRub: 0,
        balanceUsdt: 500,
      },
    });

    // Create payout
    const payout = await payoutService.createPayout({
      merchantId: testMerchant.id,
      amount: 25000, // 25,000 RUB (more than trader1 has)
      wallet: "5555666677778888",
      bank: "VTB",
      isCard: true,
      merchantRate: 100,
      direction: "OUT",
      rateDelta: 0,
      feePercent: 2.5, // 2.5% fee
    });

    expect(payout.amount).toBe(25000);
    expect(payout.total).toBe(25625); // 25,000 + 2.5% = 25,625 RUB
    expect(payout.totalUsdt).toBeCloseTo(256.25, 2); // 25,625 / 100 = 256.25 USDT

    // Try to accept with trader1 (should fail due to insufficient balance)
    await expect(
      payoutAccountingService.acceptPayoutWithAccounting(payout.id, testTrader1.id)
    ).rejects.toThrow("Insufficient RUB balance");

    // Accept with trader2 (has enough balance)
    const acceptedPayout = await payoutAccountingService.acceptPayoutWithAccounting(
      payout.id,
      testTrader2.id
    );

    expect(acceptedPayout.status).toBe("ACTIVE");
    expect(acceptedPayout.traderId).toBe(testTrader2.id);
    expect(acceptedPayout.sumToWriteOffUSDT).toBeCloseTo(256.25, 2);

    // Check trader2 balance
    const trader2AfterAccept = await db.user.findUnique({
      where: { id: testTrader2.id },
    });
    expect(trader2AfterAccept!.balanceRub).toBe(5000); // 30,000 - 25,000
    expect(trader2AfterAccept!.frozenRub).toBe(25000);

    // Cancel to simulate reassignment
    const cancelledPayout = await payoutAccountingService.cancelPayoutWithAccounting(
      payout.id,
      testTrader2.id,
      "Reassigning to another trader",
      "reassign"
    );

    expect(cancelledPayout.status).toBe("CREATED");

    // Check trader2 balance restored
    const trader2AfterCancel = await db.user.findUnique({
      where: { id: testTrader2.id },
    });
    expect(trader2AfterCancel!.balanceRub).toBe(30000); // Restored
    expect(trader2AfterCancel!.frozenRub).toBe(0);

    // Now trader1 gets more balance
    await db.user.update({
      where: { id: testTrader1.id },
      data: { balanceRub: 50000 },
    });

    // Reassign to trader1
    const reassignedPayout = await payoutAccountingService.reassignPayoutWithAccounting(
      payout.id,
      testTrader1.id
    );

    expect(reassignedPayout.status).toBe("ACTIVE");
    expect(reassignedPayout.traderId).toBe(testTrader1.id);
    expect(reassignedPayout.sumToWriteOffUSDT).toBeCloseTo(256.25, 2);

    // Check trader1 balance
    const trader1Final = await db.user.findUnique({
      where: { id: testTrader1.id },
    });
    expect(trader1Final!.balanceRub).toBe(25000); // 50,000 - 25,000
    expect(trader1Final!.frozenRub).toBe(25000);
  });

  test("Edge case: Insufficient balance handling", async () => {
    // Set low balance
    await db.user.update({
      where: { id: testTrader1.id },
      data: {
        balanceRub: 5000, // Only 5,000 RUB
        frozenRub: 0,
      },
    });

    // Try to create and accept large payout
    const payout = await payoutService.createPayout({
      merchantId: testMerchant.id,
      amount: 10000, // 10,000 RUB (more than available)
      wallet: "1111222233334444",
      bank: "Alfa",
      isCard: true,
      merchantRate: 100,
      direction: "OUT",
    });

    // Should fail
    await expect(
      payoutAccountingService.acceptPayoutWithAccounting(payout.id, testTrader1.id)
    ).rejects.toThrow("Insufficient RUB balance. Required: 10000, Available: 5000");
  });
});