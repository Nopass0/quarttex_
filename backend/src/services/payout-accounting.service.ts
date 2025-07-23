import { db } from "../db";
import { PayoutService } from "./payout.service";
import { Prisma } from "@prisma/client";

/**
 * Extension of PayoutService to implement proper accounting
 * This overrides specific methods to handle RUB/USDT conversions
 */
export class PayoutAccountingService {
  private payoutService = PayoutService.getInstance();

  /**
   * Accept payout with proper RUB deduction
   */
  async acceptPayoutWithAccounting(payoutId: string, traderId: string) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
      include: { trader: true },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "CREATED") {
      throw new Error("Payout is not available for acceptance");
    }

    if (payout.traderId) {
      throw new Error("Payout already accepted by another trader");
    }

    // Check if payout expired
    if (new Date() > payout.expireAt) {
      await db.payout.update({
        where: { id: payoutId },
        data: { status: "EXPIRED" },
      });
      throw new Error("Payout has expired");
    }

    // Check trader's RUB balance (not payout balance)
    const trader = await db.user.findUnique({
      where: { id: traderId },
    });

    if (!trader) {
      throw new Error("Trader not found");
    }

    // Calculate sumToWriteOffUSDT: (amount + commission) × rate
    // For payouts, amount is in RUB, we need to check RUB balance
    const amountRUB = payout.amount; // This is already in RUB for payouts
    
    if (trader.balanceRub < amountRUB) {
      throw new Error(`Insufficient RUB balance. Required: ${amountRUB}, Available: ${trader.balanceRub}`);
    }

    // Count current payouts for the trader
    const activePayouts = await db.payout.count({
      where: {
        traderId,
        status: "ACTIVE",
      },
    });

    // Check trader's personal limit
    if (activePayouts >= trader.maxSimultaneousPayouts) {
      throw new Error(`Maximum simultaneous payouts reached (${trader.maxSimultaneousPayouts})`);
    }

    // Calculate sumToWriteOffUSDT from totalUsdt (which already includes fees)
    const sumToWriteOffUSDT = payout.totalUsdt;

    // Accept payout and freeze RUB balance
    const [updatedPayout] = await db.$transaction([
      db.payout.update({
        where: { id: payoutId },
        data: {
          trader: { connect: { id: traderId } },
          acceptedAt: new Date(),
          status: "ACTIVE",
          sumToWriteOffUSDT,
          // Update expiration based on processing time
          expireAt: new Date(Date.now() + payout.processingTime * 60 * 1000),
        },
      }),
      db.user.update({
        where: { id: traderId },
        data: {
          balanceRub: { decrement: amountRUB },
          frozenRub: { increment: amountRUB },
        },
      }),
    ]);

    // Use original service methods for notifications
    await this.payoutService.sendMerchantWebhook(updatedPayout, "ACTIVE");

    return updatedPayout;
  }

  /**
   * Cancel payout with RUB return
   */
  async cancelPayoutWithAccounting(
    payoutId: string,
    traderId: string,
    reason: string,
    reasonCode?: string,
    files?: string[]
  ) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
      include: { merchant: true },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.traderId !== traderId) {
      throw new Error("Unauthorized");
    }

    if (!["ACTIVE", "CHECKING"].includes(payout.status)) {
      throw new Error("Cannot cancel payout in current status");
    }

    const amountRUB = payout.amount;

    // Return payout to pool and unfreeze RUB balance
    const updates: Prisma.PrismaPromise<any>[] = [
      db.payout.update({
        where: { id: payoutId },
        data: {
          status: "CREATED",
          trader: { disconnect: true },
          acceptedAt: null,
          confirmedAt: null,
          cancelReason: reason,
          cancelReasonCode: reasonCode,
          disputeFiles: files || [],
          disputeMessage: reason,
          sumToWriteOffUSDT: null, // Clear the USDT calculation
          // Add trader to previousTraderIds to prevent reassignment
          previousTraderIds: {
            push: traderId,
          },
        },
      }),
      db.user.update({
        where: { id: traderId },
        data: {
          frozenRub: { decrement: amountRUB },
          balanceRub: { increment: amountRUB }, // Return RUB to balance
        },
      }),
    ];

    const [updatedPayout] = await db.$transaction(updates);

    // Use original service methods for notifications
    await this.payoutService.sendMerchantWebhook(updatedPayout, "returned_to_pool");

    return updatedPayout;
  }

  /**
   * Complete payout and add USDT to balance
   */
  async completePayoutWithAccounting(payoutId: string, merchantId: string) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
      include: { trader: true },
    });

    if (!payout || payout.merchantId !== merchantId) {
      throw new Error("Payout not found or unauthorized");
    }

    if (payout.status !== "CHECKING") {
      throw new Error("Payout is not in checking status");
    }

    if (!payout.traderId) {
      throw new Error("No trader assigned to payout");
    }

    const amountRUB = payout.amount;
    const sumToWriteOffUSDT = payout.sumToWriteOffUSDT || payout.totalUsdt;

    // Complete payout: unfreeze RUB (consume it) and add USDT to main balance
    const [updatedPayout] = await db.$transaction([
      db.payout.update({
        where: { id: payoutId },
        data: { status: "COMPLETED" },
      }),
      db.user.update({
        where: { id: payout.traderId },
        data: {
          frozenRub: { decrement: amountRUB }, // Remove from frozen (consume RUB)
          balanceUsdt: { increment: sumToWriteOffUSDT }, // Add USDT to main balance
          profitFromPayouts: { increment: payout.totalUsdt - payout.amountUsdt }, // Track profit
        },
      }),
    ]);

    // Use original service methods for notifications
    await this.payoutService.sendMerchantWebhook(updatedPayout, "COMPLETED");

    return updatedPayout;
  }

  /**
   * Reassign payout to new trader (for redistribution)
   */
  async reassignPayoutWithAccounting(payoutId: string, newTraderId: string) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "CREATED" || payout.traderId !== null) {
      throw new Error("Payout cannot be reassigned in current state");
    }

    // Check new trader's RUB balance
    const trader = await db.user.findUnique({
      where: { id: newTraderId },
    });

    if (!trader) {
      throw new Error("Trader not found");
    }

    const amountRUB = payout.amount;
    
    if (trader.balanceRub < amountRUB) {
      throw new Error(`Insufficient RUB balance. Required: ${amountRUB}, Available: ${trader.balanceRub}`);
    }

    // Calculate sumToWriteOffUSDT
    const sumToWriteOffUSDT = payout.totalUsdt;

    // Assign to new trader and freeze RUB balance
    const [updatedPayout] = await db.$transaction([
      db.payout.update({
        where: { id: payoutId },
        data: {
          trader: { connect: { id: newTraderId } },
          acceptedAt: new Date(),
          status: "ACTIVE",
          sumToWriteOffUSDT,
        },
      }),
      db.user.update({
        where: { id: newTraderId },
        data: {
          balanceRub: { decrement: amountRUB },
          frozenRub: { increment: amountRUB },
        },
      }),
    ]);

    return updatedPayout;
  }
}

// Export singleton instance
export const payoutAccountingService = new PayoutAccountingService();