import { db } from "../db";
import { BaseService } from "./BaseService";

export default class PayoutExpiryService extends BaseService {
  private intervalId: Timer | null = null;
  autoStart = true; // Enable auto-start
  
  constructor() {
    super();
  }
  
  async start() {
    console.log("PayoutExpiryService started");
    
    // Check for expired payouts every minute
    this.intervalId = setInterval(() => {
      this.checkExpiredPayouts();
    }, 60 * 1000); // 1 minute
    
    // Run immediately on start
    await this.checkExpiredPayouts();
  }
  
  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("PayoutExpiryService stopped");
  }
  
  private async checkExpiredPayouts() {
    try {
      const now = new Date();
      
      // Find all CREATED payouts that should be expired (not accepted in time)
      const createdPayoutsToExpire = await db.payout.findMany({
        where: {
          status: "CREATED",
          expireAt: {
            lt: now
          }
        },
        select: {
          id: true,
          traderId: true,
          acceptanceTime: true
        }
      });

      // Process created payouts
      for (const payout of createdPayoutsToExpire) {
        // Calculate new expiration time based on acceptance time
        const newExpireAt = new Date(
          Date.now() + payout.acceptanceTime * 60 * 1000
        );

        if (payout.traderId) {
          // Return to pool and remember previous trader
          await db.payout.update({
            where: { id: payout.id },
            data: {
              traderId: null,
              acceptedAt: null,
              expireAt: newExpireAt,
              // Keep status as CREATED
              status: "CREATED",
              // Track previous trader to prevent reassignment
              previousTraderIds: {
                push: payout.traderId
              }
            }
          });
        } else {
          // No trader assigned - just extend expiration
          await db.payout.update({
            where: { id: payout.id },
            data: {
              expireAt: newExpireAt
            }
          });
        }
      }
      
      // Also find ACTIVE payouts that expired (not confirmed in time)
      const activePayoutsToExpire = await db.payout.findMany({
        where: {
          status: "ACTIVE",
          expireAt: {
            lt: now
          }
        },
        include: {
          trader: true
        }
      });
      
      // Return ACTIVE payouts to pool (disconnect trader and unfreeze balance)
      for (const payout of activePayoutsToExpire) {
        if (payout.traderId) {
          await db.$transaction([
            // Return payout to pool
            db.payout.update({
              where: { id: payout.id },
              data: {
                status: "CREATED",
                traderId: null,
                acceptedAt: null,
                // Reset expiration to original acceptance time
                expireAt: new Date(Date.now() + payout.acceptanceTime * 60 * 1000),
                confirmedAt: null,
                sumToWriteOffUSDT: null,
                // Track previous trader to prevent reassignment
                previousTraderIds: {
                  push: payout.traderId
                }
              }
            }),
            // Unfreeze trader's RUB balance
            db.user.update({
              where: { id: payout.traderId },
              data: {
                frozenRub: { decrement: payout.amount },
                balanceRub: { increment: payout.amount }
              }
            })
          ]);
        }
      }
      
      const totalExpired = createdPayoutsToExpire.length + activePayoutsToExpire.length;
      
      if (totalExpired > 0) {
        console.log(`Processed ${totalExpired} expired payouts:`, {
          created: createdPayoutsToExpire.length,
          active: activePayoutsToExpire.length
        });
      }
    } catch (error) {
      console.error("Error checking expired payouts:", error);
    }
  }
}