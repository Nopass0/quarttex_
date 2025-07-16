import { Elysia, t } from "elysia";
import { PayoutService } from "../../services/payout.service";
import { db } from "../../db";

const payoutService = PayoutService.getInstance();

export const adminPayoutsRoutes = new Elysia({ prefix: "/payouts" })
  // Get all payouts with filters
  .get(
    "/",
    async ({ query }) => {
      const {
        status,
        direction,
        merchantId,
        traderId,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = query;

      const where: any = {};

      if (status) {
        where.status = { in: status.split(",") };
      }

      if (direction) {
        where.direction = direction;
      }

      if (merchantId) {
        where.merchantId = merchantId;
      }

      if (traderId) {
        where.traderId = traderId;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      const offset = (page - 1) * limit;

      const [payouts, total] = await db.$transaction([
        db.payout.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
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
            rateAudits: {
              orderBy: { timestamp: "desc" },
              take: 5,
            },
          },
        }),
        db.payout.count({ where }),
      ]);

      return {
        success: true,
        data: payouts,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        direction: t.Optional(t.Enum({ IN: "IN", OUT: "OUT" })),
        merchantId: t.Optional(t.String()),
        traderId: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )

  // Get payout details
  .get(
    "/:id",
    async ({ params }) => {
      const payout = await db.payout.findUnique({
        where: { id: params.id },
        include: {
          merchant: true,
          trader: true,
          rateAudits: {
            orderBy: { timestamp: "desc" },
          },
        },
      });

      if (!payout) {
        return { error: "Payout not found" };
      }

      return {
        success: true,
        data: payout,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Adjust payout rate
  .patch(
    "/:id/rate-adjust",
    async ({ params, body, request }) => {
      const adminKey = request.headers.get("x-admin-key");
      if (!adminKey) {
        return { error: "Admin key required" };
      }

      // In a real app, we'd look up the admin by key
      const adminId = adminKey; // Use key as adminId for now

      try {
        const updatedPayout = await payoutService.adjustPayoutRate(
          params.id,
          adminId,
          body.rateDelta,
          body.feePercent
        );

        return {
          success: true,
          data: updatedPayout,
        };
      } catch (error: any) {
        return { error: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        rateDelta: t.Optional(t.Number({ minimum: -20, maximum: 20 })),
        feePercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
      }),
    }
  )

  // Force complete payout
  .post(
    "/:id/force-complete",
    async ({ params }) => {
      const payout = await db.payout.findUnique({
        where: { id: params.id },
        include: { trader: true },
      });

      if (!payout) {
        return { error: "Payout not found" };
      }

      if (payout.status === "COMPLETED") {
        return { error: "Payout already completed" };
      }

      // Update payout status
      const updatedPayout = await db.payout.update({
        where: { id: params.id },
        data: {
          status: "COMPLETED",
          confirmedAt: new Date(),
        },
      });

      // Send webhook
      await payoutService.sendMerchantWebhook(updatedPayout, "COMPLETED");

      return {
        success: true,
        data: updatedPayout,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Force cancel payout
  .post(
    "/:id/force-cancel",
    async ({ params, body }) => {
      const payout = await db.payout.findUnique({
        where: { id: params.id },
      });

      if (!payout) {
        return { error: "Payout not found" };
      }

      if (payout.status === "COMPLETED" || payout.status === "CANCELLED") {
        return { error: "Cannot cancel completed or already cancelled payout" };
      }

      // Update payout status
      const updatedPayout = await db.payout.update({
        where: { id: params.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: body.reason || "Cancelled by admin",
        },
      });

      // Send webhook
      await payoutService.sendMerchantWebhook(updatedPayout, "CANCELLED");

      return {
        success: true,
        data: updatedPayout,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        reason: t.Optional(t.String()),
      }),
    }
  )

  // Approve payout (from CHECKING status)
  .post(
    "/:id/approve",
    async ({ params, set }) => {
      const payout = await db.payout.findUnique({
        where: { id: params.id },
        include: { trader: true },
      });

      if (!payout) {
        set.status = 404;
        return { error: "Payout not found" };
      }

      if (payout.status !== "CHECKING") {
        set.status = 400;
        return { error: "Can only approve payouts in CHECKING status" };
      }

      if (!payout.traderId) {
        set.status = 400;
        return { error: "Payout has no trader assigned" };
      }

      // Update payout status to COMPLETED and unfreeze trader balance
      const [updatedPayout] = await db.$transaction([
        db.payout.update({
          where: { id: params.id },
          data: {
            status: "COMPLETED",
            confirmedAt: new Date(),
          },
        }),
        db.user.update({
          where: { id: payout.traderId },
          data: {
            frozenPayoutBalance: { decrement: payout.total },
          },
        }),
      ]);

      // Send webhook
      await payoutService.sendMerchantWebhook(updatedPayout, "COMPLETED");

      return {
        success: true,
        data: updatedPayout,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Reject payout (from CHECKING status)
  .post(
    "/:id/reject",
    async ({ params, body, set }) => {
      const payout = await db.payout.findUnique({
        where: { id: params.id },
        include: { trader: true },
      });

      if (!payout) {
        set.status = 404;
        return { error: "Payout not found" };
      }

      if (payout.status !== "CHECKING") {
        set.status = 400;
        return { error: "Can only reject payouts in CHECKING status" };
      }

      if (!payout.traderId) {
        set.status = 400;
        return { error: "Payout has no trader assigned" };
      }

      // Update payout status to DISPUTED and return frozen balance to available
      const [updatedPayout] = await db.$transaction([
        db.payout.update({
          where: { id: params.id },
          data: {
            status: "DISPUTED",
            disputeMessage: body.reason,
          },
        }),
        db.user.update({
          where: { id: payout.traderId },
          data: {
            frozenPayoutBalance: { decrement: payout.total },
            payoutBalance: { increment: payout.total },
          },
        }),
      ]);

      // Send webhook
      await payoutService.sendMerchantWebhook(updatedPayout, "DISPUTED");

      return {
        success: true,
        data: updatedPayout,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        reason: t.String({ minLength: 5 }),
      }),
    }
  )

  // Create test payout for trader
  .post(
    "/create-test",
    async ({ body, set }) => {
      try {
        // Check if trader exists
        const trader = await db.user.findUnique({
          where: { id: body.traderId },
          select: { id: true, numericId: true, email: true, payoutBalance: true },
        });

        if (!trader) {
          set.status = 404;
          return { error: "Trader not found" };
        }

        // Check if trader has sufficient balance for OUT payouts
        if (body.direction === "OUT" && trader.payoutBalance < body.amount) {
          set.status = 400;
          return { error: "Insufficient trader balance for OUT payout" };
        }

        // Get or create test merchant
        let merchant = await db.merchant.findFirst({
          where: { name: "Test Merchant" },
        });

        if (!merchant) {
          merchant = await db.merchant.create({
            data: {
              name: "Test Merchant",
              token: `test-merchant-${Date.now()}`,
              callbackUri: "https://test-merchant.com/callback",
              balanceUsdt: 1000000,
              banned: false,
              disabled: false,
            },
          });
        }

        // Calculate expiration time - for test payouts set to next day
        const expireAt = new Date();
        expireAt.setDate(expireAt.getDate() + 1);
        expireAt.setHours(23, 59, 59, 999);

        // Create test payout
        const payout = await db.$transaction(async (tx) => {
          const newPayout = await tx.payout.create({
            data: {
              merchantId: merchant.id,
              traderId: trader.id,
              amount: body.amount,
              amountUsdt: body.amount / (body.rate || 95),
              total: body.amount,
              totalUsdt: body.amount / (body.rate || 95),
              merchantRate: body.rate || 95,
              rate: body.rate || 95,
              feePercent: 0,
              wallet: body.wallet || `7900${Math.floor(Math.random() * 10000000)}`,
              bank: body.bank || "SBER",
              isCard: body.isCard !== undefined ? body.isCard : true,
              direction: body.direction || "OUT",
              status: body.status || "CREATED",
              expireAt,
              processingTime: body.processingTime || 15,
              externalReference: `TEST-${Date.now()}`,
              merchantMetadata: {
                isTest: true,
                createdByAdmin: true,
              },
            },
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

          // For OUT payouts, freeze trader balance if status is ACTIVE or CHECKING
          if (body.direction === "OUT" && (body.status === "ACTIVE" || body.status === "CHECKING")) {
            await tx.user.update({
              where: { id: trader.id },
              data: {
                payoutBalance: { decrement: body.amount },
                frozenPayoutBalance: { increment: body.amount },
              },
            });
          }

          return newPayout;
        });

        return {
          success: true,
          data: payout,
        };
      } catch (error: any) {
        console.error("Failed to create test payout:", error);
        set.status = 500;
        return { error: "Failed to create test payout", details: error.message };
      }
    },
    {
      body: t.Object({
        traderId: t.String({ description: "ID трейдера" }),
        amount: t.Number({ minimum: 100, description: "Сумма в рублях" }),
        rate: t.Optional(t.Number({ minimum: 1, default: 95, description: "Курс USDT/RUB" })),
        wallet: t.Optional(t.String({ description: "Кошелек получателя" })),
        bank: t.Optional(t.String({ description: "Банк получателя" })),
        isCard: t.Optional(t.Boolean({ default: true, description: "Это карта?" })),
        direction: t.Optional(t.Enum({ IN: "IN", OUT: "OUT" }, { default: "OUT" })),
        status: t.Optional(
          t.Enum({
            CREATED: "CREATED",
            ACTIVE: "ACTIVE",
            CHECKING: "CHECKING",
            COMPLETED: "COMPLETED",
            CANCELLED: "CANCELLED",
            DISPUTED: "DISPUTED",
          }, { default: "CREATED" })
        ),
        processingTime: t.Optional(t.Number({ minimum: 5, maximum: 60, default: 15 })),
      }),
    }
  );