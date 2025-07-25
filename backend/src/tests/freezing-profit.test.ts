import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/db";
import { Status, TransactionType, MethodType, BankType } from "@prisma/client";
import { calculateFreezingParams } from "@/utils/freezing";

describe("Freezing and Profit Calculations", () => {
  let merchantId: string;
  let traderId: string;
  let methodId: string;
  let bankDetailId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await db.user.deleteMany({
      where: { 
        email: { in: ["test-freezing-trader@example.com", "test-freezing-merchant@example.com"] }
      }
    });
    await db.merchant.deleteMany({
      where: { 
        name: "Test Freezing Merchant"
      }
    });

    // Create test merchant
    const merchant = await db.merchant.create({
      data: {
        name: "Test Freezing Merchant",
        token: "test-merchant-token-" + Date.now(),
      },
    });
    merchantId = merchant.id;

    // Create test trader with balance
    const trader = await db.user.create({
      data: {
        email: "test-freezing-trader@example.com",
        password: "test",
        name: "Test Freezing Trader",
        deposit: 0,
        frozenUsdt: 0,
        profitFromDeals: 0,
        trustBalance: 10000, // 10,000 USDT trust balance
        balanceUsdt: 10000,
        balanceRub: 0,
      },
    });
    traderId = trader.id;

    // Create method
    const method = await db.method.create({
      data: {
        name: "Test Method",
        code: "TEST_FREEZING_" + Date.now(),
        type: MethodType.c2c,
        currency: "rub",
        commissionPayin: 0,
        commissionPayout: 0,
        maxPayin: 1000000,
        minPayin: 100,
        maxPayout: 1000000,
        minPayout: 100,
        chancePayin: 100,
        chancePayout: 100,
        isEnabled: true,
      },
    });
    methodId = method.id;

    // Create bank detail
    const bankDetail = await db.bankDetail.create({
      data: {
        userId: traderId,
        cardNumber: "1234567890123456",
        bankType: BankType.SBERBANK,
        methodType: MethodType.CARD,
        recipientName: "Test Recipient",
        isActive: true,
        minAmount: 100,
        maxAmount: 100000,
        dailyLimit: 1000000,
        monthlyLimit: 10000000,
        intervalMinutes: 0,
      },
    });
    bankDetailId = bankDetail.id;

    // Create trader merchant settings with 2% commission
    await db.traderMerchant.create({
      data: {
        traderId: traderId,
        merchantId: merchantId,
        methodId: methodId,
        feeIn: 2, // 2% commission for trader
      },
    });

    // Create KKK setting
    await db.systemConfig.upsert({
      where: { key: "kkk_percent" },
      create: {
        key: "kkk_percent",
        value: "3", // 3% KKK
      },
      update: {
        value: "3",
      },
    });
  });

  afterAll(async () => {
    // Clean up
    try {
      await db.transaction.deleteMany({
        where: { 
          OR: [
            { merchantId },
            { traderId }
          ]
        }
      });
      await db.traderMerchant.deleteMany({
        where: { traderId }
      });
      await db.bankDetail.deleteMany({
        where: { userId: traderId }
      });
      await db.user.deleteMany({
        where: { 
          email: { in: ["test-freezing-trader@example.com", "test-freezing-merchant@example.com"] }
        }
      });
      await db.merchant.deleteMany({
        where: { 
          name: "Test Freezing Merchant"
        }
      });
      await db.method.deleteMany({
        where: { id: methodId }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should correctly calculate freezing with KKK already applied", () => {
    const amount = 10000; // 10,000 RUB
    const rapiraRate = 100; // Base rate from Rapira
    const kkkPercent = 3;
    const feeInPercent = 2;

    // Rapira rate with KKK already applied (100 * 0.97 = 97)
    const rapiraRateWithKkk = rapiraRate * (1 - kkkPercent / 100);
    
    // Direct calculation (as in the code)
    const frozenUsdtAmount = Math.ceil((amount / rapiraRateWithKkk) * 100) / 100;
    const calculatedCommission = Math.ceil((frozenUsdtAmount * feeInPercent / 100) * 100) / 100;
    const totalRequired = frozenUsdtAmount + calculatedCommission;

    // Expected: 10000 / 97 = 103.10 USDT (rounded up)
    // Commission: 103.10 * 0.02 = 2.07 USDT (rounded up)
    // Total: 103.10 + 2.07 = 105.17 USDT
    expect(frozenUsdtAmount).toBe(103.10);
    expect(calculatedCommission).toBe(2.07);
    expect(totalRequired).toBe(105.17);
  });

  it("should correctly calculate trader profit", () => {
    const amount = 10000; // 10,000 RUB
    const rate = 97; // Rapira rate with KKK (saved in transaction)
    const commissionPercent = 2; // 2% trader commission

    // Calculate spent USDT
    const spentUsdt = amount / rate; // 10000 / 97 = 103.09...
    
    // Calculate profit (commission earned by trader, rounded down to 2 decimal places)
    const traderProfit = Math.floor(spentUsdt * (commissionPercent / 100) * 100) / 100;
    
    // Expected: 103.09... * 0.02 = 2.06... → 2.06 (rounded down)
    expect(traderProfit).toBe(2.06);
    expect(traderProfit).toBeGreaterThan(0);
  });

  it("should create transaction and freeze balance correctly", async () => {
    const amount = 10000; // 10,000 RUB
    const rapiraRateWithKkk = 97; // Already includes KKK
    const feeInPercent = 2;

    // Get initial trader balance
    const traderBefore = await db.user.findUnique({
      where: { id: traderId }
    });

    // Calculate freezing params (as in merchant route)
    const frozenUsdtAmount = Math.ceil((amount / rapiraRateWithKkk) * 100) / 100;
    const calculatedCommission = Math.ceil((frozenUsdtAmount * feeInPercent / 100) * 100) / 100;
    const totalRequired = frozenUsdtAmount + calculatedCommission;

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        merchantId,
        traderId,
        methodId,
        bankDetailId,
        amount,
        rate: rapiraRateWithKkk,
        merchantRate: rapiraRateWithKkk,
        frozenUsdtAmount,
        calculatedCommission,
        feeInPercent,
        kkkPercent: 3,
        status: Status.IN_PROGRESS,
        type: TransactionType.IN,
        currency: "RUB",
        orderId: "TEST-001",
        assetOrBank: "1234567890123456",
        userId: "test-user",
        clientName: "Test Client",
        expired_at: new Date(Date.now() + 15 * 60 * 1000),
      }
    });

    // Freeze trader balance
    await db.user.update({
      where: { id: traderId },
      data: {
        frozenUsdt: {
          increment: totalRequired
        }
      }
    });

    // Check trader balance after freezing
    const traderAfter = await db.user.findUnique({
      where: { id: traderId }
    });

    expect(transaction.frozenUsdtAmount).toBe(frozenUsdtAmount);
    expect(transaction.rate).toBe(rapiraRateWithKkk);
    expect(traderAfter!.frozenUsdt).toBe(traderBefore!.frozenUsdt + totalRequired);
    
    console.log("Freezing test results:");
    console.log(`Amount: ${amount} RUB`);
    console.log(`Rate (with KKK): ${rapiraRateWithKkk}`);
    console.log(`Frozen USDT: ${frozenUsdtAmount}`);
    console.log(`Commission: ${calculatedCommission}`);
    console.log(`Total frozen: ${totalRequired}`);
  });

  it("should calculate profit correctly when transaction completes", async () => {
    // Create a new transaction for this test
    const amount = 5000; // 5,000 RUB
    const rapiraRateWithKkk = 97;
    const feeInPercent = 2;
    const frozenUsdtAmount = Math.ceil((amount / rapiraRateWithKkk) * 100) / 100;
    const calculatedCommission = Math.ceil((frozenUsdtAmount * feeInPercent / 100) * 100) / 100;

    const transaction = await db.transaction.create({
      data: {
        merchantId,
        traderId,
        methodId,
        bankDetailId,
        amount,
        rate: rapiraRateWithKkk,
        merchantRate: rapiraRateWithKkk,
        frozenUsdtAmount,
        calculatedCommission,
        feeInPercent,
        kkkPercent: 3,
        status: Status.IN_PROGRESS,
        type: TransactionType.IN,
        currency: "RUB",
        orderId: "TEST-002",
        assetOrBank: "1234567890123456",
        userId: "test-user",
        clientName: "Test Client",
        expired_at: new Date(Date.now() + 15 * 60 * 1000),
      }
    });

    // Get trader merchant settings
    const traderMerchant = await db.traderMerchant.findUnique({
      where: {
        traderId_merchantId_methodId: {
          traderId,
          merchantId,
          methodId,
        }
      }
    });

    // Calculate profit (as in NotificationAutoProcessorService)
    const spentUsdt = transaction.rate ? transaction.amount / transaction.rate : 0;
    const commissionPercent = traderMerchant?.feeIn || 0;
    const traderProfit = Math.floor(spentUsdt * (commissionPercent / 100) * 100) / 100;

    console.log("\nProfit calculation test:");
    console.log(`Transaction amount: ${transaction.amount} RUB`);
    console.log(`Rate: ${transaction.rate}`);
    console.log(`Spent USDT: ${spentUsdt}`);
    console.log(`Commission percent: ${commissionPercent}%`);
    console.log(`Trader profit: ${traderProfit} USDT`);

    expect(transaction.rate).toBe(rapiraRateWithKkk);
    expect(commissionPercent).toBe(2);
    expect(spentUsdt).toBeCloseTo(51.55, 2); // 5000 / 97
    expect(traderProfit).toBe(1.03); // 51.55 * 0.02 = 1.031 → 1.03 (rounded down)
    expect(traderProfit).toBeGreaterThan(0);
  });
});