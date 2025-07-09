import Elysia, { t } from "elysia";
import { PayoutService } from "../../services/payout.service";
import { db } from "../../db";

const payoutService = PayoutService.getInstance();

export const merchantPayoutsApi = new Elysia({ prefix: "/payouts" })
  // Create payout
  .post(
    "/",
    async ({ body, headers, set }) => {
      const token = headers["x-api-key"];
      if (!token) {
        set.status = 401;
        return { error: "API key required" };
      }

      const merchant = await db.merchant.findUnique({
        where: { token },
      });
      if (!merchant) {
        set.status = 401;
        return { error: "Invalid API key" };
      }

      if (merchant.banned || merchant.disabled) {
        set.status = 403;
        return { error: "Merchant is disabled" };
      }

      try {
        const payout = await payoutService.createPayout({
          merchantId: merchant.id,
          amount: body.amount,
          wallet: body.wallet,
          bank: body.bank,
          isCard: body.isCard,
          rate: body.rate,
          processingTime: body.processingTime,
          webhookUrl: body.webhookUrl,
          metadata: body.metadata,
        });

        return {
          success: true,
          payout: {
            id: payout.id,
            numericId: payout.numericId,
            amount: payout.amount,
            amountUsdt: payout.amountUsdt,
            total: payout.total,
            totalUsdt: payout.totalUsdt,
            rate: payout.rate,
            wallet: payout.wallet,
            bank: payout.bank,
            isCard: payout.isCard,
            status: payout.status,
            expireAt: payout.expireAt,
            createdAt: payout.createdAt,
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      body: t.Object({
        amount: t.Number({ minimum: 100 }),
        wallet: t.String({ minLength: 10 }),
        bank: t.String({ minLength: 3 }),
        isCard: t.Boolean(),
        rate: t.Number({ minimum: 1 }),
        processingTime: t.Optional(t.Number({ minimum: 5, maximum: 60 })),
        webhookUrl: t.Optional(t.String({ format: "uri" })),
        metadata: t.Optional(t.Any()),
      }),
    }
  )
  
  // Get payout by ID
  .get(
    "/:id",
    async ({ params, headers, set }) => {
      const token = headers["x-api-key"];
      if (!token) {
        set.status = 401;
        return { error: "API key required" };
      }

      const merchant = await db.merchant.findUnique({
        where: { token },
      });
      if (!merchant) {
        set.status = 401;
        return { error: "Invalid API key" };
      }

      const payout = await payoutService.getPayoutById(params.id);
      if (!payout || payout.merchantId !== merchant.id) {
        set.status = 404;
        return { error: "Payout not found" };
      }

      return {
        success: true,
        payout: {
          id: payout.id,
          numericId: payout.numericId,
          amount: payout.amount,
          amountUsdt: payout.amountUsdt,
          total: payout.total,
          totalUsdt: payout.totalUsdt,
          rate: payout.rate,
          wallet: payout.wallet,
          bank: payout.bank,
          isCard: payout.isCard,
          status: payout.status,
          expireAt: payout.expireAt,
          createdAt: payout.createdAt,
          acceptedAt: payout.acceptedAt,
          confirmedAt: payout.confirmedAt,
          cancelledAt: payout.cancelledAt,
          proofFiles: payout.proofFiles,
          disputeFiles: payout.disputeFiles,
          disputeMessage: payout.disputeMessage,
          cancelReason: payout.cancelReason,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  
  // Approve payout
  .post(
    "/:id/approve",
    async ({ params, headers, set }) => {
      const token = headers["x-api-key"];
      if (!token) {
        set.status = 401;
        return { error: "API key required" };
      }

      const merchant = await db.merchant.findUnique({
        where: { token },
      });
      if (!merchant) {
        set.status = 401;
        return { error: "Invalid API key" };
      }

      try {
        const payout = await payoutService.approvePayout(params.id, merchant.id);
        return {
          success: true,
          payout: {
            id: payout.id,
            status: payout.status,
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  
  // Create dispute
  .post(
    "/:id/dispute",
    async ({ params, body, headers, set }) => {
      const token = headers["x-api-key"];
      if (!token) {
        set.status = 401;
        return { error: "API key required" };
      }

      const merchant = await db.merchant.findUnique({
        where: { token },
      });
      if (!merchant) {
        set.status = 401;
        return { error: "Invalid API key" };
      }

      try {
        const payout = await payoutService.createDispute(
          params.id,
          merchant.id,
          body.files || [],
          body.message
        );
        return {
          success: true,
          payout: {
            id: payout.id,
            status: payout.status,
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        message: t.String({ minLength: 10 }),
        files: t.Optional(t.Array(t.String())),
      }),
    }
  )
  
  // Cancel payout
  .post(
    "/:id/cancel",
    async ({ params, body, headers, set }) => {
      const token = headers["x-api-key"];
      if (!token) {
        set.status = 401;
        return { error: "API key required" };
      }

      const merchant = await db.merchant.findUnique({
        where: { token },
      });
      if (!merchant) {
        set.status = 401;
        return { error: "Invalid API key" };
      }

      try {
        const payout = await payoutService.cancelPayout(
          params.id,
          merchant.id,
          body.reason,
          true
        );
        return {
          success: true,
          payout: {
            id: payout.id,
            status: payout.status,
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
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
  
  // List payouts
  .get(
    "/",
    async ({ query, headers, set }) => {
      const token = headers["x-api-key"];
      if (!token) {
        set.status = 401;
        return { error: "API key required" };
      }

      const merchant = await db.merchant.findUnique({
        where: { token },
      });
      if (!merchant) {
        set.status = 401;
        return { error: "Invalid API key" };
      }

      const { payouts, total } = await payoutService.getMerchantPayouts(
        merchant.id,
        {
          status: query.status?.split(",") as any,
          limit: query.limit,
          offset: query.offset,
        }
      );

      return {
        success: true,
        payouts: payouts.map((p) => ({
          id: p.id,
          numericId: p.numericId,
          amount: p.amount,
          amountUsdt: p.amountUsdt,
          total: p.total,
          totalUsdt: p.totalUsdt,
          rate: p.rate,
          wallet: p.wallet,
          bank: p.bank,
          isCard: p.isCard,
          status: p.status,
          expireAt: p.expireAt,
          createdAt: p.createdAt,
          acceptedAt: p.acceptedAt,
          confirmedAt: p.confirmedAt,
          cancelledAt: p.cancelledAt,
        })),
        total,
        limit: query.limit || 20,
        offset: query.offset || 0,
      };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
      }),
    }
  );