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
      
      // Find all payouts that should be expired
      const expiredPayouts = await db.payout.updateMany({
        where: {
          status: "CREATED",
          expireAt: {
            lt: now
          }
        },
        data: {
          status: "EXPIRED"
        }
      });
      
      if (expiredPayouts.count > 0) {
        console.log(`Marked ${expiredPayouts.count} payouts as expired`);
      }
    } catch (error) {
      console.error("Error checking expired payouts:", error);
    }
  }
}