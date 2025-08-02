import { Elysia, t } from "elysia";
import { db } from "@/db";
import { BankType, MethodType } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { startOfDay, endOfDay } from "date-fns";
import { notifyByStatus } from "@/utils/notify";

/* ---------- DTOs ---------- */
const BtDealDTO = t.Object({
  id: t.String(),
  numericId: t.Number(),
  amount: t.Number(),
  merchantId: t.String(),
  merchantName: t.String(),
  methodType: t.String(),
  bankType: t.String(),
  cardNumber: t.String(),
  recipientName: t.String(),
  status: t.String(),
  type: t.String(),
  createdAt: t.String(),
  updatedAt: t.String(),
  acceptedAt: t.Optional(t.String()),
  completedAt: t.Optional(t.String()),
  expiredAt: t.Optional(t.String()),
  requisiteId: t.String(),
  commission: t.Number(),
  rate: t.Number(),
  btOnly: t.Boolean(),
  traderProfit: t.Union([t.Number(), t.Null()]),
});

const BtRequisiteDTO = t.Object({
  id: t.String(),
  methodType: t.String(),
  bankType: t.String(),
  cardNumber: t.String(),
  recipientName: t.String(),
  phoneNumber: t.Optional(t.String()),
  minAmount: t.Number(),
  maxAmount: t.Number(),
  intervalMinutes: t.Number(),
  isActive: t.Boolean(),
  btOnly: t.Boolean(),
  turnoverDay: t.Number(),
  turnoverTotal: t.Number(),
  createdAt: t.String(),
  updatedAt: t.String(),
  sumLimit: t.Number(),
  operationLimit: t.Number(),
  currentTotalAmount: t.Number(),
  activeDeals: t.Number(),
  transactionsInProgress: t.Number(),
  transactionsReady: t.Number(),
});

/* ---------- helpers ---------- */
const formatBtDeal = (transaction: any) => {
  // Debug log for first transaction
  if (transaction.numericId === transaction.numericId) {
    console.log(`[BT-Deal Format] Deal #${transaction.numericId}: status=${transaction.status}, traderProfit=${transaction.traderProfit}`);
  }
  
  return {
    id: transaction.id,
    numericId: transaction.numericId,
    amount: transaction.amount,
    merchantId: transaction.merchantId,
    merchantName: transaction.merchant?.name || "Unknown",
    methodType: transaction.requisites?.methodType || "UNKNOWN",
    bankType: transaction.requisites?.bankType || "UNKNOWN",
    cardNumber: transaction.requisites?.cardNumber || "****",
    recipientName: transaction.requisites?.recipientName || "Unknown",
    status: transaction.status,
    type: transaction.type,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    acceptedAt: transaction.acceptedAt?.toISOString(),
    completedAt: transaction.completedAt?.toISOString(),
    expiredAt: transaction.expiredAt?.toISOString(),
    requisiteId: transaction.bankDetailId || "",
    commission: transaction.commission || 0,
    rate: transaction.rate || 0,
    btOnly: true, // All deals in this endpoint are BT-only
    traderProfit: transaction.traderProfit,
  };
};

const formatBtRequisite = (requisite: any, turnoverDay = 0, turnoverTotal = 0, additionalData?: any) => {
  return {
    id: requisite.id,
    methodType: requisite.methodType,
    bankType: requisite.bankType,
    cardNumber: requisite.cardNumber,
    recipientName: requisite.recipientName,
    phoneNumber: requisite.phoneNumber || "",
    minAmount: requisite.minAmount,
    maxAmount: requisite.maxAmount,
    intervalMinutes: requisite.intervalMinutes,
    isActive: !requisite.isArchived,
    btOnly: true, // All requisites in this endpoint are BT-only
    turnoverDay,
    turnoverTotal,
    createdAt: requisite.createdAt.toISOString(),
    updatedAt: requisite.updatedAt.toISOString(),
    sumLimit: requisite.sumLimit || 0,
    operationLimit: requisite.operationLimit || 0,
    currentTotalAmount: additionalData?.currentTotalAmount || 0,
    activeDeals: additionalData?.activeDeals || 0,
    transactionsInProgress: additionalData?.transactionsInProgress || 0,
    transactionsReady: additionalData?.transactionsReady || 0,
  };
};

