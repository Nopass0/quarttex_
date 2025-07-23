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
        const statusFilter = query.status?.split(",") as any;
        console.log(`🔍 API: trader ${trader.id} requesting payouts with status:`, statusFilter);
        
        const { payouts, total } = await payoutService.getTraderPayouts(
          trader.id,
          {
            status: statusFilter,
            search: query.search,
            limit: query.limit,
            offset: query.offset,
          }
        );
        

        console.log(`📊 API: returning ${payouts.length} payouts to trader ${trader.id}`);
        if (payouts.length > 0) {
          console.log('Sample payouts:', payouts.slice(0, 3).map(p => ({ id: p.numericId, status: p.status, traderId: p.traderId })));
        }

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
        // Check if params.id is a UUID or numeric ID
        let payoutRecord;
        if (params.id.length > 10) {
          // UUID format
          payoutRecord = await db.payout.findFirst({
            where: { id: params.id }
          });
        } else {
          // Numeric ID format
          const numericId = parseInt(params.id);
          payoutRecord = await db.payout.findFirst({
            where: { numericId }
          });
        }
        
        if (!payoutRecord) {
          set.status = 404;
          return { error: "Payout not found" };
        }
        
        const payout = await payoutAccountingService.acceptPayoutWithAccounting(payoutRecord.id, trader.id);
        return {
          success: true,
          payout: {
            id: payout.numericId, // Return numeric ID for frontend
            uuid: payout.id,      // Also return UUID
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
        // Check if params.id is a UUID or numeric ID
        let payoutRecord;
        if (params.id.length > 10) {
          // UUID format
          payoutRecord = await db.payout.findFirst({
            where: { id: params.id }
          });
        } else {
          // Numeric ID format
          const numericId = parseInt(params.id);
          payoutRecord = await db.payout.findFirst({
            where: { numericId }
          });
        }
        
        if (!payoutRecord) {
          set.status = 404;
          return { error: "Payout not found" };
        }
        
        // Validate proof files
        const validation = validateFileUrls(body.proofFiles);
        if (!validation.valid) {
          set.status = 400;
          return { error: validation.error };
        }
        
        const payout = await payoutService.confirmPayout(
          payoutRecord.id,
          trader.id,
          body.proofFiles
        );
        return {
          success: true,
          payout: {
            id: payout.numericId, // Return numeric ID for frontend
            uuid: payout.id,      // Also return UUID
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
        // Check if params.id is a UUID or numeric ID
        let payoutRecord;
        if (params.id.length > 10) {
          // UUID format
          payoutRecord = await db.payout.findFirst({
            where: { id: params.id }
          });
        } else {
          // Numeric ID format
          const numericId = parseInt(params.id);
          payoutRecord = await db.payout.findFirst({
            where: { numericId }
          });
        }
        
        if (!payoutRecord) {
          set.status = 404;
          return { error: "Payout not found" };
        }
        
        // Validate files if provided
        if (body.files && body.files.length > 0) {
          const validation = validateFileUrls(body.files);
          if (!validation.valid) {
            set.status = 400;
            return { error: validation.error };
          }
        }
        
        const payout = await payoutAccountingService.cancelPayoutWithAccounting(
          payoutRecord.id,
          trader.id,
          body.reason,
          body.reasonCode,
          body.files || []
        );
        return {
          success: true,
          payout: {
            id: payout.numericId, // Return numeric ID for frontend
            uuid: payout.id,      // Also return UUID
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
  
  // Get payout details
  .get(
    "/:id",
    async ({ params, trader, set }) => {
      try {
        // Check if params.id is a UUID or numeric ID
        let payoutRecord;
        if (params.id.length > 10) {
          // UUID format
          payoutRecord = await db.payout.findFirst({
            where: { id: params.id },
            include: { merchant: true }
          });
        } else {
          // Numeric ID format
          const numericId = parseInt(params.id);
          payoutRecord = await db.payout.findFirst({
            where: { numericId },
            include: { merchant: true }
          });
        }
        
        if (!payoutRecord) {
          set.status = 404;
          return { error: "Payout not found" };
        }
        
        // Check if trader has access to this payout
        const hasAccess = payoutRecord.traderId === trader.id || 
                         payoutRecord.status === "CREATED";
        
        if (!hasAccess) {
          set.status = 403;
          return { error: "Access denied" };
        }
        
        return {
          success: true,
          payout: {
            id: payoutRecord.numericId,
            uuid: payoutRecord.id,
            amount: payoutRecord.amount,
            amountUsdt: payoutRecord.amountUsdt,
            total: payoutRecord.total,
            totalUsdt: payoutRecord.totalUsdt,
            rate: payoutRecord.rate,
            wallet: payoutRecord.wallet,
            bank: payoutRecord.bank,
            isCard: payoutRecord.isCard,
            status: payoutRecord.status,
            expireAt: payoutRecord.expireAt,
            createdAt: payoutRecord.createdAt,
            acceptedAt: payoutRecord.acceptedAt,
            confirmedAt: payoutRecord.confirmedAt,
            cancelledAt: payoutRecord.cancelledAt,
            merchantName: payoutRecord.merchant.name,
            // Include dispute files from previous traders
            disputeFiles: payoutRecord.disputeFiles || [],
            disputeMessage: payoutRecord.disputeMessage || null,
            cancelReason: payoutRecord.cancelReason || null,
            // Include proof files if trader owns this payout
            proofFiles: payoutRecord.traderId === trader.id ? payoutRecord.proofFiles : [],
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
  
  // Get payout balance
  .get("/balance", async ({ trader, set }) => {
    try {
      const user = await db.user.findUnique({
        where: { id: trader.id },
        select: {
          balanceRub: true,
          frozenRub: true,
        },
      });

      if (!user) {
        set.status = 404;
        return { error: "User not found" };
      }

      return {
        success: true,
        balance: {
          available: user.balanceRub,
          frozen: user.frozenRub,
          total: user.balanceRub + user.frozenRub,
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
        data: { balanceRub: body.balance },
        select: {
          balanceRub: true,
          frozenRub: true,
        },
      });

      return {
        success: true,
        balance: {
          available: user.balanceRub,
          frozen: user.frozenRub,
          total: user.balanceRub + user.frozenRub,
        },
      };
    },
    {
      body: t.Object({
        balance: t.Number({ minimum: 0 }),
      }),
    }
  );