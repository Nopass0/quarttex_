#!/usr/bin/env bun

import { db } from "../db";
import { payoutAccountingService } from "../services/payout-accounting.service";

async function testAcceptPayout() {
  try {
    // Find trader
    const trader = await db.user.findFirst({
      where: { email: "trader@test.com" }
    });
    
    if (!trader) {
      console.log("Trader not found");
      return;
    }
    
    // Find unassigned payout
    const payout = await db.payout.findFirst({
      where: {
        traderId: null,
        status: "CREATED"
      },
      orderBy: { createdAt: "asc" }
    });
    
    if (!payout) {
      console.log("No unassigned payouts found");
      return;
    }
    
    console.log(`\nTrader ${trader.email} accepting payout ${payout.numericId}...`);
    console.log(`Payout amount: ${payout.amount} RUB`);
    console.log(`Total with fees: ${payout.total} RUB`);
    console.log(`Trader balance before: ${trader.balanceRub} RUB`);
    
    try {
      // Accept payout
      const result = await payoutAccountingService.acceptPayoutWithAccounting(payout.id, trader.id);
      
      console.log("\nPayout accepted successfully!");
      console.log(`Status: ${result.status}`);
      console.log(`Accepted at: ${result.acceptedAt}`);
      
      // Check updated trader balance
      const updatedTrader = await db.user.findUnique({
        where: { id: trader.id }
      });
      
      console.log(`\nTrader balance after:`);
      console.log(`  Balance RUB: ${updatedTrader?.balanceRub}`);
      console.log(`  Frozen RUB: ${updatedTrader?.frozenRub}`);
      
    } catch (error: any) {
      console.error("\nFailed to accept payout:", error.message);
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testAcceptPayout();