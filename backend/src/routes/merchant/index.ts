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
import payoutsRoutes from "./payouts";
import { disputesRoutes } from "./disputes";
import { dealDisputesRoutes } from "./deal-disputes";
import { dealDisputesApiRoutes } from "./deal-disputes-api";
import { payoutDisputesApiRoutes } from "./payout-disputes-api";
import { calculateFreezingParams } from "@/utils/freezing";
import { rapiraService } from "@/services/rapira.service";
import { floorDown2 } from '@/utils/freezing';
import { merchantPayoutsApi } from "@/api/merchant/payouts";
import { validateFileUpload } from "@/middleware/fileUploadValidation";
import { MerchantRequestLogService } from "@/services/merchant-request-log.service";
import { MerchantRequestType } from "@prisma/client";

export default (app: Elysia) =>
  app
    // Публичные маршруты аутентификации (без merchantGuard)
    .group("/auth", (app) => app.use(authRoutes))

    // Защищенные маршруты дашборда (с merchantSessionGuard)
    .group("/dashboard", (app) => app.use(dashboardRoutes))

    // Защищенные маршруты API документации (с merchantSessionGuard)
    .group("/api-docs", (app) => app.use(apiDocsRoutes))

    // Payouts routes (с merchantSessionGuard)
    .group("/payouts", (app) => app.use(payoutsRoutes))

    // Deal dispute routes (с merchantSessionGuard)
    .group("/deal-disputes", (app) => app.use(dealDisputesRoutes))

    // Основные API маршруты (с merchantGuard для API ключа)
    .use(merchantGuard())

    // Deal disputes API routes (с merchantGuard для API ключа)
    .group("/deal-disputes", (app) => app.use(dealDisputesApiRoutes))

    // Payout disputes API routes (с merchantGuard для API ключа)
    .group("/payout-disputes", (app) => app.use(payoutDisputesApiRoutes))

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
            },
          });

          // Размораживаем средства для IN транзакций при отмене
          if (
            tx.type === "IN" &&
            tx.traderId &&
            tx.frozenUsdtAmount &&
            tx.calculatedCommission
          ) {
            const totalToUnfreeze =
              tx.frozenUsdtAmount + tx.calculatedCommission;

            await prisma.user.update({
              where: { id: tx.traderId },
              data: {
                frozenUsdt: { decrement: totalToUnfreeze },
              },
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
              currency: t.Nullable(t.String()),
              userId: t.String(),
              userIp: t.Nullable(t.String()),
              callbackUri: t.String(),
              successUri: t.String(),
              failUri: t.String(),
              type: t.String(),
              expired_at: t.String(),
              commission: t.Number(),
              clientName: t.String(),
              status: t.String(),
              rate: t.Nullable(t.Number()),
              traderId: t.Nullable(t.String()),
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

    /* ──────── POST /merchant/transactions/in ──────── */
    .post(
      "/transactions/in",
      async ({ body, merchant, set, error }) => {
        // Проверяем, не отключен ли мерчант
        if (merchant.disabled) {
          return error(403, {
            error: "Ваш трафик временно отключен. Обратитесь к администратору.",
          });
        }

        // Always get the current rate from Rapira for trader calculations
        let rapiraRate: number;
        try {
          rapiraRate = await rapiraService.getUsdtRubRate();
        } catch (error) {
          console.error("Failed to get rate from Rapira:", error);
          rapiraRate = 95; // Default fallback rate
        }

        // Validate rate based on merchant's countInRubEquivalent setting
        let rate: number;

        if (merchant.countInRubEquivalent) {
          // If merchant has RUB calculations enabled, we provide the rate from Rapira
          if (body.rate !== undefined) {
            return error(400, {
              error:
                "Курс не должен передаваться при включенных расчетах в рублях. Курс автоматически получается от системы.",
            });
          }
          rate = rapiraRate;
        } else {
          // If RUB calculations are disabled, merchant must provide the rate
          if (body.rate === undefined) {
            return error(400, {
              error:
                "Курс обязателен при выключенных расчетах в рублях. Укажите параметр rate.",
            });
          }
          rate = body.rate;
        }

        // Генерируем значения по умолчанию
        const expired_at = body.expired_at
          ? new Date(body.expired_at)
          : new Date(Date.now() + 86_400_000);

        // Проверяем метод и доступ мерчанта к нему
        const mm = await db.merchantMethod.findUnique({
          where: {
            merchantId_methodId: {
              merchantId: merchant.id,
              methodId: body.methodId,
            },
          },
          include: {
            method: true,
          },
        });

        if (!mm || !mm.isEnabled || !mm.method) {
          return error(404, {
            error: "Метод не найден или недоступен мерчанту",
          });
        }

        const method = mm.method;

        // Мягкое предупреждение о лимитах метода
        if (body.amount < method.minPayin || body.amount > method.maxPayin) {
          console.log(
            `[Merchant] ⚠️ Предупреждение: сумма ${body.amount} вне стандартного диапазона метода ${method.minPayin}-${method.maxPayin}, но продолжаем обработку`,
          );
        }

        // Проверяем уникальность orderId
        const duplicate = await db.transaction.findFirst({
          where: { merchantId: merchant.id, orderId: body.orderId },
        });
        if (duplicate) {
          return error(409, {
            error: "Транзакция с таким orderId уже существует",
          });
        }

        // Получаем список трейдеров, подключенных к данному мерчанту с включенными входами
        const connectedTraders = await db.traderMerchant.findMany({
          where: {
            merchantId: merchant.id,
            methodId: method.id,
            isMerchantEnabled: true,
            isFeeInEnabled: true, // Проверяем, что вход включен
          },
          select: { traderId: true },
        });

        const traderIds = connectedTraders.map((ct) => ct.traderId);

        // Подбираем реквизит (упрощенная логика из старого эндпоинта)
        const pool = await db.bankDetail.findMany({
          where: {
            isArchived: false,
            isActive: true, // Проверяем, что реквизит активен
            methodType: method.type,
            userId: { in: traderIds }, // Только трейдеры, подключенные к мерчанту
            user: {
              banned: false,
              deposit: { gte: 1000 },
              trafficEnabled: true,
            },
            // Проверяем, что устройство банковской карты работает
            OR: [
              { deviceId: null }, // Карта без устройства
              { device: { isWorking: true, isOnline: true } }, // Или устройство активно
            ],
          },
          orderBy: { updatedAt: "asc" },
          include: { user: true, device: true },
        });

        let chosen = null;
        for (const bd of pool) {
          if (body.amount < bd.minAmount || body.amount > bd.maxAmount)
            continue;
          if (
            body.amount < bd.user.minAmountPerRequisite ||
            body.amount > bd.user.maxAmountPerRequisite
          )
            continue;

          // Проверяем наличие активной транзакции с той же суммой на этом реквизите
          const existingTransaction = await db.transaction.findFirst({
            where: {
              bankDetailId: bd.id,
              amount: body.amount,
              status: {
                in: [Status.CREATED, Status.IN_PROGRESS],
              },
              type: TransactionType.IN,
            },
          });

          if (existingTransaction) {
            console.log(
              `[Merchant] Реквизит ${bd.id} отклонен: уже есть транзакция на сумму ${body.amount} в статусе ${existingTransaction.status}`,
            );
            continue;
          }

          // Проверка лимита по количеству операций без срока давности
          if (bd.operationLimit > 0) {
            const totalOperations = await db.transaction.count({
              where: {
                bankDetailId: bd.id,
                status: {
                  in: [Status.IN_PROGRESS, Status.READY],
                },
              },
            });
            console.log(
              `[Merchant] - Общее количество операций (IN_PROGRESS + READY): ${totalOperations}/${bd.operationLimit}`,
            );
            if (totalOperations >= bd.operationLimit) {
              console.log(
                `[Merchant] Реквизит ${bd.id} отклонен: достигнут лимит количества операций. Текущее количество: ${totalOperations}, лимит: ${bd.operationLimit}`,
              );
              continue;
            }
          }

          // Проверка лимита на общую сумму сделок
          if (bd.sumLimit > 0) {
            const totalSumResult = await db.transaction.aggregate({
              where: {
                bankDetailId: bd.id,
                status: {
                  in: [Status.IN_PROGRESS, Status.READY],
                },
              },
              _sum: { amount: true },
            });
            const totalSum = (totalSumResult._sum.amount ?? 0) + body.amount;
            console.log(
              `[Merchant] - Общая сумма операций (IN_PROGRESS + READY): ${totalSumResult._sum.amount ?? 0} + ${body.amount} = ${totalSum}/${bd.sumLimit}`,
            );
            if (totalSum > bd.sumLimit) {
              console.log(
                `[Merchant] Реквизит ${bd.id} отклонен: превышение лимита общей суммы. Текущая сумма: ${totalSumResult._sum.amount ?? 0}, новая сумма: ${totalSum}, лимит: ${bd.sumLimit}`,
              );
              continue;
            }
          }

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
              methodId: method.id,
            },
          },
        });

        // Рассчитываем параметры заморозки
        // Получаем KKK настройки для метода
        const rateSetting = await db.rateSettings.findUnique({
          where: { methodId: method.id },
        });

        // Если нет настроек для метода, используем глобальные
        let kkkPercent = 0;
        let kkkOperation: "PLUS" | "MINUS" = "MINUS";

        if (rateSetting) {
          kkkPercent = rateSetting.kkkPercent;
          kkkOperation = rateSetting.kkkOperation as "PLUS" | "MINUS";
        } else {
          const globalKkkSetting = await db.systemConfig.findUnique({
            where: { key: "kkk_percent" },
          });
          kkkPercent = globalKkkSetting
            ? parseFloat(globalKkkSetting.value)
            : 0;
        }

        const feeInPercent = traderMerchant?.feeIn || 0;

        // Always get Rapira rate with KKK for transaction.rate field
        const rateSettingRecord = await db.rateSetting.findFirst({
          where: { id: 1 },
        });
        const rapiraKkk = rateSettingRecord?.rapiraKkk || 0;
        const rapiraRateWithKkk = await rapiraService.getRateWithKkk(rapiraKkk);
        
        console.log(`[Merchant IN] Rapira rate with KKK: ${rapiraRateWithKkk}`);
        
        // merchantRate: merchant provided rate or Rapira rate if not provided
        let merchantRate = body.rate;
        if (merchantRate === undefined) {
          merchantRate = rapiraRateWithKkk;
          console.log(`[Merchant IN] No rate provided, merchantRate will use Rapira rate: ${merchantRate}`);
        } else {
          console.log(`[Merchant IN] Merchant provided rate: ${merchantRate}`);
        }
        
        // rate field is always from Rapira with KKK
        const transactionRate = rapiraRateWithKkk;
        console.log(`[Merchant IN] Transaction rate (always Rapira): ${transactionRate}`);
        console.log(`[Merchant IN] Merchant rate (for freezing): ${merchantRate}`);

        // Рассчитываем заморозку с курсом мерчанта (или Рапиры если не передан)
        // Используем floorDown2 для обрезания до 2 знаков после запятой
        const frozenUsdtAmount = floorDown2(body.amount / merchantRate);
        const calculatedCommission = floorDown2((frozenUsdtAmount * feeInPercent) / 100);
        const totalRequired = floorDown2(frozenUsdtAmount + calculatedCommission);

        const freezingParams = {
          adjustedRate: merchantRate, // Use merchant rate for freezing
          frozenUsdtAmount,
          calculatedCommission,
          totalRequired,
        };

        // Проверяем достаточность баланса трейдера
        if (freezingParams && chosen.user) {
          const availableBalance =
            chosen.user.trustBalance - chosen.user.frozenUsdt;
          if (availableBalance < freezingParams.totalRequired) {
            console.log(
              `[Merchant IN] Недостаточно баланса. Нужно: ${freezingParams.totalRequired}, доступно: ${availableBalance}`,
            );
            return error(409, { error: "NO_REQUISITE" });
          }
        }

        await db.bankDetail.update({
          where: { id: chosen.id },
          data: {
            currentTotalAmount: body.amount,
          },
        });

        // Создаем транзакцию с параметрами заморозки и замораживаем средства
        console.log(`[Merchant IN] Creating transaction with rate=${transactionRate}, merchantRate=${merchantRate}`);
        const tx = await db.$transaction(async (prisma) => {
          const transaction = await prisma.transaction.create({
            data: {
              merchantId: merchant.id,
              amount: body.amount,
              assetOrBank:
                method.type === MethodType.sbp
                  ? chosen.cardNumber
                  : `${chosen.bankType}: ${chosen.cardNumber}`, // Для СБП только номер телефона
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
              rate: transactionRate, // Always Rapira rate with KKK
              merchantRate: merchantRate, // Merchant provided rate or Rapira if not provided
              adjustedRate: freezingParams.adjustedRate,
              kkkPercent: kkkPercent,
              kkkOperation: kkkOperation,
              feeInPercent: feeInPercent,
              frozenUsdtAmount: freezingParams.frozenUsdtAmount,
              calculatedCommission: freezingParams.calculatedCommission,
              isMock: body.isMock || false,
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
            console.log(
              `[Merchant IN] Freezing funds for trader ${chosen.userId}: ${freezingParams.totalRequired} USDT`,
            );
            await prisma.user.update({
              where: { id: chosen.userId },
              data: {
                frozenUsdt: { increment: freezingParams.totalRequired },
                trustBalance: { decrement: freezingParams.totalRequired }, // Списываем с баланса при заморозке
              },
            });
          }

          return transaction;
        });

        const crypto =
          tx.rate && tx.method && typeof tx.method.commissionPayin === "number"
            ? (tx.amount / tx.rate) * (1 - tx.method.commissionPayin / 100)
            : null;

        set.status = 201;
        
        // Проверяем, является ли мерчант Wellbit
        const isWellbit = merchant.name.toLowerCase() === 'wellbit';
        
        if (isWellbit) {
          // Для Wellbit возвращаем специальный формат
          const wellbitResponse: any = {
            payment_id: tx.id,
            payment_amount: tx.amount,
            payment_amount_usdt: crypto || (tx.amount / tx.rate),
            payment_amount_profit: tx.amount * 0.935, // С учетом комиссии 6.5%
            payment_amount_profit_usdt: (crypto || (tx.amount / tx.rate)) * 0.935,
            payment_fee_percent_profit: 6.5,
            payment_type: tx.method?.type === MethodType.sbp ? "sbp" : "card",
            payment_bank: chosen.bankType,
            payment_course: tx.rate,
            payment_lifetime: Math.floor((tx.expired_at.getTime() - Date.now()) / 1000),
            payment_status: "new",
            payment_credential: chosen.cardNumber
          };
          
          // Если есть приватный ключ, добавляем HMAC подпись в заголовки
          if (merchant.apiKeyPrivate) {
            const crypto = await import('crypto');
            // Сортируем ключи и генерируем подпись
            const sortedPayload = Object.keys(wellbitResponse)
              .sort()
              .reduce((obj: any, key) => {
                obj[key] = wellbitResponse[key];
                return obj;
              }, {});
            
            const jsonString = JSON.stringify(sortedPayload);
            const signature = crypto.createHmac('sha256', merchant.apiKeyPrivate).update(jsonString).digest('hex');
            
            // Добавляем заголовок с подписью
            set.headers = {
              ...set.headers,
              'x-api-token': signature
            };
          }
          
          return wellbitResponse;
        }
        
        // Для остальных мерчантов возвращаем стандартный формат
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
          orderId: t.String({
            description: "Уникальный ID заказа от мерчанта",
          }),
          methodId: t.String({ description: "ID метода платежа" }),
          rate: t.Optional(t.Number({ description: "Курс USDT/RUB" })),
          expired_at: t.String({
            description: "ISO дата истечения транзакции",
          }),
          userIp: t.Optional(
            t.String({ description: "IP адрес пользователя" }),
          ),
          callbackUri: t.Optional(
            t.String({ description: "URL для callback уведомлений" }),
          ),
          isMock: t.Optional(
            t.Boolean({ description: "Флаг для создания тестовой транзакции" }),
          ),
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
        // Проверяем, не отключен ли мерчант
        if (merchant.disabled) {
          return error(403, {
            error: "Ваш трафик временно отключен. Обратитесь к администратору.",
          });
        }

        // Always get the current rate from Rapira for trader calculations
        let rapiraRate: number;
        try {
          rapiraRate = await rapiraService.getUsdtRubRate();
        } catch (error) {
          console.error("Failed to get rate from Rapira:", error);
          rapiraRate = 95; // Default fallback rate
        }

        // Validate rate based on merchant's countInRubEquivalent setting
        let rate: number;

        if (merchant.countInRubEquivalent) {
          // If merchant has RUB calculations enabled, we provide the rate from Rapira
          if (body.rate !== undefined) {
            return error(400, {
              error:
                "Курс не должен передаваться при включенных расчетах в рублях. Курс автоматически получается от системы.",
            });
          }
          rate = rapiraRate;
        } else {
          // If RUB calculations are disabled, merchant must provide the rate
          if (body.rate === undefined) {
            return error(400, {
              error:
                "Курс обязателен при выключенных расчетах в рублях. Укажите параметр rate.",
            });
          }
          rate = body.rate;
        }

        // Генерируем значения по умолчанию
        const expired_at = body.expired_at
          ? new Date(body.expired_at)
          : new Date(Date.now() + 86_400_000);

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

        // Мягкое предупреждение о лимитах метода для OUT транзакций
        if (body.amount < method.minPayout || body.amount > method.maxPayout) {
          console.log(
            `[Merchant] ⚠️ Предупреждение: сумма ${body.amount} вне стандартного диапазона метода для выплат ${method.minPayout}-${method.maxPayout}, но продолжаем обработку`,
          );
        }

        // Проверяем уникальность orderId
        const duplicate = await db.transaction.findFirst({
          where: { merchantId: merchant.id, orderId: body.orderId },
        });
        if (duplicate) {
          return error(409, {
            error: "Транзакция с таким orderId уже существует",
          });
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
            isMock: body.isMock || false,
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
          orderId: t.String({
            description: "Уникальный ID заказа от мерчанта",
          }),
          methodId: t.String({ description: "ID метода платежа" }),
          rate: t.Number({ description: "Курс USDT/RUB" }),
          expired_at: t.String({
            description: "ISO дата истечения транзакции",
          }),
          userIp: t.Optional(
            t.String({ description: "IP адрес пользователя" }),
          ),
          callbackUri: t.Optional(
            t.String({ description: "URL для callback уведомлений" }),
          ),
          isMock: t.Optional(
            t.Boolean({ description: "Флаг для создания тестовой транзакции" }),
          ),
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
