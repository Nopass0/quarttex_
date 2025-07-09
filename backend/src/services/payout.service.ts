import { db } from "../db";
import type { Payout, PayoutStatus, Prisma } from "@prisma/client";
import { ServiceRegistry } from "./ServiceRegistry";

export class PayoutService {
  private static instance: PayoutService;
  
  static getInstance(): PayoutService {
    if (!PayoutService.instance) {
      PayoutService.instance = new PayoutService();
    }
    return PayoutService.instance;
  }
  /**
   * Create a new payout request from merchant
   */
  async createPayout({
    merchantId,
    amount,
    wallet,
    bank,
    isCard,
    rate,
    processingTime = 15,
    webhookUrl,
    metadata,
  }: {
    merchantId: string;
    amount: number;
    wallet: string;
    bank: string;
    isCard: boolean;
    rate: number;
    processingTime?: number;
    webhookUrl?: string;
    metadata?: any;
  }) {
    // Calculate USDT amounts
    const amountUsdt = amount / rate;
    
    // Get merchant to check commission settings
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    });
    
    if (!merchant) {
      throw new Error("Merchant not found");
    }
    
    // Calculate fees (2% for now, should be from merchant settings)
    const feePercent = 0.02;
    const feeRub = amount * feePercent;
    const total = amount + feeRub;
    const totalUsdt = total / rate;
    
    // Create payout with expiration time
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + processingTime);
    
    const payout = await db.payout.create({
      data: {
        merchantId,
        amount,
        amountUsdt,
        total,
        totalUsdt,
        rate,
        wallet,
        bank,
        isCard,
        expireAt,
        processingTime,
        merchantWebhookUrl: webhookUrl,
        merchantMetadata: metadata,
      },
    });
    
    // Distribute to available traders
    await this.distributePayoutToTraders(payout);
    
    return payout;
  }
  
  /**
   * Distribute payout to available traders based on filters
   */
  private async distributePayoutToTraders(payout: Payout) {
    // Find eligible traders
    const traders = await db.user.findMany({
      where: {
        banned: false,
        trafficEnabled: true,
        payoutBalance: {
          gte: payout.total, // Has enough balance
        },
        // TODO: Add filters for traffic type and banks
      },
      orderBy: {
        createdAt: "asc", // FIFO distribution
      },
    });
    
    // For now, just log - real implementation would send notifications
    console.log(`Distributing payout ${payout.id} to ${traders.length} eligible traders`);
  }
  
  /**
   * Trader accepts a payout
   */
  async acceptPayout(payoutId: string, traderId: string) {
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
    
    // Check trader's payout balance
    const trader = await db.user.findUnique({
      where: { id: traderId },
    });
    
    if (!trader || trader.payoutBalance < payout.total) {
      throw new Error("Insufficient payout balance");
    }
    
    // Check simultaneous payouts limit
    const activePayouts = await db.payout.count({
      where: {
        traderId,
        status: { in: ["ACTIVE", "CHECKING"] },
      },
    });
    
    if (activePayouts >= trader.maxSimultaneousPayouts) {
      throw new Error("Maximum simultaneous payouts reached");
    }
    
    // Accept payout and freeze balance
    const [updatedPayout] = await db.$transaction([
      db.payout.update({
        where: { id: payoutId },
        data: {
          traderId,
          acceptedAt: new Date(),
          status: "ACTIVE",
          // Update expiration based on processing time
          expireAt: new Date(Date.now() + payout.processingTime * 60 * 1000),
        },
      }),
      db.user.update({
        where: { id: traderId },
        data: {
          payoutBalance: { decrement: payout.total },
          frozenPayoutBalance: { increment: payout.total },
        },
      }),
    ]);
    
    return updatedPayout;
  }
  
  /**
   * Trader confirms payout with proof
   */
  async confirmPayout(
    payoutId: string,
    traderId: string,
    proofFiles: string[]
  ) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });
    
    if (!payout || payout.traderId !== traderId) {
      throw new Error("Payout not found or unauthorized");
    }
    
    if (payout.status !== "ACTIVE") {
      throw new Error("Payout is not active");
    }
    
    const updatedPayout = await db.payout.update({
      where: { id: payoutId },
      data: {
        status: "CHECKING",
        proofFiles,
        confirmedAt: new Date(),
      },
    });
    
    // Send webhook to merchant
    if (payout.merchantWebhookUrl) {
      await this.sendMerchantWebhook(updatedPayout, "checking");
    }
    
    return updatedPayout;
  }
  
  /**
   * Merchant approves payout
   */
  async approvePayout(payoutId: string, merchantId: string) {
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
    
    // Complete payout and release frozen balance to trader's USDT balance
    const [updatedPayout] = await db.$transaction([
      db.payout.update({
        where: { id: payoutId },
        data: { status: "COMPLETED" },
      }),
      db.user.update({
        where: { id: payout.traderId },
        data: {
          frozenPayoutBalance: { decrement: payout.total },
          balanceUsdt: { increment: payout.totalUsdt },
          profitFromPayouts: { increment: payout.totalUsdt - payout.amountUsdt },
        },
      }),
    ]);
    
    return updatedPayout;
  }
  
  /**
   * Cancel payout
   */
  async cancelPayout(
    payoutId: string,
    userId: string,
    reason: string,
    isMerchant = false
  ) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });
    
    if (!payout) {
      throw new Error("Payout not found");
    }
    
    // Check authorization
    if (isMerchant && payout.merchantId !== userId) {
      throw new Error("Unauthorized");
    }
    
    if (!isMerchant && payout.traderId !== userId) {
      throw new Error("Unauthorized");
    }
    
    if (payout.status === "COMPLETED" || payout.status === "CANCELLED") {
      throw new Error("Cannot cancel completed or already cancelled payout");
    }
    
    // If trader had accepted, return frozen balance
    let updates: Prisma.PrismaPromise<any>[] = [
      db.payout.update({
        where: { id: payoutId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      }),
    ];
    
    if (payout.traderId && payout.status !== "CREATED") {
      updates.push(
        db.user.update({
          where: { id: payout.traderId },
          data: {
            frozenPayoutBalance: { decrement: payout.total },
            payoutBalance: { increment: payout.total },
          },
        })
      );
    }
    
    const [updatedPayout] = await db.$transaction(updates);
    
    // Send webhook to merchant
    if (payout.merchantWebhookUrl) {
      await this.sendMerchantWebhook(updatedPayout, "cancelled");
    }
    
    return updatedPayout;
  }
  
  /**
   * Create dispute for payout
   */
  async createDispute(
    payoutId: string,
    merchantId: string,
    disputeFiles: string[],
    disputeMessage: string
  ) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });
    
    if (!payout || payout.merchantId !== merchantId) {
      throw new Error("Payout not found or unauthorized");
    }
    
    if (payout.status !== "CHECKING") {
      throw new Error("Can only dispute payouts in checking status");
    }
    
    const updatedPayout = await db.payout.update({
      where: { id: payoutId },
      data: {
        status: "DISPUTED",
        disputeFiles,
        disputeMessage,
      },
    });
    
    return updatedPayout;
  }
  
  /**
   * Get payouts for trader
   */
  async getTraderPayouts(
    traderId: string,
    filters: {
      status?: PayoutStatus[];
      search?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: Prisma.PayoutWhereInput = {
      OR: [
        { traderId },
        { 
          traderId: null,
          status: "CREATED",
        },
      ],
    };
    
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    
    if (filters.search) {
      where.OR = [
        { wallet: { contains: filters.search, mode: "insensitive" } },
        { bank: { contains: filters.search, mode: "insensitive" } },
        { numericId: parseInt(filters.search) || 0 },
      ];
    }
    
    const [payouts, total] = await db.$transaction([
      db.payout.findMany({
        where,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit || 20,
        skip: filters.offset || 0,
      }),
      db.payout.count({ where }),
    ]);
    
    return { payouts, total };
  }
  
  /**
   * Get payout by ID
   */
  async getPayoutById(payoutId: string) {
    return db.payout.findUnique({
      where: { id: payoutId },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
        trader: {
          select: {
            id: true,
            numericId: true,
            email: true,
          },
        },
      },
    });
  }
  
  /**
   * Get merchant payouts
   */
  async getMerchantPayouts(
    merchantId: string,
    filters: {
      status?: PayoutStatus[];
      limit?: number;
      offset?: number;
    }
  ) {
    const where: Prisma.PayoutWhereInput = {
      merchantId,
    };
    
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    
    const [payouts, total] = await db.$transaction([
      db.payout.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters.limit || 20,
        skip: filters.offset || 0,
      }),
      db.payout.count({ where }),
    ]);
    
    return { payouts, total };
  }
  
  /**
   * Send webhook to merchant
   */
  private async sendMerchantWebhook(payout: Payout, event: string) {
    if (!payout.merchantWebhookUrl) return;
    
    try {
      const response = await fetch(payout.merchantWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event,
          payout: {
            id: payout.id,
            numericId: payout.numericId,
            status: payout.status,
            amount: payout.amount,
            amountUsdt: payout.amountUsdt,
            wallet: payout.wallet,
            bank: payout.bank,
            proofFiles: payout.proofFiles,
            disputeFiles: payout.disputeFiles,
            disputeMessage: payout.disputeMessage,
            cancelReason: payout.cancelReason,
            metadata: payout.merchantMetadata,
          },
        }),
      });
      
      if (!response.ok) {
        console.error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to send webhook:", error);
    }
  }
}

// Register the service instance
ServiceRegistry.register("payout", PayoutService.getInstance());