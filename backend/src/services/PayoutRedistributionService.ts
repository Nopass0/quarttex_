import { BaseService } from "./BaseService";
import { db } from "@/db";
import { PayoutStatus, Prisma } from "@prisma/client";
import { broadcastPayoutUpdate } from "@/routes/websocket/payouts";
import { ServiceRegistry } from "./ServiceRegistry";
import { payoutAccountingService } from "./payout-accounting.service";
import type { TelegramService } from "./TelegramService";

interface TraderCandidate {
  id: string;
  email: string;
  balanceRub: number;
  frozenRub: number;
  maxSimultaneousPayouts: number;
  activePayouts: number;
}

export default class PayoutRedistributionService extends BaseService {
  private readonly BATCH_SIZE = 100; // Process payouts in batches
  private isProcessing = false;
  public readonly autoStart = true; // Enable auto-start
  private lastRunTime = 0;
  private readonly RUN_INTERVAL_MS = 30000; // Run every 30 seconds

  constructor() {
    super();
    // Set the tick interval to 5 seconds for checking
    this.interval = 5000;
  }

  protected async onStart(): Promise<void> {
    await this.logInfo("Payout Redistribution Service starting", { runInterval: this.RUN_INTERVAL_MS });
    
    // Run initial redistribution
    await this.redistributePayouts();
    this.lastRunTime = Date.now();
    
    await this.logInfo("Payout Redistribution Service started successfully");
  }

  protected async onStop(): Promise<void> {
    // Wait for current processing to complete
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await this.logInfo("Payout Redistribution Service stopped");
  }

  protected async tick(): Promise<void> {
    // Check if it's time to run redistribution
    const now = Date.now();
    if (now - this.lastRunTime >= this.RUN_INTERVAL_MS) {
      this.lastRunTime = now;
      await this.redistributePayouts();
    }
  }

  private async redistributePayouts(): Promise<void> {
    if (this.isProcessing) {
      await this.logDebug("Redistribution already in progress, skipping");
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();
    let totalAssigned = 0;

    try {
      // Get all unassigned payouts
      const unassignedPayouts = await db.payout.findMany({
        where: {
          status: PayoutStatus.CREATED,
          traderId: null,
          expireAt: {
            gt: new Date() // Not expired
          }
        },
        include: {
          merchant: {
            include: {
              traderMerchants: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc' // Process oldest first
        }
      });

      await this.logDebug(`Found ${unassignedPayouts.length} unassigned payouts`);

      // Process in batches for better performance
      for (let i = 0; i < unassignedPayouts.length; i += this.BATCH_SIZE) {
        const batch = unassignedPayouts.slice(i, i + this.BATCH_SIZE);
        const assignments = await this.processBatch(batch);
        totalAssigned += assignments;
      }

      const duration = Date.now() - startTime;
      await this.logInfo(`Redistribution completed`, {
        totalPayouts: unassignedPayouts.length,
        assigned: totalAssigned,
        durationMs: duration
      });

      // Update service metrics
      await this.updateMetrics({
        lastRunAt: new Date(),
        payoutsProcessed: unassignedPayouts.length,
        payoutsAssigned: totalAssigned,
        processingTimeMs: duration
      });

    } catch (error) {
      await this.logError("Error in redistributePayouts", { error });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBatch(payouts: any[]): Promise<number> {
    let assigned = 0;
    
    // Get all potential traders with their current payout counts
    const traders = await this.getEligibleTraders();
    
    for (const payout of payouts) {
      const trader = await this.findSuitableTrader(payout, traders);
      
      if (trader) {
        try {
          await this.assignPayoutToTrader(payout, trader);
          assigned++;
          
          // Update trader's active payout count in our cache
          trader.activePayouts++;
        } catch (error) {
          await this.logError(`Failed to assign payout ${payout.id}`, { error });
        }
      }
    }
    
    return assigned;
  }

  private async getEligibleTraders(): Promise<TraderCandidate[]> {
    const traders = await db.user.findMany({
      where: {
        banned: false,
        trafficEnabled: true,
        balanceRub: {
          gt: 0 // Has RUB balance for payouts
        }
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
                status: {
                  in: [PayoutStatus.ACTIVE, PayoutStatus.CHECKING]
                }
              }
            }
          }
        }
      }
    });

    return traders.map(trader => ({
      id: trader.id,
      email: trader.email,
      balanceRub: trader.balanceRub,
      frozenRub: trader.frozenRub,
      maxSimultaneousPayouts: trader.maxSimultaneousPayouts,
      activePayouts: trader._count.payouts
    }));
  }

  private async findSuitableTrader(
    payout: any,
    traders: TraderCandidate[]
  ): Promise<TraderCandidate | null> {
    // Filter traders based on criteria
    const eligibleTraders = traders.filter(trader => {
      // Skip if trader has reached simultaneous payout limit
      if (trader.activePayouts >= trader.maxSimultaneousPayouts) {
        return false;
      }

      // Skip if trader doesn't have enough RUB balance
      if (trader.balanceRub < payout.amount) {
        return false;
      }

      // Skip if this was the previous trader (from cancelReason metadata)
      if (payout.cancelReason?.includes(`traderId:${trader.id}`)) {
        return false;
      }

      // Check merchant-trader relationship
      const merchantRelation = payout.merchant.traderMerchants.find(
        (tm: any) => tm.traderId === trader.id
      );

      // Skip if trader is not enabled for this merchant
      if (!merchantRelation?.isMerchantEnabled) {
        return false;
      }

      return true;
    });

    if (eligibleTraders.length === 0) {
      return null;
    }

    // Sort by available balance (descending) and active payouts (ascending)
    eligibleTraders.sort((a, b) => {
      // Prioritize traders with fewer active payouts
      if (a.activePayouts !== b.activePayouts) {
        return a.activePayouts - b.activePayouts;
      }
      // Then by available RUB balance
      return b.balanceRub - a.balanceRub;
    });

    return eligibleTraders[0];
  }

  private async assignPayoutToTrader(
    payout: any,
    trader: TraderCandidate
  ): Promise<void> {
    // Use accounting service for proper balance handling
    const updatedPayout = await payoutAccountingService.reassignPayoutWithAccounting(
      payout.id,
      trader.id
    );

    await this.logInfo(`Assigned payout ${payout.id} to trader ${trader.email}`);

    // Send WebSocket notification
    broadcastPayoutUpdate(
      updatedPayout.id,
      "ACTIVE",
      updatedPayout,
      payout.merchantId,
      trader.id
    );

    // Send specific assignment notification using broadcastPayoutUpdate with custom event
    // The trader will receive this via the standard WebSocket channel
    // Event type "withdrawal:assigned" indicates a new payout was assigned to them

    // Send Telegram notification
    const telegramService = this.getTelegramService();
    if (telegramService) {
      await telegramService.notifyTraderPayoutAssigned(trader.id, updatedPayout);
    }
  }

  private getTelegramService(): TelegramService | null {
    try {
      return ServiceRegistry.getInstance().get<TelegramService>("TelegramService");
    } catch {
      return null;
    }
  }

  private async updateMetrics(metrics: any): Promise<void> {
    try {
      await db.serviceConfig.upsert({
        where: { serviceKey: "payout_redistribution_metrics" },
        create: {
          serviceKey: "payout_redistribution_metrics",
          config: metrics
        },
        update: {
          config: metrics
        }
      });
    } catch (error) {
      await this.logError("Failed to update metrics", { error });
    }
  }

  // Public method for testing performance
  async testPerformance(payoutCount: number = 1000, merchantId?: string): Promise<{ duration: number, assigned: number }> {
    const startTime = Date.now();
    
    // Create test payouts
    const testPayouts = Array.from({ length: payoutCount }, (_, i) => ({
      merchantId: merchantId || "test-merchant",
      amount: 1000 + i,
      amountUsdt: 10 + i / 100,
      total: 1100 + i,
      totalUsdt: 11 + i / 100,
      rate: 100,
      wallet: `test-wallet-${i}`,
      bank: "Test Bank",
      isCard: true,
      status: PayoutStatus.CREATED,
      expireAt: new Date(Date.now() + 3600000),
      acceptanceTime: 5,
      processingTime: 15,
      direction: "OUT" as const
    }));

    // Bulk create
    await db.payout.createMany({
      data: testPayouts
    });

    // Run redistribution
    await this.redistributePayouts();

    const duration = Date.now() - startTime;
    
    // Count assigned
    const assigned = await db.payout.count({
      where: {
        status: PayoutStatus.ACTIVE,
        traderId: { not: null },
        createdAt: { gte: new Date(startTime) }
      }
    });

    // Cleanup
    await db.payout.deleteMany({
      where: {
        wallet: { startsWith: "test-wallet-" }
      }
    });

    return { duration, assigned };
  }
}

// Register service
ServiceRegistry.register("PayoutRedistributionService", PayoutRedistributionService);