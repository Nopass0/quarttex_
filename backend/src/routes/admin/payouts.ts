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
  );