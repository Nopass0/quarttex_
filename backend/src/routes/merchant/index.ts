// src/routes/merchant/index.ts
import { Elysia, t } from "elysia";
import { db } from "@/db";
import {
  Prisma,
  Status,
  TransactionType,
  MethodType,
  Currency,
  BankType,
} from "@prisma/client";
import ErrorSchema from "@/types/error";
import { merchantGuard } from "@/middleware/merchantGuard";
import { endOfDay, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import authRoutes from "./auth";
import dashboardRoutes from "./dashboard";
import apiDocsRoutes from "./api-docs";
import tradersRoutes from "./traders";
import { disputesRoutes } from "./disputes";
import { dealDisputesRoutes } from "./deal-disputes";
import { calculateFreezingParams } from "@/utils/freezing";
import { merchantPayoutsApi } from "@/api/merchant/payouts";
import { validateFileUpload } from "@/middleware/fileUploadValidation";

export default (app: Elysia) =>
  app
    // Публичные маршруты аутентификации (без merchantGuard)
    .group("/auth", (app) => app.use(authRoutes))
    
    // Защищенные маршруты дашборда (с merchantSessionGuard)
    .group("/dashboard", (app) => app.use(dashboardRoutes))
    
    // Защищенные маршруты API документации (с merchantSessionGuard)
    .group("/api-docs", (app) => app.use(apiDocsRoutes))
    
    // Deal dispute routes (с merchantSessionGuard)
    .use(dealDisputesRoutes)
    
    // Основные API маршруты (с merchantGuard для API ключа)
    .use(merchantGuard())
    
    // Traders routes
    .group("/traders", (app) => app.use(tradersRoutes))
    
    // Payout API routes
    .use(merchantPayoutsApi)
    
    // Dispute routes
    .use(disputesRoutes)

    /* ──────── GET /merchant/connect ──────── */
    .get(
      "/connect",
      async ({ merchant }) => {
        // merchant уже проверен в merchantGuard
        //get all transaction count for this merchant
        const transactions = await db.transaction.count({
          where: { merchantId: merchant.id },
        });
        //paid
        const paid = await db.transaction.count({
          where: { merchantId: merchant.id, status: Status.READY },
        });
        return {
          id: String(merchant.id), // bigint → string
          name: merchant.name,
          createdAt: merchant.createdAt.toISOString(),
          totalTx: transactions,
          paidTx: paid,
        };
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение информации о мерчанте" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        response: {
          200: t.Object({
            id: t.String({ description: "ID мерчанта" }),
            name: t.String({ description: "Название мерчанта" }),
            createdAt: t.String({ description: "Дата создания мерчанта" }),
            totalTx: t.Number({ description: "Всего транзакций" }),
            paidTx: t.Number({ description: "Транзакций со статусом READY" }),
          }),
          401: ErrorSchema,
        },
      },
    )

    /* ──────── GET /merchant/balance ──────── */
    .get(
      "/balance",
      async ({ merchant }) => ({ balance: merchant.balanceUsdt }),
      {
        tags: ["merchant"],
        detail: { summary: "Получение текущего баланса мерчанта" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        response: {
          200: t.Object({ balance: t.Number() }),
          401: ErrorSchema,
        },
      },
    )

    /* ──────── PATCH /merchant/transactions/by-order-id/:orderId/cancel ──────── */
    .patch(
      "/transactions/by-order-id/:orderId/cancel",
      async ({ params, merchant, error }) => {
        // merchant уже проверен в merchantGuard
        // Ищем транзакцию по orderId
        const transaction = await db.transaction.findFirst({
          where: { orderId: params.orderId, merchantId: merchant.id },
        });

        if (!transaction) {
          return error(404, { error: "Транзакция не найдена" });
        }

        // Проверяем, можно ли отменить транзакцию
        if (
          transaction.status === Status.EXPIRED ||
          transaction.status === Status.CANCELED
        ) {
          return error(400, {
            error: "Невозможно отменить завершенную транзакцию",
          });
        }

        const updated = await db.$transaction(async (prisma) => {
          const tx = await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: Status.CANCELED },
            include: {
              trader: true,
            }
          });

          // Размораживаем средства для IN транзакций при отмене
          if (tx.type === 'IN' && tx.traderId && tx.frozenUsdtAmount && tx.calculatedCommission) {
            const totalToUnfreeze = tx.frozenUsdtAmount + tx.calculatedCommission;
            
            await prisma.user.update({
              where: { id: tx.traderId },
              data: {
                frozenUsdt: { decrement: totalToUnfreeze }
              }
            });
          }

          return tx;
        });

        return {
          success: true,
          transaction: {
            id: updated.id,
            numericId: updated.numericId,
            merchantId: updated.merchantId,
            amount: updated.amount,
            assetOrBank: updated.assetOrBank,
            orderId: updated.orderId,
            methodId: updated.methodId,
            currency: updated.currency,
            userId: updated.userId,
            userIp: updated.userIp,
            callbackUri: updated.callbackUri,
            successUri: updated.successUri,
            failUri: updated.failUri,
            type: updated.type,
            expired_at: updated.expired_at.toISOString(),
            commission: updated.commission,
            clientName: updated.clientName,
            status: updated.status,
            rate: updated.rate,
            traderId: updated.traderId,
            isMock: updated.isMock,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          },
        };
      },
      {
        tags: ["merchant"],
        detail: { summary: "Отмена транзакции по orderId" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        params: t.Object({
          orderId: t.String({ description: "Order ID транзакции" }),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            transaction: t.Object({
              id: t.String(),
              numericId: t.Number(),
              merchantId: t.String(),
              amount: t.Number(),
              assetOrBank: t.String(),
              orderId: t.String(),
              methodId: t.String(),
              currency: t.Union([t.String(), t.Null()]),
              userId: t.String(),
              userIp: t.Union([t.String(), t.Null()]),
              callbackUri: t.String(),
              successUri: t.String(),
              failUri: t.String(),
              type: t.String(),
              expired_at: t.String(),
              commission: t.Number(),
              clientName: t.String(),
              status: t.String(),
              rate: t.Union([t.Number(), t.Null()]),
              traderId: t.Union([t.String(), t.Null()]),
              isMock: t.Boolean(),
              createdAt: t.String(),
              updatedAt: t.String(),
            }),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          401: ErrorSchema,
        },
      },
    )

    /* ──────── GET /merchant/transactions/status/:id ──────── */
    .get(
      "/transactions/status/:id",
      async ({ params, merchant, error }) => {
        // merchant уже проверен в merchantGuard
        try {
          const transaction = await db.transaction.findUniqueOrThrow({
            where: { id: params.id, merchantId: merchant.id },
            select: {
              id: true,
              orderId: true,
              amount: true,
              status: true,
              type: true,
              createdAt: true,
              updatedAt: true,
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                },
              },
            },
          });

          return {
            ...transaction,
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString(),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Транзакция не найдена" });
          throw e;
        }
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение статуса транзакции по ID" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        params: t.Object({ id: t.String({ description: "ID транзакции" }) }),
        response: {
          200: t.Object({
            id: t.String(),
            orderId: t.String(),
            amount: t.Number(),
            status: t.Enum(Status),
            type: t.Enum(TransactionType),
            createdAt: t.String(),
            updatedAt: t.String(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
            }),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      },
    )

    /* ──────── GET /merchant/transactions/list ──────── */
    .get(
      "/transactions/list",
      async ({ query, merchant, error }) => {
        // merchant уже проверен в merchantGuard
        const where: Prisma.TransactionWhereInput = {
          merchantId: merchant.id,
          ...(query.status && { status: query.status as Status }),
          ...(query.type && { type: query.type as TransactionType }),
          ...(query.methodId && { methodId: query.methodId }),
          ...(query.orderId && { orderId: query.orderId }),
        };

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
          db.transaction.findMany({
            where,
            select: {
              id: true,
              orderId: true,
              amount: true,
              status: true,
              type: true,
              createdAt: true,
              updatedAt: true,
              isMock: true,
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                },
              },
            },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          db.transaction.count({ where }),
        ]);

        // Convert dates to ISO strings
        const data = transactions.map((tx) => ({
          ...tx,
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
          isMock: tx.isMock,
        }));

        return {
          data,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        };
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение списка транзакций мерчанта" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          type: t.Optional(t.String()),
          methodId: t.Optional(t.String()),
          orderId: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.String(),
                orderId: t.String(),
                amount: t.Number(),
                status: t.Enum(Status),
                type: t.Enum(TransactionType),
                createdAt: t.String(),
                updatedAt: t.String(),
                isMock: t.Boolean(),
                method: t.Object({
                  id: t.String(),
                  code: t.String(),
                  name: t.String(),
                  type: t.Enum(MethodType),
                  currency: t.Enum(Currency),
                }),
              }),
            ),
            pagination: t.Object({
              total: t.Number(),
              page: t.Number(),
              limit: t.Number(),
              pages: t.Number(),
            }),
          }),
          401: ErrorSchema,
        },
      },
    )

    /* ──────────────────────────────────────────────────────────────────────────
     *  POST /merchant/transactions/create
     *  ─ Создание транзакции (IN/OUT) с автоматическим подбором реквизита для IN.
     * ------------------------------------------------------------------------*/
    .post(
      "/transactions/create",
      async ({ body, merchant, set, error }) => {
        // По умолчанию тип транзакции IN
        const type = body.type || TransactionType.IN;
        
        // Генерируем значения по умолчанию для необязательных полей
        const userId = body.userId || `user_${Date.now()}`;
        const expired_at = body.expired_at ? new Date(body.expired_at) : new Date(Date.now() + 86_400_000);
        
        const recordMilk = async (msg: string) => {
          try {
            await db.transaction.create({
              data: {
                merchantId: merchant.id,
                amount: body.amount,
                assetOrBank: "", // Будет заполнено позже
                orderId: body.orderId,
                methodId: body.methodId,
                currency: "RUB", // По умолчанию RUB
                userId: userId,
                userIp: body.userIp || null,
                callbackUri: body.callbackUri || "",
                successUri: body.successUri || "",
                failUri: body.failUri || "",
                type: type,
                expired_at: expired_at,
                commission: 0, // По умолчанию 0
                clientName: userId, // Используем userId как имя клиента
                status: Status.MILK,
                rate: body.rate,
                isMock: false,
                error: msg,
              },
            });
          } catch (e) {
            console.error("Failed to record milk transaction", e);
          }
        };

        /* ---------- 1. Метод и доступ мерчанта ---------- */
        console.log(`[Merchant] Поиск метода с ID: ${body.methodId}`);
        const method = await db.method.findUnique({
          where: { id: body.methodId },
        });
        if (!method) {
          console.log(`[Merchant] ❌ Метод не найден: methodId=${body.methodId}`);
          await recordMilk("Метод не найден");
          return error(404, { error: "Метод не найден" });
        }
        if (!method.isEnabled) {
          console.log(`[Merchant] ❌ Метод неактивен: methodId=${body.methodId}`);
          await recordMilk("Метод неактивен");
          return error(400, { error: "Метод неактивен" });
        }
        
        console.log(`[Merchant] ✓ Метод найден: id=${method.id}, code=${method.code}, type=${method.type}, enabled=${method.isEnabled}`);

        const mm = await db.merchantMethod.findUnique({
          where: {
            merchantId_methodId: {
              merchantId: merchant.id,
              methodId: method.id,
            },
          },
        });
        if (!mm || !mm.isEnabled) {
          await recordMilk("Метод недоступен мерчанту");
          return error(404, { error: "Метод недоступен мерчанту" });
        }

        /* ---------- 2. Сумма в допустимом диапазоне ---------- */
        const amount = body.amount;
        console.log(`[Merchant] Создание транзакции: метод=${method.code}, сумма=${amount}, лимиты метода=${method.minPayin}-${method.maxPayin}`);
        
        if (amount < method.minPayin || amount > method.maxPayin) {
          console.log(`[Merchant] ❌ Сумма ${amount} вне диапазона метода ${method.minPayin}-${method.maxPayin}`);
          await recordMilk("Сумма вне допустимого диапазона");
          return error(400, { error: "Сумма вне допустимого диапазона" });
        }

        /* ---------- 3. orderId уникален ---------- */
        const duplicate = await db.transaction.findFirst({
          where: { merchantId: merchant.id, orderId: body.orderId },
        });
        if (duplicate) {
          await recordMilk("Дубликат orderId");
          return error(409, {
            error: "Транзакция с таким orderId уже существует",
          });
        }

        /* ---------- 4. Для OUT транзакций создаем сразу без подбора реквизита ---------- */
        if (type === TransactionType.OUT) {
          const tx = await db.transaction.create({
            data: {
              merchantId: merchant.id,
              amount: body.amount,
              assetOrBank: "", // Для OUT транзакций реквизит заполняется позже
              orderId: body.orderId,
              methodId: method.id,
              currency: "RUB",
              userId: userId,
              userIp: body.userIp || null,
              callbackUri: "",
              successUri: "",
              failUri: "",
              type: type,
              expired_at: expired_at,
              commission: 0,
              clientName: userId,
              status: Status.IN_PROGRESS,
              rate: body.rate,
              isMock: false,
            },
            include: {
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                },
              },
            },
          });

          set.status = 201;
          return {
            id: tx.id,
            numericId: tx.numericId,
            amount: tx.amount,
            crypto: null,
            status: tx.status,
            traderId: null,
            requisites: null, // OUT транзакции не имеют реквизитов сразу
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            expired_at: tx.expired_at.toISOString(),
            method: tx.method,
          };
        }

        /* ---------- 4. Подбираем BankDetail ---------- */
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const pool = await db.bankDetail.findMany({
          where: {
            isArchived: false,
            methodType: method.type,
            user: { banned: false },
          },
          orderBy: { updatedAt: "asc" }, // LRU-очередь
          include: { user: true },
        });

        console.log(`[Merchant] Поиск реквизитов: methodType=${method.type}, isArchived=false, user.banned=false`);
        console.log(`[Merchant] Найдено реквизитов в базе: ${pool.length}`);
        
        // Логируем все найденные реквизиты
        pool.forEach((bd, index) => {
          console.log(`[Merchant] Реквизит ${index + 1}: id=${bd.id}, archived=${bd.isArchived}, methodType=${bd.methodType}, user.banned=${bd.user.banned}, minAmount=${bd.minAmount}, maxAmount=${bd.maxAmount}, trustBalance=${bd.user.trustBalance}`);
        });

        let chosen: (typeof pool)[number] | null = null;

        console.log(`[Merchant] Подбираем реквизит для суммы ${amount}, доступно реквизитов: ${pool.length}`);
        
        for (const bd of pool) {
          console.log(`[Merchant] Проверяем реквизит ${bd.id}, лимиты: ${bd.minAmount}-${bd.maxAmount}, дневной: ${bd.dailyLimit}, месячный: ${bd.monthlyLimit}, траст баланс: ${bd.user.trustBalance}`);
          
          if (amount < bd.minAmount || amount > bd.maxAmount) {
            console.log(`[Merchant] Реквизит ${bd.id} отклонен: сумма ${amount} вне диапазона ${bd.minAmount}-${bd.maxAmount}`);
            continue;
          }

          // Проверяем лимиты трейдера на минимальную и максимальную сумму на реквизит
          if (amount < bd.user.minAmountPerRequisite || amount > bd.user.maxAmountPerRequisite) {
            console.log(`[Merchant] Реквизит ${bd.id} отклонен: сумма ${amount} вне диапазона трейдера ${bd.user.minAmountPerRequisite}-${bd.user.maxAmountPerRequisite}`);
            continue;
          }

          // Проверяем лимит споров трейдера
          const disputeCount = await db.transaction.count({
            where: {
              traderId: bd.userId,
              status: Status.DISPUTE,
            }
          });
          
          if (disputeCount >= bd.user.disputeLimit) {
            console.log(`[Merchant] Реквизит ${bd.id} отклонен: достигнут лимит споров трейдера. Текущие споры: ${disputeCount}, лимит: ${bd.user.disputeLimit}`);
            continue;
          }

          const [
            {
              _sum: { amount: daySum },
            },
            {
              _sum: { amount: monSum },
            },
            {
              _count: { _all: dayCnt },
            },
            lastTx,
          ] = await Promise.all([
            db.transaction.aggregate({
              where: {
                bankDetailId: bd.id,
                createdAt: { gte: todayStart, lte: todayEnd },
                status: { not: Status.CANCELED },
              },
              _sum: { amount: true },
            }),
            db.transaction.aggregate({
              where: {
                bankDetailId: bd.id,
                createdAt: { gte: monthStart, lte: monthEnd },
                status: { not: Status.CANCELED },
              },
              _sum: { amount: true },
            }),
            db.transaction.aggregate({
              where: {
                bankDetailId: bd.id,
                createdAt: { gte: todayStart, lte: todayEnd },
                status: { not: Status.CANCELED },
              },
              _count: { _all: true },
            }),
            db.transaction.findFirst({
              where: { bankDetailId: bd.id },
              orderBy: { createdAt: "desc" },
              select: { createdAt: true },
            }),
          ]);

          const newDay = (daySum ?? 0) + amount;
          const newMon = (monSum ?? 0) + amount;

          if (bd.dailyLimit > 0 && newDay > bd.dailyLimit) {
            console.log(`[Merchant] Реквизит ${bd.id} отклонен: превышение дневного лимита. Текущий: ${daySum ?? 0}, новый: ${newDay}, лимит: ${bd.dailyLimit}`);
            continue;
          }
          if (bd.monthlyLimit > 0 && newMon > bd.monthlyLimit) {
            console.log(`[Merchant] Реквизит ${bd.id} отклонен: превышение месячного лимита. Текущий: ${monSum ?? 0}, новый: ${newMon}, лимит: ${bd.monthlyLimit}`);
            continue;
          }
          if (bd.maxCountTransactions && dayCnt + 1 > bd.maxCountTransactions) {
            console.log(`[Merchant] Реквизит ${bd.id} отклонен: превышение лимита транзакций. Текущий: ${dayCnt}, лимит: ${bd.maxCountTransactions}`);
            continue;
          }

          if (bd.intervalMinutes && lastTx) {
            const diff = (now.getTime() - lastTx.createdAt.getTime()) / 60_000;
            if (diff < bd.intervalMinutes) {
              console.log(`[Merchant] Реквизит ${bd.id} отклонен: интервал между транзакциями. Прошло: ${diff} мин, требуется: ${bd.intervalMinutes} мин`);
              continue;
            }
          }

          // Получаем настройки для расчета заморозки
          const [tempKkkSetting, tempTraderMerchantSettings] = await Promise.all([
            db.systemConfig.findUnique({
              where: { key: "kkk_percent" }
            }),
            db.traderMerchant.findUnique({
              where: {
                traderId_merchantId_methodId: {
                  traderId: bd.userId,
                  merchantId: merchant.id,
                  methodId: method.id
                }
              }
            })
          ]);

          const tempKkkPercent = tempKkkSetting ? parseFloat(tempKkkSetting.value) : 0;
          const tempFeeInPercent = tempTraderMerchantSettings?.feeIn ?? 0;

          // Рассчитываем необходимую сумму с учетом новых формул
          if (body.rate) {
            const tempFreezingParams = calculateFreezingParams(
              amount,
              body.rate,
              tempKkkPercent,
              tempFeeInPercent
            );

            // Проверяем доступный баланс (trustBalance - frozenUsdt)
            const availableBalance = bd.user.trustBalance - bd.user.frozenUsdt;
            if (tempFreezingParams.totalRequired > availableBalance) {
              console.log(`[Merchant] Реквизит ${bd.id} отклонен: недостаточно доступного баланса. Нужно: ${tempFreezingParams.totalRequired}, доступно: ${availableBalance}`);
              continue;
            }
          }
          
          console.log(`[Merchant] ✓ Реквизит ${bd.id} выбран для транзакции суммой ${amount}`);
          chosen = bd;
          break;
        }

        if (!chosen) {
          console.log(`[Merchant] ❌ Подходящий реквизит не найден для суммы ${amount}. Всего проверено: ${pool.length}`);
          await recordMilk("NO_REQUISITE");
          return error(409, {
            error: "NO_REQUISITE: подходящий реквизит не найден",
          });
        }

        // Получаем настройки KKK и трейдера
        const [kkkSetting, traderMerchantSettings] = await Promise.all([
          db.systemConfig.findUnique({
            where: { key: "kkk_percent" }
          }),
          db.traderMerchant.findUnique({
            where: {
              traderId_merchantId_methodId: {
                traderId: chosen.userId,
                merchantId: merchant.id,
                methodId: method.id
              }
            }
          })
        ]);

        const kkkPercent = kkkSetting ? parseFloat(kkkSetting.value) : 0;
        const feeInPercent = traderMerchantSettings?.feeIn ?? 0;

        // Рассчитываем параметры заморозки
        let freezingParams = null;
        if (body.rate && chosen.user) {
          freezingParams = calculateFreezingParams(
            amount,
            body.rate,
            kkkPercent,
            feeInPercent
          );

          // Проверяем достаточность доступного баланса (trustBalance - frozenUsdt)
          const availableBalance = chosen.user.trustBalance - chosen.user.frozenUsdt;
          if (availableBalance < freezingParams.totalRequired) {
            console.log(`[Merchant] Реквизит ${chosen.id} - недостаточно баланса. Нужно: ${freezingParams.totalRequired}, доступно: ${availableBalance}`);
            return error(400, { error: "Недостаточно баланса трейдера" });
          }
        }

        await db.bankDetail.update({
          where: { id: chosen.id },
          data: { updatedAt: now },
        });

        /* ---------- 5. Создаём транзакцию и замораживаем средства ---------- */
        const tx = await db.$transaction(async (prisma) => {
          console.log(`[Merchant] Starting transaction creation for amount ${body.amount}, trader ${chosen.userId}`);
          // Создаем транзакцию с параметрами заморозки
          const transaction = await prisma.transaction.create({
            data: {
              merchantId: merchant.id,
              amount: body.amount,
              assetOrBank: chosen.cardNumber,
              orderId: body.orderId,
              methodId: method.id,
              currency: "RUB", // По умолчанию RUB
              userId: userId,
              userIp: body.userIp || null,
              callbackUri: "", // Пустые URI по умолчанию
              successUri: "",
              failUri: "",
              type: type,
              expired_at: expired_at,
              commission: 0, // По умолчанию 0
              clientName: userId, // Используем userId как имя клиента
              status: Status.IN_PROGRESS,
              rate: body.rate,
              isMock: false,
              bankDetailId: chosen.id, // FK на BankDetail
              traderId: chosen.userId,
              // Новые поля для заморозки
              frozenUsdtAmount: freezingParams?.frozenUsdtAmount,
              adjustedRate: freezingParams?.adjustedRate,
              kkkPercent: kkkPercent,
              feeInPercent: feeInPercent,
              calculatedCommission: freezingParams?.calculatedCommission,
            },
            include: {
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                },
              },
            },
          });

          // Замораживаем средства трейдера для IN транзакции
          if (freezingParams && chosen.user) {
            console.log(`[Merchant] Freezing funds for trader ${chosen.userId}: ${freezingParams.totalRequired} USDT`);
            try {
              const beforeUser = await prisma.user.findUnique({ where: { id: chosen.userId } });
              console.log(`[Merchant] Before update - frozenUsdt: ${beforeUser?.frozenUsdt}`);
              
              const updatedUser = await prisma.user.update({
                where: { id: chosen.userId },
                data: {
                  frozenUsdt: { increment: freezingParams.totalRequired }
                }
              });
              console.log(`[Merchant] After update - frozenUsdt: ${updatedUser.frozenUsdt}`);
              console.log(`[Merchant] Successfully froze ${freezingParams.totalRequired} USDT`);
            } catch (freezeError) {
              console.error(`[Merchant] Error freezing funds:`, freezeError);
              throw freezeError;
            }
          } else {
            console.log(`[Merchant] Freezing skipped - freezingParams: ${!!freezingParams}, chosen.user: ${!!chosen.user}`);
            if (freezingParams) {
              console.log(`[Merchant] freezingParams exists:`, freezingParams);
            }
            if (!chosen.user) {
              console.log(`[Merchant] chosen.user is missing! chosen:`, { id: chosen.id, userId: chosen.userId });
            }
          }

          console.log(`[Merchant] Transaction created successfully, returning from $transaction block`);
          return transaction;
        }).catch(error => {
          console.error(`[Merchant] Transaction failed:`, error);
          throw error;
        });

        /* ---------- 6. Ответ ---------- */
        // Рассчитываем crypto: сумма в рублях / курс - комиссия метода IN
        const crypto = body.rate && tx.method 
          ? (tx.amount / body.rate) * (1 - tx.method.commissionPayin / 100)
          : null;
        
        set.status = 201;
        return {
          id: tx.id,
          numericId: tx.numericId,
          amount: tx.amount,
          crypto,
          status: tx.status,
          traderId: tx.traderId,
          requisites: {
            id: chosen.id,
            bankType: chosen.bankType,
            cardNumber: chosen.cardNumber,
            recipientName: chosen.recipientName,
            traderName: chosen.user.name,
          },
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
          expired_at: tx.expired_at.toISOString(),
          method: tx.method,
        };
      },

      /* ------------------- OpenAPI / JSON-schema ------------------- */
      {
        headers: t.Object({ "x-merchant-api-key": t.String() }),

        body: t.Object({
          amount: t.Number({ description: "Сумма транзакции в рублях" }),
          orderId: t.String({ description: "Уникальный ID заказа от мерчанта" }),
          methodId: t.String({ description: "ID метода платежа" }),
          rate: t.Number({ description: "Курс USDT/RUB" }),
          expired_at: t.String({ description: "ISO дата истечения транзакции" }),
          userIp: t.Optional(t.String({ description: "IP адрес пользователя" })),
          userId: t.Optional(t.String({ description: "ID пользователя (по умолчанию генерируется)" })),
          type: t.Optional(t.Enum(TransactionType, { description: "Тип транзакции (по умолчанию IN)" })),
          callbackUri: t.Optional(t.String({ description: "URL для callback уведомлений" })),
          successUri: t.Optional(t.String({ description: "URL для уведомления об успешной оплате" })),
          failUri: t.Optional(t.String({ description: "URL для уведомления о неудачной оплате" })),
        }),

        response: {
          /* Успех */
          201: t.Object({
            id: t.String(),
            numericId: t.Number(),
            amount: t.Number(),
            crypto: t.Union([t.Number(), t.Null()]),
            status: t.Enum(Status),
            traderId: t.Union([t.String(), t.Null()]),
            requisites: t.Union([
              t.Object({
                id: t.String(),
                bankType: t.Enum(BankType),
                cardNumber: t.String(),
                recipientName: t.String(),
                traderName: t.String(),
              }),
              t.Null()
            ]),
            createdAt: t.String(),
            updatedAt: t.String(),
            expired_at: t.String(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
            }),
          }),

          /* Ошибки (единый формат) */
          400: t.Object({ error: t.String() }), // сумма вне диапазона / метод неактивен
          404: t.Object({ error: t.String() }), // метод недоступен мерчанту
          409: t.Object({ error: t.String() }), // дубликат orderId либо NO_REQUISITE
          401: t.Object({ error: t.String() }), // невалидный API-ключ
        },

        tags: ["merchant"],
        detail: { summary: "Создание транзакции (IN/OUT) с авто-подбором реквизита для IN" },
      },
    )

    /* ──────── POST /merchant/transactions/in ──────── */
    .post(
      "/transactions/in",
      async ({ body, merchant, set, error }) => {
        // Генерируем значения по умолчанию
        const expired_at = body.expired_at ? new Date(body.expired_at) : new Date(Date.now() + 86_400_000);
        
        // Проверяем метод
        const method = await db.method.findUnique({
          where: { id: body.methodId },
        });
        if (!method || !method.isEnabled) {
          return error(404, { error: "Метод не найден или неактивен" });
        }

        // Проверяем доступ мерчанта к методу
        const mm = await db.merchantMethod.findUnique({
          where: {
            merchantId_methodId: {
              merchantId: merchant.id,
              methodId: method.id,
            },
          },
        });
        if (!mm || !mm.isEnabled) {
          return error(404, { error: "Метод недоступен мерчанту" });
        }

        // Проверяем сумму
        if (body.amount < method.minPayin || body.amount > method.maxPayin) {
          return error(400, { error: "Сумма вне допустимого диапазона" });
        }

        // Проверяем уникальность orderId
        const duplicate = await db.transaction.findFirst({
          where: { merchantId: merchant.id, orderId: body.orderId },
        });
        if (duplicate) {
          return error(409, { error: "Транзакция с таким orderId уже существует" });
        }

        // Подбираем реквизит (упрощенная логика из старого эндпоинта)
        const pool = await db.bankDetail.findMany({
          where: {
            isArchived: false,
            methodType: method.type,
            user: { banned: false },
          },
          orderBy: { updatedAt: "asc" },
          include: { user: true },
        });

        let chosen = null;
        for (const bd of pool) {
          if (body.amount < bd.minAmount || body.amount > bd.maxAmount) continue;
          if (body.amount < bd.user.minAmountPerRequisite || body.amount > bd.user.maxAmountPerRequisite) continue;
          
          // Здесь можно добавить проверку лимитов и интервалов как в старом эндпоинте
          chosen = bd;
          break;
        }

        if (!chosen) {
          return error(409, { error: "NO_REQUISITE" });
        }

        // Получаем параметры трейдера для расчета заморозки
        const traderMerchant = await db.traderMerchant.findUnique({
          where: {
            traderId_merchantId_methodId: {
              traderId: chosen.userId,
              merchantId: merchant.id,
              methodId: method.id
            }
          }
        });

        // Рассчитываем параметры заморозки
        // Получаем KKK процент из системных настроек
        const kkkSetting = await db.systemConfig.findUnique({
          where: { key: "kkk_percent" }
        });
        const kkkPercent = kkkSetting ? parseFloat(kkkSetting.value) : 0;
        const feeInPercent = traderMerchant?.feeIn || 0;
        
        const freezingParams = calculateFreezingParams(
          body.amount,
          body.rate,
          kkkPercent,
          feeInPercent
        );

        // Проверяем достаточность баланса трейдера
        if (freezingParams && chosen.user) {
          const availableBalance = chosen.user.trustBalance - chosen.user.frozenUsdt;
          if (availableBalance < freezingParams.totalRequired) {
            console.log(`[Merchant IN] Недостаточно баланса. Нужно: ${freezingParams.totalRequired}, доступно: ${availableBalance}`);
            return error(400, { error: "Недостаточно баланса трейдера" });
          }
        }

        // Создаем транзакцию с параметрами заморозки и замораживаем средства
        const tx = await db.$transaction(async (prisma) => {
          const transaction = await prisma.transaction.create({
          data: {
            merchantId: merchant.id,
            amount: body.amount,
            assetOrBank: `${chosen.bankType}: ${chosen.cardNumber}`,
            orderId: body.orderId,
            methodId: method.id,
            currency: "RUB",
            userId: `user_${Date.now()}`,
            userIp: body.userIp || null,
            callbackUri: body.callbackUri || "",
            successUri: "",
            failUri: "",
            type: TransactionType.IN,
            expired_at: expired_at,
            commission: 0,
            clientName: `user_${Date.now()}`,
            status: Status.IN_PROGRESS,
            rate: body.rate,
            adjustedRate: freezingParams.adjustedRate,
            kkkPercent: kkkPercent,
            feeInPercent: feeInPercent,
            frozenUsdtAmount: freezingParams.frozenUsdtAmount,
            calculatedCommission: freezingParams.calculatedCommission,
            isMock: false,
            bankDetailId: chosen.id,
            traderId: chosen.userId,
          },
          include: {
            method: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                currency: true,
                commissionPayin: true,
              },
            },
          },
        });

          // Замораживаем средства трейдера
          if (freezingParams && chosen.user) {
            console.log(`[Merchant IN] Freezing funds for trader ${chosen.userId}: ${freezingParams.totalRequired} USDT`);
            await prisma.user.update({
              where: { id: chosen.userId },
              data: {
                frozenUsdt: { increment: freezingParams.totalRequired }
              }
            });
          }

          return transaction;
        });

        const crypto = tx.rate && tx.method && typeof tx.method.commissionPayin === 'number'
          ? (tx.amount / tx.rate) * (1 - tx.method.commissionPayin / 100)
          : null;

        set.status = 201;
        return {
          id: tx.id,
          numericId: tx.numericId,
          amount: tx.amount,
          crypto,
          status: tx.status,
          traderId: tx.traderId,
          requisites: {
            id: chosen.id,
            bankType: chosen.bankType,
            cardNumber: chosen.cardNumber,
            recipientName: chosen.recipientName,
            traderName: chosen.user.name,
          },
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
          expired_at: tx.expired_at.toISOString(),
          method: tx.method,
        };
      },
      {
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        body: t.Object({
          amount: t.Number({ description: "Сумма транзакции в рублях" }),
          orderId: t.String({ description: "Уникальный ID заказа от мерчанта" }),
          methodId: t.String({ description: "ID метода платежа" }),
          rate: t.Number({ description: "Курс USDT/RUB" }),
          expired_at: t.String({ description: "ISO дата истечения транзакции" }),
          userIp: t.Optional(t.String({ description: "IP адрес пользователя" })),
          callbackUri: t.Optional(t.String({ description: "URL для callback уведомлений" })),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            numericId: t.Number(),
            amount: t.Number(),
            crypto: t.Union([t.Number(), t.Null()]),
            status: t.Enum(Status),
            traderId: t.String(),
            requisites: t.Object({
              id: t.String(),
              bankType: t.Enum(BankType),
              cardNumber: t.String(),
              recipientName: t.String(),
              traderName: t.String(),
            }),
            createdAt: t.String(),
            updatedAt: t.String(),
            expired_at: t.String(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
            }),
          }),
          400: t.Object({ error: t.String() }),
          404: t.Object({ error: t.String() }),
          409: t.Object({ error: t.String() }),
        },
        tags: ["merchant"],
        detail: { summary: "Создание входящей транзакции (IN)" },
      },
    )

    /* ──────── POST /merchant/transactions/out ──────── */
    .post(
      "/transactions/out",
      async ({ body, merchant, set, error }) => {
        // Генерируем значения по умолчанию
        const expired_at = body.expired_at ? new Date(body.expired_at) : new Date(Date.now() + 86_400_000);
        
        // Проверяем метод
        const method = await db.method.findUnique({
          where: { id: body.methodId },
        });
        if (!method || !method.isEnabled) {
          return error(404, { error: "Метод не найден или неактивен" });
        }

        // Проверяем доступ мерчанта к методу
        const mm = await db.merchantMethod.findUnique({
          where: {
            merchantId_methodId: {
              merchantId: merchant.id,
              methodId: method.id,
            },
          },
        });
        if (!mm || !mm.isEnabled) {
          return error(404, { error: "Метод недоступен мерчанту" });
        }

        // Проверяем сумму для OUT транзакций
        if (body.amount < method.minPayout || body.amount > method.maxPayout) {
          return error(400, { error: "Сумма вне допустимого диапазона" });
        }

        // Проверяем уникальность orderId
        const duplicate = await db.transaction.findFirst({
          where: { merchantId: merchant.id, orderId: body.orderId },
        });
        if (duplicate) {
          return error(409, { error: "Транзакция с таким orderId уже существует" });
        }

        // Создаем OUT транзакцию
        const tx = await db.transaction.create({
          data: {
            merchantId: merchant.id,
            amount: body.amount,
            assetOrBank: "",
            orderId: body.orderId,
            methodId: method.id,
            currency: "RUB",
            userId: `user_${Date.now()}`,
            userIp: body.userIp || null,
            callbackUri: body.callbackUri || "",
            successUri: "",
            failUri: "",
            type: TransactionType.OUT,
            expired_at: expired_at,
            commission: 0,
            clientName: `user_${Date.now()}`,
            status: Status.IN_PROGRESS,
            rate: body.rate,
            isMock: false,
          },
          include: {
            method: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                currency: true,
              },
            },
          },
        });

        set.status = 201;
        return {
          id: tx.id,
          numericId: tx.numericId,
          amount: tx.amount,
          crypto: null,
          status: tx.status,
          traderId: null,
          requisites: null,
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
          expired_at: tx.expired_at.toISOString(),
          method: tx.method,
        };
      },
      {
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        body: t.Object({
          amount: t.Number({ description: "Сумма транзакции в рублях" }),
          orderId: t.String({ description: "Уникальный ID заказа от мерчанта" }),
          methodId: t.String({ description: "ID метода платежа" }),
          rate: t.Number({ description: "Курс USDT/RUB" }),
          expired_at: t.String({ description: "ISO дата истечения транзакции" }),
          userIp: t.Optional(t.String({ description: "IP адрес пользователя" })),
          callbackUri: t.Optional(t.String({ description: "URL для callback уведомлений" })),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            numericId: t.Number(),
            amount: t.Number(),
            crypto: t.Null(),
            status: t.Enum(Status),
            traderId: t.Null(),
            requisites: t.Null(),
            createdAt: t.String(),
            updatedAt: t.String(),
            expired_at: t.String(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
            }),
          }),
          400: t.Object({ error: t.String() }),
          404: t.Object({ error: t.String() }),
          409: t.Object({ error: t.String() }),
        },
        tags: ["merchant"],
        detail: { summary: "Создание исходящей транзакции (OUT)" },
      },
    )

    /* ──────── GET /merchant/enums ──────── */
    .get(
      "/enums",
      async () => {
        return {
          status: Object.values(Status),
          transactionType: Object.values(TransactionType),
          methodType: Object.values(MethodType),
          currency: Object.values(Currency),
        };
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение всех enum значений для мерчанта" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        response: {
          200: t.Object({
            status: t.Array(t.Enum(Status)),
            transactionType: t.Array(t.Enum(TransactionType)),
            methodType: t.Array(t.Enum(MethodType)),
            currency: t.Array(t.Enum(Currency)),
          }),
          401: ErrorSchema,
        },
      },
    )

    /* ──────── GET /merchant/methods ──────── */
    .get(
      "/methods",
      async ({ merchant }) => {
        // merchant уже проверен в merchantGuard
        const merchantMethods = await db.merchantMethod.findMany({
          where: { merchantId: merchant.id, isEnabled: true },
          include: {
            method: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                currency: true,
                commissionPayin: true,
                commissionPayout: true,
                maxPayin: true,
                minPayin: true,
                maxPayout: true,
                minPayout: true,
                isEnabled: true,
              },
            },
          },
        });

        // Фильтруем только активные методы
        const availableMethods = merchantMethods
          .filter((mm) => mm.method.isEnabled)
          .map((mm) => mm.method);

        return availableMethods;
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение доступных методов для мерчанта" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
              commissionPayin: t.Number(),
              commissionPayout: t.Number(),
              maxPayin: t.Number(),
              minPayin: t.Number(),
              maxPayout: t.Number(),
              minPayout: t.Number(),
              isEnabled: t.Boolean(),
            }),
          ),
          401: ErrorSchema,
        },
      },
    )

    /* ──────── GET /merchant/transactions/by-order-id/:orderId ──────── */
    .get(
      "/transactions/by-order-id/:orderId",
      async ({ params, merchant, error }) => {
        // merchant уже проверен в merchantGuard
        try {
          const tx = await db.transaction.findFirst({
            where: { orderId: params.orderId, merchantId: merchant.id },
            select: {
              id: true,
              orderId: true,
              amount: true,
              status: true,
              type: true,
              createdAt: true,
              updatedAt: true,
              isMock: true,
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                },
              },
              requisites: {
                select: {
                  id: true,
                  bankType: true,
                  cardNumber: true,
                  recipientName: true,
                  user: { select: { id: true, name: true } }, // трейдер-владелец
                },
              },
            },
          });

          if (!tx) return error(404, { error: "Транзакция не найдена" });

          return {
            ...tx,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            requisites: tx.requisites && {
              id: tx.requisites.id,
              bankType: tx.requisites.bankType,
              cardNumber: tx.requisites.cardNumber,
              recipientName: tx.requisites.recipientName,
              traderId: tx.requisites.user.id,
              traderName: tx.requisites.user.name,
            },
          };
        } catch (e) {
          throw e;
        }
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение транзакции по orderId (с реквизитами)" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        params: t.Object({
          orderId: t.String({ description: "Order ID транзакции" }),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            orderId: t.String(),
            amount: t.Number(),
            status: t.Enum(Status),
            type: t.Enum(TransactionType),
            createdAt: t.String(),
            updatedAt: t.String(),
            isMock: t.Boolean(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
            }),
            requisites: t.Optional(
              t.Object({
                id: t.String(),
                bankType: t.Enum(BankType),
                cardNumber: t.String(),
                recipientName: t.String(),
                traderId: t.String(),
                traderName: t.String(),
              }),
            ),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      },
    )

    /* ──────── POST /merchant/transactions/:id/receipt ──────── */
    .post(
      "/transactions/:id/receipt",
      async ({ params, body, merchant, set, error }) => {
        // merchant уже проверен в merchantGuard
        try {
          // Проверяем существование транзакции и принадлежность мерчанту
          const transaction = await db.transaction.findFirst({
            where: { id: params.id, merchantId: merchant.id },
          });

          if (!transaction) {
            return error(404, { error: "Транзакция не найдена" });
          }

          // Validate file upload
          const validation = validateFileUpload(body.fileData, body.fileName);
          if (!validation.valid) {
            return error(400, { error: validation.error });
          }

          // Создаем чек
          const receipt = await db.receipt.create({
            data: {
              transactionId: transaction.id,
              fileData: body.fileData,
              fileName: body.fileName,
            },
          });

          // Обновляем статус транзакции, если указан
          if (
            body.updateStatus &&
            Object.values(Status).includes(body.updateStatus)
          ) {
            await db.transaction.update({
              where: { id: transaction.id },
              data: { status: body.updateStatus },
            });
          }

          set.status = 201;
          return {
            id: receipt.id,
            fileName: receipt.fileName,
            isChecked: receipt.isChecked,
            isFake: receipt.isFake,
            isAuto: receipt.isAuto,
            createdAt: receipt.createdAt.toISOString(),
          };
        } catch (e) {
          throw e;
        }
      },
      {
        tags: ["merchant"],
        detail: { summary: "Загрузка чека для транзакции" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        params: t.Object({ id: t.String({ description: "ID транзакции" }) }),
        body: t.Object({
          fileData: t.String({ description: "Файл в формате base64" }),
          fileName: t.String({ description: "Имя файла" }),
          updateStatus: t.Optional(
            t.Enum(Status, { description: "Обновить статус транзакции" }),
          ),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            fileName: t.String(),
            isChecked: t.Boolean(),
            isFake: t.Boolean(),
            isAuto: t.Boolean(),
            createdAt: t.String(),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      },
    )

    /* ──────── GET /merchant/transactions/:id/receipts ──────── */
    .get(
      "/transactions/:id/receipts",
      async ({ params, merchant, error }) => {
        // merchant уже проверен в merchantGuard
        try {
          // Проверяем существование транзакции и принадлежность мерчанту
          const transaction = await db.transaction.findFirst({
            where: { id: params.id, merchantId: merchant.id },
          });

          if (!transaction) {
            return error(404, { error: "Транзакция не найдена" });
          }

          // Получаем все чеки для транзакции
          const receipts = await db.receipt.findMany({
            where: { transactionId: transaction.id },
            orderBy: { createdAt: "desc" },
          });

          // Форматируем даты
          return receipts.map((receipt) => ({
            id: receipt.id,
            fileName: receipt.fileName,
            isChecked: receipt.isChecked,
            isFake: receipt.isFake,
            isAuto: receipt.isAuto,
            createdAt: receipt.createdAt.toISOString(),
            updatedAt: receipt.updatedAt.toISOString(),
          }));
        } catch (e) {
          throw e;
        }
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение всех чеков для транзакции" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        params: t.Object({ id: t.String({ description: "ID транзакции" }) }),
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              fileName: t.String(),
              isChecked: t.Boolean(),
              isFake: t.Boolean(),
              isAuto: t.Boolean(),
              createdAt: t.String(),
              updatedAt: t.String(),
            }),
          ),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      },
    );
