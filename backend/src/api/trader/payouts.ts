import Elysia, { t } from "elysia";
import { PayoutService } from "../../services/payout.service";
import { payoutAccountingService } from "../../services/payout-accounting.service";
import { db } from "../../db";
import { validateFileUrls } from "../../middleware/fileUploadValidation";

const payoutService = PayoutService.getInstance();

export const traderPayoutsApi = new Elysia({ prefix: "/payouts" })
  // Get payouts list
  .get(
    "/",
    async ({ trader, query, set }) => {

      try {
        const { payouts, total } = await payoutService.getTraderPayouts(
          trader.id,
          {
            status: query.status?.split(",") as any,
            search: query.search,
            limit: query.limit,
            offset: query.offset,
          }
        );

        return {
          success: true,
          payouts: payouts.map((p) => ({
            id: p.numericId,  // Use numericId as the display ID
            uuid: p.id,       // Add the actual UUID for API calls
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
            merchantName: p.merchant.name,
          })),
          total,
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
      }),
    }
  )
  
  // Accept payout
  .post(
    "/:id/accept",
    async ({ params, trader, set }) => {

      try {
        const payout = await payoutAccountingService.acceptPayoutWithAccounting(params.id, trader.id);
        return {
          success: true,
          payout: {
            id: payout.id,
            status: payout.status,
            expireAt: payout.expireAt,
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
  
  // Confirm payout with proof
  .post(
    "/:id/confirm",
    async ({ params, body, trader, set }) => {

      try {
        // Validate proof files
        const validation = validateFileUrls(body.proofFiles);
        if (!validation.valid) {
          set.status = 400;
          return { error: validation.error };
        }
        
        const payout = await payoutService.confirmPayout(
          params.id,
          trader.id,
          body.proofFiles
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
        proofFiles: t.Array(t.String(), { minItems: 1, maxItems: 10 }),
      }),
    }
  )
  
  // Cancel payout
  .post(
    "/:id/cancel",
    async ({ params, body, trader, set }) => {

      try {
        // Validate files if provided
        if (body.files && body.files.length > 0) {
          const validation = validateFileUrls(body.files);
          if (!validation.valid) {
            set.status = 400;
            return { error: validation.error };
          }
        }
        
        const payout = await payoutAccountingService.cancelPayoutWithAccounting(
          params.id,
          trader.id,
          body.reason,
          body.reasonCode,
          body.files || []
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
        reasonCode: t.Optional(t.String()),
        files: t.Optional(t.Array(t.String(), { maxItems: 10 })),
      }),
    }
  )
  
  // Get payout balance
  .get("/balance", async ({ trader, set }) => {
    try {
      const user = await db.user.findUnique({
        where: { id: trader.id },
        select: {
          payoutBalance: true,
          frozenPayoutBalance: true,
        },
      });

      if (!user) {
        set.status = 404;
        return { error: "User not found" };
      }

      return {
        success: true,
        balance: {
          available: user.payoutBalance,
          frozen: user.frozenPayoutBalance,
          total: user.payoutBalance + user.frozenPayoutBalance,
        },
      };
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  })
  
  // Update payout balance
  .put(
    "/balance",
    async ({ body, trader, set }) => {

      const user = await db.user.update({
        where: { id: trader.id },
        data: { payoutBalance: body.balance },
        select: {
          payoutBalance: true,
          frozenPayoutBalance: true,
        },
      });

      return {
        success: true,
        balance: {
          available: user.payoutBalance,
          frozen: user.frozenPayoutBalance,
          total: user.payoutBalance + user.frozenPayoutBalance,
        },
      };
    },
    {
      body: t.Object({
        balance: t.Number({ minimum: 0 }),
      }),
    }
  );