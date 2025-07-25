import { db } from "@/db";

async function checkProfitCalculation() {
  console.log("=== Checking profit calculation ===");
  
  // Find a recent transaction
  const transaction = await db.transaction.findFirst({
    where: {
      type: "IN",
      traderId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    include: {
      trader: true,
      merchant: true,
      method: true,
    }
  });

  if (!transaction) {
    console.log("No transactions found");
    return;
  }

  console.log("\nTransaction details:");
  console.log(`- ID: ${transaction.id}`);
  console.log(`- Status: ${transaction.status}`);
  console.log(`- Amount: ${transaction.amount} RUB`);
  console.log(`- Rate: ${transaction.rate}`);
  console.log(`- Merchant Rate: ${transaction.merchantRate}`);
  console.log(`- Frozen USDT: ${transaction.frozenUsdtAmount}`);
  console.log(`- Trader Profit: ${transaction.traderProfit}`);
  
  // Get trader merchant settings
  const traderMerchant = await db.traderMerchant.findUnique({
    where: {
      traderId_merchantId_methodId: {
        traderId: transaction.traderId!,
        merchantId: transaction.merchantId,
        methodId: transaction.methodId,
      }
    }
  });

  console.log(`\nTrader commission settings:`);
  console.log(`- Fee In: ${traderMerchant?.feeIn || 0}%`);

  // Calculate expected profit
  const spentUsdt = transaction.rate ? transaction.amount / transaction.rate : 0;
  const commissionPercent = traderMerchant?.feeIn || 0;
  const expectedProfit = spentUsdt * (commissionPercent / 100);

  console.log(`\nCalculations:`);
  console.log(`- Spent USDT: ${spentUsdt.toFixed(2)}`);
  console.log(`- Commission %: ${commissionPercent}%`);
  console.log(`- Expected profit: ${expectedProfit.toFixed(2)} USDT`);
  console.log(`- Actual profit: ${transaction.traderProfit || 0} USDT`);

  if (transaction.traderProfit === 0 || !transaction.traderProfit) {
    console.log("\n⚠️  PROBLEM: Profit is 0!");
  } else if (Math.abs((transaction.traderProfit || 0) - expectedProfit) > 0.01) {
    console.log("\n⚠️  PROBLEM: Profit mismatch!");
  } else {
    console.log("\n✅ Profit calculation is correct!");
  }

  // Check if rate is set correctly
  if (!transaction.rate) {
    console.log("\n⚠️  PROBLEM: Rate is not set!");
  }

  // Check trader balances
  console.log(`\nTrader balances:`);
  console.log(`- Trust Balance: ${transaction.trader?.trustBalance}`);
  console.log(`- Frozen USDT: ${transaction.trader?.frozenUsdt}`);
  console.log(`- Profit from Deals: ${transaction.trader?.profitFromDeals}`);
  console.log(`- Deposit: ${transaction.trader?.deposit}`);
}

checkProfitCalculation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });