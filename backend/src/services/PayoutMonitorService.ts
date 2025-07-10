import { BaseService } from "./BaseService";
import { ServiceRegistry } from "./ServiceRegistry";
import { db } from "../db";
import type { PayoutService } from "./payout.service";
import type { TelegramService } from "./TelegramService";

export class PayoutMonitorService extends BaseService {
  private static instance: PayoutMonitorService;
  private monitorInterval: Timer | null = null;
  private readonly MONITOR_INTERVAL = 30000; // Check every 30 seconds
  public readonly autoStart = true; // Enable auto-start

  static getInstance(): PayoutMonitorService {
    if (!PayoutMonitorService.instance) {
      PayoutMonitorService.instance = new PayoutMonitorService();
    }
    return PayoutMonitorService.instance;
  }

  private constructor() {
    super();
  }

  private getPayoutService(): PayoutService | null {
    try {
      return ServiceRegistry.getInstance().get<PayoutService>("payout");
    } catch {
      return null;
    }
  }

  private getTelegramService(): TelegramService | null {
    try {
      return ServiceRegistry.getInstance().get<TelegramService>("TelegramService");
    } catch {
      return null;
    }
  }

  async start(): Promise<void> {
    console.log("[PayoutMonitorService] Starting payout monitor service...");
    
    // Run initial check
    await this.checkAndDistributePayouts();
    
    // Set up interval
    this.monitorInterval = setInterval(async () => {
      await this.checkAndDistributePayouts();
    }, this.MONITOR_INTERVAL);
  }

  async stop(): Promise<void> {
    console.log("[PayoutMonitorService] Stopping payout monitor service...");
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  private async checkAndDistributePayouts(): Promise<void> {
    try {
      // Find unassigned payouts that are not expired
      const unassignedPayouts = await db.payout.findMany({
        where: {
          status: "CREATED",
          traderId: null,
          expireAt: {
            gt: new Date(), // Not expired
          },
        },
        include: {
          merchant: true,
        },
        orderBy: {
          createdAt: "asc", // Process oldest first
        },
      });

      if (unassignedPayouts.length === 0) {
        return;
      }

      console.log(`[PayoutMonitorService] Found ${unassignedPayouts.length} unassigned payouts`);


      // Find eligible traders
      const eligibleTraders = await db.user.findMany({
        where: {
          banned: false,
          trafficEnabled: true,
          payoutBalance: {
            gt: 0, // Has some balance
          },
        },
        orderBy: {
          createdAt: "asc", // FIFO distribution
        },
      });

      const telegramService = this.getTelegramService();

      // Process each unassigned payout
      for (const payout of unassignedPayouts) {
        // Find traders who can accept this payout
        const availableTraders = [];

        for (const trader of eligibleTraders) {
          // Check if trader has enough balance
          if (trader.payoutBalance < payout.total) {
            continue;
          }

          // Check trader's current active payout count
          const activeCount = await db.payout.count({
            where: {
              traderId: trader.id,
              status: "ACTIVE",
            },
          });

          // Check personal limit
          if (activeCount >= trader.maxSimultaneousPayouts) {
            continue;
          }

          // This trader is eligible
          availableTraders.push({
            trader,
            activeCount,
          });
        }

        if (availableTraders.length === 0) {
          console.log(`[PayoutMonitorService] No eligible traders for payout ${payout.id}`);
          continue;
        }

        console.log(`[PayoutMonitorService] Found ${availableTraders.length} eligible traders for payout ${payout.id}`);

        // Send notifications to all eligible traders
        if (telegramService) {
          for (const { trader } of availableTraders) {
            try {
              await telegramService.notifyTraderNewPayout(trader.id, payout);
            } catch (error) {
              console.error(`[PayoutMonitorService] Failed to notify trader ${trader.id}:`, error);
            }
          }
        }

        // Log distribution attempt
        console.log(
          `[PayoutMonitorService] Distributed payout ${payout.numericId} to ${availableTraders.length} traders`
        );
      }
    } catch (error) {
      console.error("[PayoutMonitorService] Error in checkAndDistributePayouts:", error);
    }
  }

  // Method to manually trigger distribution for a specific payout
  async distributeSpecificPayout(payoutId: string): Promise<void> {
    try {
      const payout = await db.payout.findUnique({
        where: { id: payoutId },
        include: { merchant: true },
      });

      if (!payout || payout.status !== "CREATED" || payout.traderId) {
        return;
      }


      // Find eligible traders
      const traders = await db.user.findMany({
        where: {
          banned: false,
          trafficEnabled: true,
          payoutBalance: {
            gte: payout.total,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const telegramService = this.getTelegramService();
      let notificationsSent = 0;

      for (const trader of traders) {
        // Check trader's active payout count
        const activeCount = await db.payout.count({
          where: {
            traderId: trader.id,
            status: "ACTIVE",
          },
        });

        // Check personal limit
        if (activeCount >= trader.maxSimultaneousPayouts) {
          continue;
        }

        // Send notification
        if (telegramService) {
          try {
            await telegramService.notifyTraderNewPayout(trader.id, payout);
            notificationsSent++;
          } catch (error) {
            console.error(`[PayoutMonitorService] Failed to notify trader ${trader.id}:`, error);
          }
        }
      }

      console.log(
        `[PayoutMonitorService] Sent ${notificationsSent} notifications for payout ${payout.numericId}`
      );
    } catch (error) {
      console.error("[PayoutMonitorService] Error in distributeSpecificPayout:", error);
    }
  }
}

// Register service
ServiceRegistry.register("PayoutMonitorService", PayoutMonitorService.getInstance());

export default PayoutMonitorService;