import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Prisma, Status, TransactionType, MethodType, Currency, PayoutStatus } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { merchantSessionGuard } from "@/middleware/merchantSessionGuard";
import { endOfDay, endOfMonth, startOfDay, startOfMonth, subDays, format } from "date-fns";

/**
 * Маршруты для дашборда мерчанта
 * Все эндпоинты защищены проверкой сессии мерчанта
 */
export default (app: Elysia) =>
  app
    .use(merchantSessionGuard())
    
    /* ──────── GET /merchant/dashboard/check-api-key ──────── */
    .get(
      "/check-api-key",
      async ({ merchant }) => {
        // Проверяем актуальность API ключа
        const currentMerchant = await db.merchant.findUnique({
          where: { id: merchant.id },
          select: { token: true, disabled: true, banned: true }
        });

        if (!currentMerchant) {
          return { valid: false, reason: "Merchant not found" };
        }

        if (currentMerchant.disabled || currentMerchant.banned) {
          return { valid: false, reason: "Merchant disabled or banned" };
        }

        // Проверяем, совпадает ли текущий токен с тем, что в БД
        if (currentMerchant.token !== merchant.token) {
          return { valid: false, reason: "API key has been changed" };
        }

        return { valid: true };
      },
      {
        detail: {
          tags: ["merchant", "dashboard"],
          summary: "Проверка актуальности API ключа мерчанта"
        },
        response: {
          200: t.Object({
            valid: t.Boolean(),
            reason: t.Optional(t.String())
          })
        }
      }
    )
    
    /* ──────── GET /merchant/dashboard/statistics ──────── */
    .get(
      "/statistics",
      async ({ merchant, query }) => {
        const period = query.period || "today";
        let dateFrom: Date;
        let dateTo: Date = new Date();

        switch (period) {
          case "today":
            dateFrom = startOfDay(new Date());
            dateTo = endOfDay(new Date());
            break;
          case "week":
            dateFrom = subDays(new Date(), 7);
            break;
          case "month":
            dateFrom = startOfMonth(new Date());
            dateTo = endOfMonth(new Date());
            break;
          case "all":
            dateFrom = new Date(0);
            break;
          default:
            dateFrom = startOfDay(new Date());
        }

        // Получаем статистику транзакций
        const [
          totalCount,
          successCount,
          failedCount,
          disputeCount,
          totalVolume,
          successVolume,
          inTransactions,
          outTransactions,
          inSuccessful,
          outSuccessful
        ] = await Promise.all([
          // Общее количество транзакций
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Успешные транзакции
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              status: Status.READY,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Отмененные транзакции
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              status: { in: [Status.CANCELED, Status.EXPIRED] },
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Спорные транзакции
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              status: Status.DISPUTE,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Общий объем
          db.transaction.aggregate({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
            _sum: { amount: true },
          }),
          // Объем успешных транзакций
          db.transaction.aggregate({
            where: {
              merchantId: merchant.id,
              status: Status.READY,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
            _sum: { amount: true },
          }),
          // Входящие транзакции
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              type: TransactionType.IN,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Исходящие операции (выплаты)
          db.payout.count({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Успешные входящие транзакции
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              type: TransactionType.IN,
              status: Status.READY,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Успешные исходящие операции (выплаты)
          db.payout.count({
            where: {
              merchantId: merchant.id,
              status: PayoutStatus.COMPLETED,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
        ]);

        // Детальная статистика по методам с разделением на IN/OUT
        const methodStatsDetailed = await db.transaction.groupBy({
          by: ["methodId", "type"],
          where: {
            merchantId: merchant.id,
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          _count: { _all: true },
          _sum: { amount: true },
        });

        // Получаем успешные транзакции для расчета баланса
        const successfulTransactionsByMethod = await db.transaction.findMany({
          where: {
            merchantId: merchant.id,
            status: Status.READY,
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          select: {
            methodId: true,
            type: true,
            amount: true,
            method: {
              select: {
                commissionPayin: true,
                commissionPayout: true,
              },
            },
          },
        });

        // Получаем информацию о методах
        const methods = await db.method.findMany({
          where: {
            id: { in: [...new Set([
              ...methodStatsDetailed.map(m => m.methodId),
              ...successfulTransactionsByMethod.map(t => t.methodId)
            ])] },
          },
          select: {
            id: true,
            name: true,
            code: true,
            commissionPayin: true,
            commissionPayout: true,
          },
        });

        const methodsMap = new Map(methods.map(m => [m.id, m]));

        // Группируем статистику по методам
        const methodStatsMap = new Map();
        
        // Инициализируем структуру для каждого метода
        methods.forEach(method => {
          methodStatsMap.set(method.id, {
            methodId: method.id,
            methodName: method.name,
            methodCode: method.code,
            commissionPayin: method.commissionPayin,
            commissionPayout: method.commissionPayout,
            in: { count: 0, volume: 0, balance: 0 },
            out: { count: 0, volume: 0, balance: 0 },
            total: { count: 0, volume: 0, balance: 0 },
          });
        });

        // Заполняем статистику из общих данных
        methodStatsDetailed.forEach(stat => {
          const methodData = methodStatsMap.get(stat.methodId);
          if (methodData) {
            const typeKey = stat.type.toLowerCase();
            if (typeKey === 'in' || typeKey === 'out') {
              methodData[typeKey].count = stat._count._all;
              methodData[typeKey].volume = stat._sum.amount || 0;
              methodData.total.count += stat._count._all;
              methodData.total.volume += stat._sum.amount || 0;
            }
          }
        });

        // Рассчитываем баланс с учетом комиссий для транзакций
        successfulTransactionsByMethod.forEach(tx => {
          const methodData = methodStatsMap.get(tx.methodId);
          if (methodData) {
            const commission = tx.type === TransactionType.IN 
              ? tx.method.commissionPayin 
              : tx.method.commissionPayout;
            
            const netAmount = tx.amount * (1 - commission / 100);
            const typeKey = tx.type.toLowerCase();
            
            if (typeKey === 'in' || typeKey === 'out') {
              methodData[typeKey].balance += netAmount;
              methodData.total.balance += netAmount;
            }
          }
        });

        // Получаем статистику выплат для исходящих операций
        const payoutsStats = await db.payout.groupBy({
          by: ["bank"],  // Группируем по банку (аналог метода)
          where: {
            merchantId: merchant.id,
            status: PayoutStatus.COMPLETED, // Только завершенные выплаты
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          _count: { _all: true },
          _sum: { amount: true },
        });

        // Получаем успешные выплаты для расчета баланса
        const successfulPayouts = await db.payout.findMany({
          where: {
            merchantId: merchant.id,
            status: PayoutStatus.COMPLETED, // Только завершенные выплаты
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          select: {
            bank: true,
            amount: true,
            feePercent: true,
          },
        });

        // Получаем все успешные выплаты для общего баланса (без фильтра по периоду)
        const allSuccessfulPayouts = await db.payout.findMany({
          where: {
            merchantId: merchant.id,
            status: PayoutStatus.COMPLETED, // Только завершенные выплаты
          },
          select: {
            amount: true,
            feePercent: true,
          },
        });

        // Добавляем статистику выплат к исходящим операциям
        // Создаем карту методов по названию банка для выплат
        const bankToMethodMap = new Map();
        methods.forEach(method => {
          // Пытаемся сопоставить банки с методами по части названия
          const methodNameLower = method.name.toLowerCase();
          if (methodNameLower.includes('сбер') || methodNameLower.includes('sber')) {
            bankToMethodMap.set('SBERBANK', method.id);
          } else if (methodNameLower.includes('тинь') || methodNameLower.includes('tinkoff')) {
            bankToMethodMap.set('TINKOFF', method.id);
          } else if (methodNameLower.includes('втб') || methodNameLower.includes('vtb')) {
            bankToMethodMap.set('VTB', method.id);
          }
          // Можно добавить больше сопоставлений при необходимости
        });

        // Добавляем статистику выплат к соответствующим методам
        payoutsStats.forEach(stat => {
          const methodId = bankToMethodMap.get(stat.bank);
          if (methodId) {
            const methodData = methodStatsMap.get(methodId);
            if (methodData) {
              methodData.out.count += stat._count._all;
              methodData.out.volume += stat._sum.amount || 0;
              methodData.total.count += stat._count._all;
              methodData.total.volume += stat._sum.amount || 0;
            }
          }
        });

        // Рассчитываем баланс с учетом комиссий для выплат
        successfulPayouts.forEach(payout => {
          const methodId = bankToMethodMap.get(payout.bank);
          if (methodId) {
            const methodData = methodStatsMap.get(methodId);
            if (methodData) {
              const netAmount = payout.amount * (1 + payout.feePercent / 100);
              methodData.out.balance -= netAmount; // Выплаты уменьшают баланс
              methodData.total.balance -= netAmount;
            }
          }
        });

        // Рассчитываем баланс с учетом комиссий
        const balanceCalculation = await db.transaction.aggregate({
          where: {
            merchantId: merchant.id,
            status: Status.READY, // Только успешные транзакции
          },
          _sum: {
            amount: true,
          },
        });

        // Получаем сумму комиссий с успешных транзакций
        const transactionsWithCommissions = await db.transaction.findMany({
          where: {
            merchantId: merchant.id,
            status: Status.READY,
          },
          select: {
            amount: true,
            type: true,
            method: {
              select: {
                commissionPayin: true,
                commissionPayout: true,
              },
            },
          },
        });

        // Рассчитываем итоговый баланс с учетом комиссий
        let calculatedBalance = 0;
        let totalEarned = 0;
        let totalCommissionPaid = 0;

        // Добавляем транзакции к балансу
        for (const tx of transactionsWithCommissions) {
          const commission = tx.type === TransactionType.IN 
            ? tx.method.commissionPayin 
            : tx.method.commissionPayout;
          
          // Комиссия в процентах, вычитаем из суммы транзакции
          const netAmount = tx.amount * (1 - commission / 100);
          const commissionAmount = tx.amount * (commission / 100);
          
          calculatedBalance += netAmount;
          totalEarned += tx.amount;
          totalCommissionPaid += commissionAmount;
        }

        // Добавляем успешные выплаты к балансу (для выплат комиссия прибавляется к сумме)
        for (const payout of allSuccessfulPayouts) {
          const netAmount = payout.amount * (1 + payout.feePercent / 100);
          const feeAmount = payout.amount * (payout.feePercent / 100);
          
          calculatedBalance -= netAmount; // Выплаты уменьшают баланс
          totalEarned += payout.amount;
          totalCommissionPaid += feeAmount;
        }

        return {
          period,
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
          balance: calculatedBalance,
          transactions: {
            total: totalCount,
            successful: successCount,
            failed: failedCount,
            dispute: disputeCount,
            successRate: totalCount > 0 
              ? Math.round((successCount / totalCount) * 100) 
              : 0,
            inTransactions,
            outTransactions,
            inSuccessful,
            outSuccessful,
          },
          volume: {
            total: totalVolume._sum.amount || 0,
            successful: successVolume._sum.amount || 0,
          },
          methodStats: Array.from(methodStatsMap.values()).filter(method => method.total.count > 0),
          balanceDetails: {
            totalEarned: totalEarned,
            totalCommissionPaid: totalCommissionPaid,
            netBalance: calculatedBalance,
          },
        };
      },
      {
        tags: ["merchant-dashboard"],
        detail: { summary: "Получение статистики мерчанта" },
        headers: t.Object({ authorization: t.String() }),
        query: t.Object({
          period: t.Optional(t.Union([
            t.Literal("today"),
            t.Literal("week"),
            t.Literal("month"),
            t.Literal("all"),
          ])),
        }),
        response: {
          200: t.Object({
            period: t.String(),
            dateFrom: t.String(),
            dateTo: t.String(),
            balance: t.Number(),
            transactions: t.Object({
              total: t.Number(),
              successful: t.Number(),
              failed: t.Number(),
              dispute: t.Number(),
              successRate: t.Number(),
              inTransactions: t.Number(),
              outTransactions: t.Number(),
              inSuccessful: t.Number(),
              outSuccessful: t.Number(),
            }),
            volume: t.Object({
              total: t.Number(),
              successful: t.Number(),
            }),
            methodStats: t.Array(
              t.Object({
                methodId: t.String(),
                methodName: t.String(),
                methodCode: t.String(),
                commissionPayin: t.Number(),
                commissionPayout: t.Number(),
                in: t.Object({
                  count: t.Number(),
                  volume: t.Number(),
                  balance: t.Number(),
                }),
                out: t.Object({
                  count: t.Number(),
                  volume: t.Number(), 
                  balance: t.Number(),
                }),
                total: t.Object({
                  count: t.Number(),
                  volume: t.Number(),
                  balance: t.Number(),
                }),
              })
            ),
            balanceDetails: t.Object({
              totalEarned: t.Number(),
              totalCommissionPaid: t.Number(),
              netBalance: t.Number(),
            }),
          }),
          401: ErrorSchema,
        },
      },
    )

    /* ──────── GET /merchant/dashboard/transactions ──────── */
    .get(
      "/transactions",
      async ({ merchant, query }) => {
        // Построение фильтров
        const where: Prisma.TransactionWhereInput = {
          merchantId: merchant.id,
          ...(query.status && { status: query.status as Status }),
          ...(query.type && { type: query.type as TransactionType }),
          ...(query.methodId && { methodId: query.methodId }),
        };

        // Расширенный поиск по всем полям
        if (query.search) {
          const searchNumber = Number(query.search);
          const isNumber = !isNaN(searchNumber);
          
          where.OR = [
            { id: { contains: query.search } },
            { orderId: { contains: query.search } },
            { clientName: { contains: query.search, mode: 'insensitive' } },
            ...(isNumber ? [
              { numericId: searchNumber },
              { amount: searchNumber }
            ] : []),
            {
              method: {
                OR: [
                  { name: { contains: query.search, mode: 'insensitive' } },
                  { code: { contains: query.search, mode: 'insensitive' } }
                ]
              }
            }
          ];
        } else if (query.orderId) {
          // Если не поиск, то используем фильтр по orderId
          where.orderId = { contains: query.orderId };
        }

        // Фильтры по датам
        if (query.dateFrom && !query.dateTo) {
          where.createdAt = { gte: new Date(query.dateFrom) };
        } else if (!query.dateFrom && query.dateTo) {
          where.createdAt = { lte: new Date(query.dateTo) };
        } else if (query.dateFrom && query.dateTo) {
          where.createdAt = {
            gte: new Date(query.dateFrom),
            lte: new Date(query.dateTo)
          };
        }

        // Фильтры по суммам
        if (query.amountFrom && !query.amountTo) {
          where.amount = { gte: Number(query.amountFrom) };
        } else if (!query.amountFrom && query.amountTo) {
          where.amount = { lte: Number(query.amountTo) };
        } else if (query.amountFrom && query.amountTo) {
          where.amount = {
            gte: Number(query.amountFrom),
            lte: Number(query.amountTo)
          };
        }

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        // Определение сортировки
        let orderBy: any = { createdAt: "desc" };
        if (query.sortBy) {
          switch (query.sortBy) {
            case "createdAt":
              orderBy = { createdAt: query.sortOrder || "desc" };
              break;
            case "amount":
              orderBy = { amount: query.sortOrder || "desc" };
              break;
            case "status":
              orderBy = { status: query.sortOrder || "asc" };
              break;
            default:
              orderBy = { createdAt: "desc" };
          }
        }

        const [transactions, total] = await Promise.all([
          db.transaction.findMany({
            where,
            select: {
              id: true,
              numericId: true,
              orderId: true,
              amount: true,
              status: true,
              type: true,
              clientName: true,
              rate: true,
              commission: true,
              error: true,
              createdAt: true,
              updatedAt: true,
              acceptedAt: true,
              expired_at: true,
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                },
              },
              trader: {
                select: {
                  id: true,
                  name: true,
                },
              },
              receipts: {
                select: {
                  id: true,
                  fileName: true,
                  isChecked: true,
                  isFake: true,
                  createdAt: true,
                },
                orderBy: { createdAt: "desc" },
              },
            },
            skip,
            take: limit,
            orderBy,
          }),
          db.transaction.count({ where }),
        ]);

        // Форматируем данные
        const data = transactions.map((tx) => ({
          id: tx.id,
          numericId: tx.numericId,
          orderId: tx.orderId,
          amount: tx.amount,
          status: tx.status,
          type: tx.type,
          clientName: tx.clientName,
          rate: tx.rate,
          commission: tx.commission,
          error: tx.error,
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
          acceptedAt: tx.acceptedAt?.toISOString() || null,
          expiredAt: tx.expired_at.toISOString(),
          method: tx.method,
          trader: tx.trader,
          receipts: tx.receipts.map(r => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
          })),
          receiptCount: tx.receipts.length,
          hasDispute: tx.receipts.some(r => r.isFake),
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
        tags: ["merchant-dashboard"],
        detail: { summary: "Получение списка транзакций с расширенными фильтрами" },
        headers: t.Object({ authorization: t.String() }),
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          type: t.Optional(t.String()),
          methodId: t.Optional(t.String()),
          orderId: t.Optional(t.String()),
          search: t.Optional(t.String()),
          dateFrom: t.Optional(t.String()),
          dateTo: t.Optional(t.String()),
          amountFrom: t.Optional(t.String()),
          amountTo: t.Optional(t.String()),
          sortBy: t.Optional(t.String()),
          sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.String(),
                numericId: t.Number(),
                orderId: t.String(),
                amount: t.Number(),
                status: t.Enum(Status),
                type: t.Enum(TransactionType),
                clientName: t.String(),
                rate: t.Union([t.Number(), t.Null()]),
                commission: t.Number(),
                error: t.Union([t.String(), t.Null()]),
                createdAt: t.String(),
                updatedAt: t.String(),
                acceptedAt: t.Union([t.String(), t.Null()]),
                expiredAt: t.String(),
                method: t.Object({
                  id: t.String(),
                  code: t.String(),
                  name: t.String(),
                  type: t.Enum(MethodType),
                  currency: t.Enum(Currency),
                }),
                trader: t.Union([
                  t.Object({
                    id: t.String(),
                    name: t.String(),
                  }),
                  t.Null()
                ]),
                receipts: t.Array(
                  t.Object({
                    id: t.String(),
                    fileName: t.String(),
                    isChecked: t.Boolean(),
                    isFake: t.Boolean(),
                    createdAt: t.String(),
                  })
                ),
                receiptCount: t.Number(),
                hasDispute: t.Boolean(),
              })
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

    /* ──────── POST /merchant/dashboard/transactions/:id/dispute ──────── */
    .post(
      "/transactions/:id/dispute",
      async ({ params, body, merchant, set, error }) => {
        try {
          // Проверяем существование транзакции и принадлежность мерчанту
          const transaction = await db.transaction.findFirst({
            where: { 
              id: params.id, 
              merchantId: merchant.id,
              type: TransactionType.IN, // Споры только для входящих транзакций
            },
          });

          if (!transaction) {
            return error(404, { error: "Транзакция не найдена" });
          }

          // Проверяем статус транзакции
          if (transaction.status !== Status.READY) {
            return error(400, { 
              error: "Спор можно создать только для завершенных транзакций" 
            });
          }

          // Обновляем статус транзакции
          await db.transaction.update({
            where: { id: transaction.id },
            data: { 
              status: Status.DISPUTE,
              error: body.reason || "Спор инициирован мерчантом",
            },
          });

          // Создаем записи о загруженных файлах (чеках)
          if (body.files && body.files.length > 0) {
            const receipts = body.files.map(file => ({
              transactionId: transaction.id,
              fileData: file.data,
              fileName: file.name,
              isChecked: false,
              isFake: true, // Помечаем как спорные
              isAuto: false,
            }));

            await db.receipt.createMany({
              data: receipts,
            });
          }

          // Добавляем уведомление для администратора (через SystemConfig)
          await db.systemConfig.create({
            data: {
              key: `dispute_${transaction.id}_${Date.now()}`,
              value: JSON.stringify({
                type: "dispute",
                transactionId: transaction.id,
                merchantId: merchant.id,
                merchantName: merchant.name,
                reason: body.reason,
                files: body.files?.length || 0,
                createdAt: new Date(),
              }),
            },
          });

          set.status = 201;
          return {
            success: true,
            disputeId: transaction.id,
            message: "Спор успешно создан",
          };
        } catch (e) {
          throw e;
        }
      },
      {
        tags: ["merchant-dashboard"],
        detail: { summary: "Создание спора по транзакции с загрузкой файлов" },
        headers: t.Object({ authorization: t.String() }),
        params: t.Object({ id: t.String({ description: "ID транзакции" }) }),
        body: t.Object({
          reason: t.String({ description: "Причина спора" }),
          files: t.Optional(
            t.Array(
              t.Object({
                name: t.String({ description: "Имя файла" }),
                data: t.String({ description: "Файл в формате base64" }),
              })
            )
          ),
        }),
        response: {
          201: t.Object({
            success: t.Boolean(),
            disputeId: t.String(),
            message: t.String(),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          401: ErrorSchema,
        },
      },
    )

    /* ──────── GET /merchant/dashboard/chart-data ──────── */
    .get(
      "/chart-data",
      async ({ merchant, query }) => {
        const days = Number(query.days) || 7;
        const startDate = subDays(new Date(), days);

        // Получаем данные по дням
        const transactions = await db.transaction.findMany({
          where: {
            merchantId: merchant.id,
            createdAt: { gte: startDate },
          },
          select: {
            createdAt: true,
            amount: true,
            status: true,
            type: true,
          },
        });

        // Группируем по дням
        const dailyData = new Map<string, {
          date: string;
          totalAmount: number;
          successAmount: number;
          totalCount: number;
          successCount: number;
          inCount: number;
          outCount: number;
        }>();

        // Инициализируем все дни
        for (let i = 0; i <= days; i++) {
          const date = format(subDays(new Date(), days - i), "yyyy-MM-dd");
          dailyData.set(date, {
            date,
            totalAmount: 0,
            successAmount: 0,
            totalCount: 0,
            successCount: 0,
            inCount: 0,
            outCount: 0,
          });
        }

        // Заполняем данными
        transactions.forEach(tx => {
          const date = format(tx.createdAt, "yyyy-MM-dd");
          const data = dailyData.get(date);
          
          if (data) {
            data.totalCount++;
            data.totalAmount += tx.amount;
            
            if (tx.status === Status.READY) {
              data.successCount++;
              data.successAmount += tx.amount;
            }
            
            if (tx.type === TransactionType.IN) {
              data.inCount++;
            } else {
              data.outCount++;
            }
          }
        });

        return {
          days,
          data: Array.from(dailyData.values()),
        };
      },
      {
        tags: ["merchant-dashboard"],
        detail: { summary: "Получение данных для графиков" },
        headers: t.Object({ authorization: t.String() }),
        query: t.Object({
          days: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            days: t.Number(),
            data: t.Array(
              t.Object({
                date: t.String(),
                totalAmount: t.Number(),
                successAmount: t.Number(),
                totalCount: t.Number(),
                successCount: t.Number(),
                inCount: t.Number(),
                outCount: t.Number(),
              })
            ),
          }),
          401: ErrorSchema,
        },
      },
    );