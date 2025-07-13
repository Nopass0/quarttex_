import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Prisma, Status, TransactionType, MethodType, Currency } from "@prisma/client";
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
          outTransactions
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
          // Исходящие транзакции
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              type: TransactionType.OUT,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
        ]);

        // Статистика по методам
        const methodStats = await db.transaction.groupBy({
          by: ["methodId"],
          where: {
            merchantId: merchant.id,
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          _count: { _all: true },
          _sum: { amount: true },
        });

        // Получаем информацию о методах
        const methods = await db.method.findMany({
          where: {
            id: { in: methodStats.map(m => m.methodId) },
          },
          select: {
            id: true,
            name: true,
            code: true,
          },
        });

        const methodsMap = new Map(methods.map(m => [m.id, m]));

        return {
          period,
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
          balance: merchant.balanceUsdt,
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
          },
          volume: {
            total: totalVolume._sum.amount || 0,
            successful: successVolume._sum.amount || 0,
          },
          methodStats: methodStats.map(stat => ({
            methodId: stat.methodId,
            methodName: methodsMap.get(stat.methodId)?.name || "Неизвестно",
            methodCode: methodsMap.get(stat.methodId)?.code || "unknown",
            count: stat._count._all,
            volume: stat._sum.amount || 0,
          })),
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
                count: t.Number(),
                volume: t.Number(),
              })
            ),
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