const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simulate the PayoutRedistributionService logic manually
async function testRedistribution() {
  try {
    console.log('=== MANUAL REDISTRIBUTION TEST ===');
    
    // 1. Get unassigned payouts
    const unassignedPayouts = await prisma.payout.findMany({
      where: {
        status: 'CREATED',
        traderId: null,
        expireAt: { gt: new Date() }
      },
      include: {
        merchant: {
          include: {
            traderMerchants: true
          }
        },
        blacklistEntries: {
          select: { traderId: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Found ${unassignedPayouts.length} unassigned payouts`);
    
    // 2. Get eligible traders
    const traders = await prisma.user.findMany({
      where: {
        banned: false,
        trafficEnabled: true,
        balanceRub: { gt: 0 },
        deposit: { gte: 1000 }
      },
      select: {
        id: true,
        email: true,
        balanceRub: true,
        frozenRub: true,
        maxSimultaneousPayouts: true,
        _count: {
          select: {
            payouts: {
              where: {
                OR: [
                  { status: 'ACTIVE' },
                  { status: 'CHECKING' },
                  { 
                    status: 'CREATED',
                    traderId: { not: null }
                  }
                ]
              }
            }
          }
        },
        payoutFilters: true,
        traderMerchants: {
          select: {
            merchantId: true,
            isMerchantEnabled: true,
            merchant: {
              select: { name: true }
            }
          }
        }
      }
    });
    
    console.log(`Found ${traders.length} eligible traders`);
    
    // 3. Check each trader for each payout
    for (const payout of unassignedPayouts) {
      console.log(`\\n--- Checking payout ${payout.id} (${payout.amount} RUB, ${payout.bank}, isCard: ${payout.isCard}) ---`);
      
      let foundSuitableTrader = false;
      
      for (const trader of traders) {
        console.log(`  Checking trader ${trader.email}:`);
        
        // Check balance
        if (trader.balanceRub < payout.amount) {
          console.log(`    ❌ Insufficient balance: ${trader.balanceRub} < ${payout.amount}`);
          continue;
        }
        
        // Check simultaneous payouts limit
        if (trader._count.payouts >= trader.maxSimultaneousPayouts) {
          console.log(`    ❌ Max simultaneous payouts reached: ${trader._count.payouts} >= ${trader.maxSimultaneousPayouts}`);
          continue;
        }
        
        // Check blacklist
        const isBlacklisted = payout.blacklistEntries?.some(entry => entry.traderId === trader.id);
        if (isBlacklisted) {
          console.log(`    ❌ Trader is blacklisted for this payout`);
          continue;
        }
        
        // Check merchant-trader relationship
        const merchantRelation = trader.traderMerchants.find(tm => tm.merchantId === payout.merchantId);
        if (!merchantRelation?.isMerchantEnabled) {
          console.log(`    ❌ Not enabled for merchant ${payout.merchant.name}`);
          console.log(`    Trader's merchants:`, trader.traderMerchants.map(tm => ({ merchant: tm.merchant.name, enabled: tm.isMerchantEnabled })));
          continue;
        }
        
        // Check filters
        if (trader.payoutFilters) {
          const filters = trader.payoutFilters;
          
          // Check traffic type
          if (filters.trafficTypes && filters.trafficTypes.length > 0) {
            const payoutTrafficType = payout.isCard ? "card" : "sbp";
            if (!filters.trafficTypes.includes(payoutTrafficType)) {
              console.log(`    ❌ Traffic type mismatch: payout is ${payoutTrafficType}, trader accepts [${filters.trafficTypes.join(', ')}]`);
              continue;
            }
          }
          
          // Check bank types
          if (filters.bankTypes && filters.bankTypes.length > 0) {
            const bankNameToEnum = {
              "Сбербанк": "SBERBANK",
              "Т-Банк": "TBANK",
              "ВТБ": "VTB",
              // Add more as needed...
            };
            
            const payoutBankEnum = bankNameToEnum[payout.bank];
            if (!payoutBankEnum || !filters.bankTypes.includes(payoutBankEnum)) {
              console.log(`    ❌ Bank type mismatch: payout bank is ${payout.bank} (${payoutBankEnum}), trader accepts [${filters.bankTypes.join(', ')}]`);
              continue;
            }
          }
          
          // Check max amount
          if (filters.maxPayoutAmount && payout.amount > filters.maxPayoutAmount) {
            console.log(`    ❌ Amount too high: ${payout.amount} > ${filters.maxPayoutAmount}`);
            continue;
          }
        }
        
        console.log(`    ✅ Trader ${trader.email} is suitable for this payout!`);
        foundSuitableTrader = true;
        break;
      }
      
      if (!foundSuitableTrader) {
        console.log(`  🔴 No suitable trader found for payout ${payout.id}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRedistribution();