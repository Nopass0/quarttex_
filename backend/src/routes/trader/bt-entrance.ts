import { Elysia, t } from "elysia";
import { db } from "@/db";
import { BankType, MethodType } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { startOfDay, endOfDay } from "date-fns";

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
  dailyLimit: t.Number(),
  monthlyLimit: t.Number(),
  intervalMinutes: t.Number(),
  isActive: t.Boolean(),
  btOnly: t.Boolean(),
  turnoverDay: t.Number(),
  turnoverTotal: t.Number(),
  createdAt: t.String(),
  updatedAt: t.String(),
});

/* ---------- helpers ---------- */
const formatBtDeal = (transaction: any) => {
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
  };
};

const formatBtRequisite = (requisite: any, turnoverDay = 0, turnoverTotal = 0) => {
  return {
    id: requisite.id,
    methodType: requisite.methodType,
    bankType: requisite.bankType,
    cardNumber: requisite.cardNumber,
    recipientName: requisite.recipientName,
    phoneNumber: requisite.phoneNumber || "",
    minAmount: requisite.minAmount,
    maxAmount: requisite.maxAmount,
    dailyLimit: requisite.dailyLimit,
    monthlyLimit: requisite.monthlyLimit,
    intervalMinutes: requisite.intervalMinutes,
    isActive: !requisite.isArchived,
    btOnly: true, // All requisites in this endpoint are BT-only
    turnoverDay,
    turnoverTotal,
    createdAt: requisite.createdAt.toISOString(),
    updatedAt: requisite.updatedAt.toISOString(),
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
        // БТ-сделки - это сделки БЕЗ устройства
        deviceId: null,
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
      
      const [deals, total] = await Promise.all([
        db.transaction.findMany({
          where,
          include: {
            merchant: true,
            requisites: true,
          },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        }),
        db.transaction.count({ where }),
      ]);
      
      console.log(`[BT-Entrance] Found ${deals.length} deals, total: ${total}`);

      return {
        data: deals.map(formatBtDeal),
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
          // Проверяем что транзакция связана с реквизитом без устройства
          bankDetailId: { not: null },
          requisites: {
            deviceId: null, // Ensure it's a BT deal
          },
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
              completedAt: new Date(),
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

          return formatBtRequisite(requisite, daySum ?? 0, totalSum ?? 0);
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
          dailyLimit: body.dailyLimit ?? 0,
          monthlyLimit: body.monthlyLimit ?? 0,
          intervalMinutes: body.intervalMinutes,
          userId: trader.id,
          deviceId: null, // BT requisites don't have devices
        },
      });
      
      return formatBtRequisite(requisite, 0, 0);
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
        dailyLimit: t.Optional(t.Number()),
        monthlyLimit: t.Optional(t.Number()),
        intervalMinutes: t.Number(),
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
        dailyLimit: body.dailyLimit ?? 0,
        monthlyLimit: body.monthlyLimit ?? 0,
      };
      
      if (updateData.bankType === 'TINK') {
        updateData.bankType = 'TBANK';
      }

      const requisite = await db.bankDetail.update({
        where: { id: params.id },
        data: updateData,
      });
      
      return formatBtRequisite(requisite, 0, 0);
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
          dailyLimit: t.Number(),
          monthlyLimit: t.Number(),
          intervalMinutes: t.Number(),
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