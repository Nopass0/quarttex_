import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { db } from "../db";
import { payoutAccountingService } from "../services/payout-accounting.service";
import { PayoutService } from "../services/payout.service";
import { randomUUID } from "crypto";

describe("Payout Accounting Integration Test", () => {
  let testMerchant: any;
  let testTrader: any;
  let testMethod: any;
  const payoutService = PayoutService.getInstance();

  beforeAll(async () => {
    // Create test merchant
    testMerchant = await db.merchant.create({
      data: {
        name: "Test Merchant Integration",
        token: `test-merchant-integration-${randomUUID()}`,
      },
    });

    // Create test method
    testMethod = await db.method.findFirst();
    if (!testMethod) {
      testMethod = await db.method.create({
        data: {
          code: "TEST_METHOD_INT",
          name: "Test Method Integration",
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

    // Create test trader with initial balances
    testTrader = await db.user.create({
      data: {
        email: `test-trader-integration-${randomUUID()}@example.com`,
        password: "password123",
        name: "Test Trader Integration",
        balanceUsdt: 1000, // Initial USDT balance
        balanceRub: 50000, // Initial RUB balance
        payoutBalance: 0, // Not used in new system
        maxSimultaneousPayouts: 5,
      },
    });

    // Create merchant-trader relationship
    await db.traderMerchant.create({
      data: {
        traderId: testTrader.id,
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
    await db.user.delete({
      where: { id: testTrader.id },
    });
    await db.merchant.delete({
      where: { id: testMerchant.id },
    });
  });

  test("Complete payout flow with API integration", async () => {
    // Check initial balances
    const initialTrader = await db.user.findUnique({
      where: { id: testTrader.id },
    });
    expect(initialTrader!.balanceRub).toBe(50000);
    expect(initialTrader!.balanceUsdt).toBe(1000);

    // Create payout using the service (as merchant would)
    const payout = await payoutService.createPayout({
      merchantId: testMerchant.id,
      amount: 20000, // 20,000 RUB
      wallet: "4444555566667777",
      bank: "Raiffeisen",
      isCard: true,
      merchantRate: 100, // 1 USDT = 100 RUB
      direction: "OUT",
      rateDelta: 0,
      feePercent: 3, // 3% fee
    });

    expect(payout.amount).toBe(20000);
    expect(payout.total).toBe(20600); // 20,000 + 3% = 20,600 RUB
    expect(payout.totalUsdt).toBe(206); // 20,600 / 100 = 206 USDT
    expect(payout.sumToWriteOffUSDT).toBeNull(); // Not set until accepted

    // Accept payout (as trader would)
    const acceptedPayout = await payoutAccountingService.acceptPayoutWithAccounting(
      payout.id,
      testTrader.id
    );

    expect(acceptedPayout.status).toBe("ACTIVE");
    expect(acceptedPayout.sumToWriteOffUSDT).toBe(206);

    // Verify RUB was deducted and frozen
    const traderAfterAccept = await db.user.findUnique({
      where: { id: testTrader.id },
    });
    expect(traderAfterAccept!.balanceRub).toBe(30000); // 50,000 - 20,000
    expect(traderAfterAccept!.frozenRub).toBe(20000); // Frozen amount
    expect(traderAfterAccept!.balanceUsdt).toBe(1000); // Unchanged

    // Confirm payout (trader submits proof)
    const confirmedPayout = await payoutService.confirmPayout(
      payout.id,
      testTrader.id,
      ["proof_integration.jpg"]
    );
    expect(confirmedPayout.status).toBe("CHECKING");

    // Complete payout (merchant approves)
    const completedPayout = await payoutAccountingService.completePayoutWithAccounting(
      payout.id,
      testMerchant.id
    );
    expect(completedPayout.status).toBe("COMPLETED");

    // Verify final balances
    const traderFinal = await db.user.findUnique({
      where: { id: testTrader.id },
    });
    expect(traderFinal!.balanceRub).toBe(30000); // RUB consumed, not returned
    expect(traderFinal!.frozenRub).toBe(0); // Unfrozen
    expect(traderFinal!.balanceUsdt).toBe(1206); // 1000 + 206 USDT
    expect(traderFinal!.profitFromPayouts).toBe(6); // 206 - 200 = 6 USDT profit

    // Verify payout record
    const finalPayout = await db.payout.findUnique({
      where: { id: payout.id },
    });
    expect(finalPayout!.sumToWriteOffUSDT).toBe(206);
    expect(finalPayout!.status).toBe("COMPLETED");
  });

  test("Payout redistribution service integration", async () => {
    // Reset trader balance
    await db.user.update({
      where: { id: testTrader.id },
      data: {
        balanceRub: 50000,
        frozenRub: 0,
        balanceUsdt: 1000,
      },
    });

    // Create unassigned payout
    const unassignedPayout = await payoutService.createPayout({
      merchantId: testMerchant.id,
      amount: 15000,
      wallet: "8888999900001111",
      bank: "PostBank",
      isCard: true,
      merchantRate: 100,
      direction: "OUT",
      feePercent: 2,
    });

    expect(unassignedPayout.traderId).toBeNull();
    expect(unassignedPayout.status).toBe("CREATED");

    // The redistribution service should pick it up
    // For testing, we'll manually call the reassign method
    const reassignedPayout = await payoutAccountingService.reassignPayoutWithAccounting(
      unassignedPayout.id,
      testTrader.id
    );

    expect(reassignedPayout.status).toBe("ACTIVE");
    expect(reassignedPayout.traderId).toBe(testTrader.id);
    expect(reassignedPayout.sumToWriteOffUSDT).toBeCloseTo(153, 2); // (15000 + 2%) / 100

    // Verify RUB was deducted
    const traderAfterReassign = await db.user.findUnique({
      where: { id: testTrader.id },
    });
    expect(traderAfterReassign!.balanceRub).toBe(35000); // 50,000 - 15,000
    expect(traderAfterReassign!.frozenRub).toBe(15000);
  });
});