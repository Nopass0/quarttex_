#!/usr/bin/env bun

import { db } from "../db";

async function debugPayoutAssignment() {
  try {
    // Get unassigned payouts
    const payouts = await db.payout.findMany({
      where: {
        traderId: null,
        status: "CREATED"
      },
      take: 2
    });
    
    console.log(`Found ${payouts.length} unassigned payouts:\n`);
    
    for (const payout of payouts) {
      console.log(`Payout ${payout.numericId}:`);
      console.log(`  Amount: ${payout.amount} RUB`);
      console.log(`  Total: ${payout.total} RUB (with fees)`);
      console.log(`  Total USDT: ${payout.totalUsdt}`);
      console.log(`  Fee %: ${payout.feePercent}`);
      console.log(`  Rate Delta: ${payout.rateDelta}`);
      
      // Find eligible traders
      const traders = await db.user.findMany({
        where: {
          banned: false,
          trafficEnabled: true,
          balanceRub: {
            gte: payout.total
          }
        }
      });
      
      console.log(`\n  Eligible traders with balance >= ${payout.total} RUB:`);
      for (const trader of traders) {
        const activePayouts = await db.payout.count({
          where: {
            traderId: trader.id,
            status: "ACTIVE"
          }
        });
        
        console.log(`    - ${trader.email}: balanceRub=${trader.balanceRub}, activePayouts=${activePayouts}/${trader.maxSimultaneousPayouts}`);
      }
      console.log("");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

debugPayoutAssignment();