/* ---------- routes ---------- */
export const btEntranceRoutes = new Elysia({ prefix: "/bt-entrance" })
  // Get BT deals (main list)
  .get(
    "/deals",
    async ({ trader, query }) => {
      const page = query.page || 1;
      const limit = query.limit || 50;
      const offset = (page - 1) * limit;

      // Get transactions that use requisites without devices (BT deals)
      const where: any = {
        traderId: trader.id,
        // Проверяем, что транзакция связана с реквизитом
        bankDetailId: { not: null },
      };

      // Add status filter if provided
      if (query.status && query.status !== "all") {
        where.status = query.status;
      }

      // Add search filter if provided
      if (query.search) {
        where.OR = [
          { numericId: { contains: query.search } },
          { amount: { contains: query.search } },
          { merchant: { name: { contains: query.search, mode: "insensitive" } } },
        ];
      }

      console.log("[BT-Entrance] Query where conditions:", JSON.stringify(where, null, 2));
      
      // First fetch all transactions with requisites for this trader
      const allDeals = await db.transaction.findMany({
        where,
        include: {
          merchant: true,
          requisites: true,
        },
        orderBy: { createdAt: "desc" },
      });
      
      // Filter to only include BT deals (requisites without devices)
      const btDeals = allDeals.filter(
        (deal) => deal.requisites?.deviceId === null,
      );
      
      // Apply pagination to filtered results
      const paginatedDeals = btDeals.slice(offset, offset + limit);
      const total = btDeals.length;
      
      console.log(`[BT-Entrance] Found ${paginatedDeals.length} BT deals out of ${allDeals.length} total deals, filtered total: ${total}`);

      return {
        data: paginatedDeals.map(formatBtDeal),
        total,
        page,
        limit,
      };
    },
    {
      tags: ["trader"],
      detail: { summary: "Получить список BT сделок" },
      query: t.Object({
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
      response: {
        200: t.Object({
          data: t.Array(BtDealDTO),
          total: t.Number(),
          page: t.Number(),
          limit: t.Number(),
        }),
        401: ErrorSchema,
        403: ErrorSchema,
      },
    }
  )

  // Update BT deal status
  .patch(
    "/deals/:id/status",
    async ({ trader, params, body, error }) => {
      const deal = await db.transaction.findFirst({
        where: {
          id: params.id,
          traderId: trader.id,
          // Проверяем что транзакция связана с реквизитом
          bankDetailId: { not: null },
        },
        include: {
          requisites: true,
          method: true,
          merchant: true,
        },
      });

      if (!deal) {
        return error(404, { error: "BT сделка не найдена" });
      }
      
      // Ensure it's actually a BT deal (requisite without device)
      if (deal.requisites?.deviceId !== null) {
        return error(404, { error: "Это не BT сделка" });
      }

      // Если статус меняется на READY, нужно выполнить финансовые операции
      if (body.status === "READY" && deal.status !== "READY") {
        const updatedDeal = await db.$transaction(async (prisma) => {
          // Получаем настройки комиссии трейдера
          const traderMerchant = await prisma.traderMerchant.findUnique({
            where: {
              traderId_merchantId_methodId: {
                traderId: deal.traderId,
                merchantId: deal.merchantId,
                methodId: deal.method.id,
              }
            }
          });

          // Рассчитываем прибыль трейдера
          const spentUsdt = deal.rate ? deal.amount / deal.rate : 0;
          const commissionPercent = traderMerchant?.feeIn || 0;
          const traderProfit = Math.round(spentUsdt * (commissionPercent / 100) * 100) / 100;

          console.log(`[BT-Entrance] Manual confirmation: amount=${deal.amount}, rate=${deal.rate}, spentUsdt=${spentUsdt}, commissionPercent=${commissionPercent}, profit=${traderProfit}`);

          // Обновляем транзакцию
          const updated = await prisma.transaction.update({
            where: { id: params.id },
            data: {
              status: body.status,
              acceptedAt: new Date(),
              traderProfit: traderProfit,
            },
          });

          // Обновляем балансы трейдера
          await prisma.user.update({
            where: { id: deal.traderId },
            data: {
              // Уменьшаем замороженный баланс
              frozenUsdt: {
                decrement: deal.frozenUsdtAmount || 0
              },
              // НЕ уменьшаем trustBalance - он уже был уменьшен при заморозке!
              // Увеличиваем прибыль от сделок
              profitFromDeals: {
                increment: traderProfit
              },
              // Увеличиваем доступный баланс на прибыль
              deposit: {
                increment: traderProfit
              }
            }
          });

          return updated;
        });

        // Отправляем колбэк после успешного обновления
        await notifyByStatus({
          id: deal.id,
          status: "READY",
          successUri: deal.successUri,
          failUri: deal.failUri,
          callbackUri: deal.callbackUri,
          amount: deal.amount,
        });

        return formatBtDeal(await db.transaction.findUnique({
          where: { id: params.id },
          include: { merchant: true, requisites: true }
        }));
      }

      // Для других статусов просто обновляем
      const updatedDeal = await db.transaction.update({
        where: { id: params.id },
        data: { 
          status: body.status,
          ...(body.status === "READY" ? { completedAt: new Date() } : {}),
        },
        include: {
          merchant: true,
          requisites: true,
        },
      });

      // Отправляем колбэк для любого статуса
      await notifyByStatus({
        id: updatedDeal.id,
        status: updatedDeal.status,
        successUri: updatedDeal.successUri,
        failUri: updatedDeal.failUri,
        callbackUri: updatedDeal.callbackUri,
        amount: updatedDeal.amount,
      });

      return formatBtDeal(updatedDeal);
    },
    {
      tags: ["trader"],
      detail: { summary: "Обновить статус BT сделки" },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.String(),
      }),
      response: {
        200: BtDealDTO,
        400: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
    }
  )

  // Get BT requisites (additional tab)
  .get(
    "/requisites", 
    async ({ trader, query }) => {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      // Get bank details that don't have devices (BT-only logic)
      const requisites = await db.bankDetail.findMany({
        where: { 
          userId: trader.id,
          deviceId: null, // BT requisites don't have devices
          ...(query.status && query.status !== "all" ? {
            isArchived: query.status === "INACTIVE"
          } : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      const result = await Promise.all(
        requisites.map(async (requisite) => {
          // Calculate daily turnover
          const {
            _sum: { amount: daySum },
          } = await db.transaction.aggregate({
            where: {
              bankDetailId: requisite.id,
              createdAt: { gte: todayStart, lte: todayEnd },
              status: "READY",
            },
            _sum: { amount: true },
          });

          // Calculate total turnover
          const {
            _sum: { amount: totalSum },
          } = await db.transaction.aggregate({
            where: {
              bankDetailId: requisite.id,
              status: "READY",
            },
            _sum: { amount: true },
          });

          // Calculate current total amount for sumLimit
          const currentTotalResult = await db.transaction.aggregate({
            where: {
              bankDetailId: requisite.id,
              status: { in: ["CREATED", "IN_PROGRESS", "READY"] },
            },
            _sum: { amount: true },
          });

          // Count transactions by status
          const transactionsInProgress = await db.transaction.count({
            where: {
              bankDetailId: requisite.id,
              status: "IN_PROGRESS",
            },
          });

          const transactionsReady = await db.transaction.count({
            where: {
              bankDetailId: requisite.id,
              status: "READY",
            },
          });

          const activeDeals = await db.transaction.count({
            where: {
              bankDetailId: requisite.id,
              status: { in: ["CREATED", "IN_PROGRESS"] },
            },
          });

          return formatBtRequisite(requisite, daySum ?? 0, totalSum ?? 0, {
            currentTotalAmount: currentTotalResult._sum.amount || 0,
            activeDeals,
            transactionsInProgress,
            transactionsReady,
          });
        })
      );

      return {
        data: result,
        total: result.length,
      };
    },
    {
      tags: ["trader"],
      detail: { summary: "Получить список BT реквизитов" },
      query: t.Object({
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
      response: {
        200: t.Object({
          data: t.Array(BtRequisiteDTO),
          total: t.Number(),
        }),
        401: ErrorSchema,
        403: ErrorSchema,
      },
    }
  )
  
  // Create BT requisite
  .post(
    "/requisites",
    async ({ trader, body, error }) => {
      // Validate trader limits
      if (body.minAmount < trader.minAmountPerRequisite) {
        return error(400, { 
          error: `Минимальная сумма должна быть не менее ${trader.minAmountPerRequisite}` 
        });
      }
      
      if (body.maxAmount > trader.maxAmountPerRequisite) {
        return error(400, { 
          error: `Максимальная сумма не должна превышать ${trader.maxAmountPerRequisite}` 
        });
      }
      
      if (body.minAmount > body.maxAmount) {
        return error(400, { 
          error: "Минимальная сумма не может быть больше максимальной" 
        });
      }

      // Use bankType as is since frontend should send correct values
      const bankType = body.bankType;

      const requisite = await db.bankDetail.create({
        data: {
          cardNumber: body.cardNumber,
          bankType: bankType as BankType,
          methodType: body.methodType as MethodType,
          recipientName: body.recipientName,
          phoneNumber: body.phoneNumber,
          minAmount: body.minAmount,
          maxAmount: body.maxAmount,
          intervalMinutes: body.intervalMinutes,
          userId: trader.id,
          deviceId: null, // BT requisites don't have devices
          sumLimit: body.sumLimit ?? 0,
          operationLimit: body.operationLimit ?? 0,
        },
      });
      
      return formatBtRequisite(requisite, 0, 0, {
        currentTotalAmount: 0,
        activeDeals: 0,
        transactionsInProgress: 0,
        transactionsReady: 0,
      });
    },
    {
      tags: ["trader"],
      detail: { summary: "Создать BT реквизит" },
      body: t.Object({
        cardNumber: t.String(),
        bankType: t.Enum(BankType),
        methodType: t.Enum(MethodType),
        recipientName: t.String(),
        phoneNumber: t.Optional(t.String()),
        minAmount: t.Number(),
        maxAmount: t.Number(),
        intervalMinutes: t.Number(),
        sumLimit: t.Optional(t.Number()),
        operationLimit: t.Optional(t.Number()),
      }),
      response: { 
        200: BtRequisiteDTO, 
        400: ErrorSchema,
        401: ErrorSchema, 
        403: ErrorSchema 
      },
    }
  )
  
  // Update BT requisite
  .put(
    "/requisites/:id",
    async ({ trader, params, body, error }) => {
      const exists = await db.bankDetail.findFirst({
        where: { 
          id: params.id, 
          userId: trader.id,
          deviceId: null, // Ensure it's a BT requisite
        },
      });

      if (!exists) {
        return error(404, { error: "BT реквизит не найден" });
      }

      // Map TINK to TBANK for consistency if bankType is being updated
      const updateData = {
        ...body,
        sumLimit: body.sumLimit ?? 0,
        operationLimit: body.operationLimit ?? 0,
      };
      
      if (updateData.bankType === 'TINK') {
        updateData.bankType = 'TBANK';
      }

      const requisite = await db.bankDetail.update({
        where: { id: params.id },
        data: updateData,
      });
      
      return formatBtRequisite(requisite, 0, 0, {
        currentTotalAmount: 0,
        activeDeals: 0,
        transactionsInProgress: 0,
        transactionsReady: 0,
      });
    },
    {
      tags: ["trader"],
      detail: { summary: "Обновить BT реквизит" },
      params: t.Object({ id: t.String() }),
      body: t.Partial(
        t.Object({
          cardNumber: t.String(),
          bankType: t.Enum(BankType),
          methodType: t.Enum(MethodType),
          recipientName: t.String(),
          phoneNumber: t.Optional(t.String()),
          minAmount: t.Number(),
          maxAmount: t.Number(),
          intervalMinutes: t.Number(),
          sumLimit: t.Number(),
          operationLimit: t.Number(),
        })
      ),
      response: {
        200: BtRequisiteDTO,
        400: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
    }
  )
  
  // Delete BT requisite
  .delete(
    "/requisites/:id",
    async ({ trader, params, error }) => {
      const exists = await db.bankDetail.findFirst({
        where: { 
          id: params.id, 
          userId: trader.id,
          deviceId: null, // Ensure it's a BT requisite
        },
      });

      if (!exists) {
        return error(404, { error: "BT реквизит не найден" });
      }

      await db.bankDetail.delete({
        where: { id: params.id },
      });

      return { ok: true, message: "BT реквизит удален" };
    },
    {
      tags: ["trader"],
      detail: { summary: "Удалить BT реквизит" },
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({ ok: t.Boolean(), message: t.String() }),
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
    }
  );