import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Prisma, Status, TransactionType } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { traderGuard } from "@/middleware/traderGuard";
import { notifyByStatus } from "@/utils/notify";
import { roundDown2 } from "@/utils/rounding";

/**
 * Маршруты для управления транзакциями трейдера
 */
export default (app: Elysia) =>
  app
    .use(traderGuard())

    /* ───────── GET /trader/transactions - получение списка транзакций трейдера ───────── */
    .get(
      "",
      async ({ trader, query }) => {
        // Параметры фильтрации и пагинации
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const skip = (page - 1) * limit;

        // Формируем условия фильтрации
        const where: Prisma.TransactionWhereInput = {
          traderId: trader.id,
        };

        // Фильтрация по статусу, если указан
        if (query.status) {
          where.status = query.status as Status;
        }

        // Фильтрация по типу транзакции, если указан
        if (query.type) {
          where.type = query.type as TransactionType;
        }

        // Фильтрация по наличию споров
        if (query.hasDispute === 'true') {
          where.dealDispute = {
            isNot: null
          };
        } else if (query.hasDispute === 'false') {
          where.dealDispute = {
            is: null
          };
        }

        // Получаем транзакции с пагинацией
        console.log(`[Trader API] Поиск транзакций для трейдера ${trader.id}, условия:`, where);
        const transactions = await db.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
              },
            },
            method: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            receipts: {
              select: {
                id: true,
                fileName: true,
                isChecked: true,
                isFake: true,
              },
            },
            requisites: {
              select: {
                id: true,
                recipientName: true,
                cardNumber: true,
                bankType: true,
                deviceId: true,
                device: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            dealDispute: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

        // Получаем общее количество транзакций для пагинации
        const total = await db.transaction.count({ where });
        
        console.log(`[Trader API] Найдено ${transactions.length} транзакций из ${total} общих для трейдера ${trader.id}`);

        // Преобразуем даты в ISO формат и корректируем курс с учетом ККК
        const formattedTransactions = transactions.map((tx) => {
          // Используем сохраненный adjustedRate, если есть, иначе вычисляем с округлением вниз
          const traderRate = tx.adjustedRate || 
            (tx.rate !== null && tx.kkkPercent !== null 
              ? Math.floor(tx.rate * (1 - tx.kkkPercent / 100) * 100) / 100 
              : tx.rate);
          
          // Рассчитываем профит на основе скорректированного курса
          const profit = traderRate !== null ? tx.amount / traderRate : null;
          
          // Извлекаем информацию об устройстве
          const device = tx.requisites?.device;
          
          return {
            ...tx,
            rate: traderRate,
            profit,
            deviceId: device?.id || tx.requisites?.deviceId || null,
            deviceName: device?.name || null,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            expired_at: tx.expired_at.toISOString(),
            acceptedAt: tx.acceptedAt ? tx.acceptedAt.toISOString() : null,
            dealDispute: tx.dealDispute ? {
              ...tx.dealDispute,
              createdAt: tx.dealDispute.createdAt.toISOString(),
              updatedAt: tx.dealDispute.updatedAt.toISOString(),
            } : null,
          };
        });

        return {
          data: formattedTransactions,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Получение списка транзакций трейдера" },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          type: t.Optional(t.String()),
          hasDispute: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
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
                profit: t.Union([t.Number(), t.Null()]),
                frozenUsdtAmount: t.Union([t.Number(), t.Null()]),
                calculatedCommission: t.Union([t.Number(), t.Null()]),
                traderId: t.Union([t.String(), t.Null()]),
                isMock: t.Boolean(),
                createdAt: t.String(),
                updatedAt: t.String(),
                acceptedAt: t.Union([t.String(), t.Null()]),
                merchant: t.Object({
                  id: t.String(),
                  name: t.String(),
                }),
                method: t.Object({
                  id: t.String(),
                  name: t.String(),
                  type: t.String(),
                }),
                receipts: t.Array(
                  t.Object({
                    id: t.String(),
                    fileName: t.String(),
                    isChecked: t.Boolean(),
                    isFake: t.Boolean(),
                  }),
                ),
                requisites: t.Union([
                  t.Object({
                    id: t.String(),
                    recipientName: t.String(),
                    cardNumber: t.String(),
                    bankType: t.String(),
                  }),
                  t.Null(),
                ]),
                deviceId: t.Union([t.String(), t.Null()]),
                deviceName: t.Union([t.String(), t.Null()]),
                dealDispute: t.Union([
                  t.Object({
                    id: t.String(),
                    status: t.String(),
                    createdAt: t.String(),
                    updatedAt: t.String(),
                  }),
                  t.Null(),
                ]),
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
          403: ErrorSchema,
        },
      },
    )

    /* ───────── GET /trader/transactions/bt-input - получение транзакций без устройств (БТ-Вход) ───────── */
    .get(
      "/bt-input",
      async ({ trader, query }) => {
        // Параметры фильтрации и пагинации
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const skip = (page - 1) * limit;

        // Формируем условия фильтрации - только транзакции без устройств
        const where: Prisma.TransactionWhereInput = {
          traderId: trader.id,
          requisites: {
            OR: [
              { deviceId: null },
              { device: null }
            ]
          }
        };

        // Фильтрация по статусу, если указан
        if (query.status) {
          where.status = query.status as Status;
        }

        // Фильтрация по типу транзакции, если указан
        if (query.type) {
          where.type = query.type as TransactionType;
        }

        // Получаем транзакции с пагинацией
        console.log(`[Trader API] Поиск БТ-Вход транзакций для трейдера ${trader.id}, условия:`, where);
        const transactions = await db.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
              },
            },
            method: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            receipts: {
              select: {
                id: true,
                fileName: true,
                isChecked: true,
                isFake: true,
              },
            },
            requisites: {
              select: {
                id: true,
                recipientName: true,
                cardNumber: true,
                bankType: true,
                deviceId: true,
                device: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            dealDispute: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

        // Получаем общее количество транзакций для пагинации
        const total = await db.transaction.count({ where });
        
        console.log(`[Trader API] Найдено ${transactions.length} БТ-Вход транзакций из ${total} общих для трейдера ${trader.id}`);

        // Преобразуем даты в ISO формат и корректируем курс с учетом ККК
        const formattedTransactions = transactions.map((tx) => {
          // Используем сохраненный adjustedRate, если есть, иначе вычисляем с округлением вниз
          const traderRate = tx.adjustedRate || 
            (tx.rate !== null && tx.kkkPercent !== null 
              ? Math.floor(tx.rate * (1 - tx.kkkPercent / 100) * 100) / 100 
              : tx.rate);
          
          // Рассчитываем профит на основе скорректированного курса
          const profit = traderRate !== null ? tx.amount / traderRate : null;
          
          // Извлекаем информацию об устройстве
          const device = tx.requisites?.device;
          
          return {
            ...tx,
            rate: traderRate,
            profit,
            deviceId: device?.id || tx.requisites?.deviceId || null,
            deviceName: device?.name || null,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            expired_at: tx.expired_at.toISOString(),
            acceptedAt: tx.acceptedAt ? tx.acceptedAt.toISOString() : null,
            dealDispute: tx.dealDispute ? {
              ...tx.dealDispute,
              createdAt: tx.dealDispute.createdAt.toISOString(),
              updatedAt: tx.dealDispute.updatedAt.toISOString(),
            } : null,
          };
        });

        return {
          data: formattedTransactions,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Получение списка БТ-Вход транзакций (без устройств)" },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          type: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
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
                profit: t.Union([t.Number(), t.Null()]),
                frozenUsdtAmount: t.Union([t.Number(), t.Null()]),
                calculatedCommission: t.Union([t.Number(), t.Null()]),
                traderId: t.Union([t.String(), t.Null()]),
                isMock: t.Boolean(),
                createdAt: t.String(),
                updatedAt: t.String(),
                acceptedAt: t.Union([t.String(), t.Null()]),
                merchant: t.Object({
                  id: t.String(),
                  name: t.String(),
                }),
                method: t.Object({
                  id: t.String(),
                  name: t.String(),
                  type: t.String(),
                }),
                receipts: t.Array(
                  t.Object({
                    id: t.String(),
                    fileName: t.String(),
                    isChecked: t.Boolean(),
                    isFake: t.Boolean(),
                  }),
                ),
                requisites: t.Union([
                  t.Object({
                    id: t.String(),
                    recipientName: t.String(),
                    cardNumber: t.String(),
                    bankType: t.String(),
                  }),
                  t.Null(),
                ]),
                deviceId: t.Union([t.String(), t.Null()]),
                deviceName: t.Union([t.String(), t.Null()]),
                dealDispute: t.Union([
                  t.Object({
                    id: t.String(),
                    status: t.String(),
                    createdAt: t.String(),
                    updatedAt: t.String(),
                  }),
                  t.Null(),
                ]),
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
          403: ErrorSchema,
        },
      },
    )

    /* ───────── GET /trader/transactions/:id - получение детальной информации о транзакции ───────── */
    .get(
      "/:id",
      async ({ trader, params, error }) => {
        const transaction = await db.transaction.findUnique({
          where: {
            id: params.id,
            traderId: trader.id,
          },
          include: {
            merchant: true,
            method: true,
            receipts: true,
            requisites: {
              select: {
                id: true,
                recipientName: true,
                cardNumber: true,
                bankType: true,
                phoneNumber: true,
                minAmount: true,
                maxAmount: true,
                dailyLimit: true,
                monthlyLimit: true,
                intervalMinutes: true,
                methodType: true,
                isArchived: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            dealDispute: {
              include: {
                messages: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        });

        if (!transaction) {
          return error(404, { error: "Транзакция не найдена" });
        }

        // Используем сохраненный adjustedRate, если есть, иначе вычисляем с округлением вниз
        const traderRate = transaction.adjustedRate || 
          (transaction.rate !== null && transaction.kkkPercent !== null 
            ? Math.floor(transaction.rate * (1 - transaction.kkkPercent / 100) * 100) / 100 
            : transaction.rate);
        
        // Рассчитываем профит на основе скорректированного курса
        const profit = traderRate !== null ? transaction.amount / traderRate : null;

        // Преобразуем даты в ISO формат и включаем requisites
        return {
          ...transaction,
          rate: traderRate,
          profit,
          createdAt: transaction.createdAt.toISOString(),
          updatedAt: transaction.updatedAt.toISOString(),
          expired_at: transaction.expired_at.toISOString(),
          acceptedAt: transaction.acceptedAt
            ? transaction.acceptedAt.toISOString()
            : null,
          merchant: {
            ...transaction.merchant,
            createdAt: transaction.merchant.createdAt.toISOString(),
          },
          requisites: transaction.requisites ? {
            ...transaction.requisites,
            phoneNumber: transaction.requisites.phoneNumber || "",
            createdAt: transaction.requisites.createdAt.toISOString(),
            updatedAt: transaction.requisites.updatedAt.toISOString(),
          } : null,
          dealDispute: transaction.dealDispute ? {
            ...transaction.dealDispute,
            createdAt: transaction.dealDispute.createdAt.toISOString(),
            updatedAt: transaction.dealDispute.updatedAt.toISOString(),
            messages: transaction.dealDispute.messages.map(msg => ({
              ...msg,
              createdAt: msg.createdAt.toISOString(),
            })),
          } : null,
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Получение детальной информации о транзакции" },
        params: t.Object({
          id: t.String({
            description: "ID транзакции",
          }),
        }),
        response: {
          200: t.Object({
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
            profit: t.Union([t.Number(), t.Null()]),
            frozenUsdtAmount: t.Union([t.Number(), t.Null()]),
            calculatedCommission: t.Union([t.Number(), t.Null()]),
            traderId: t.Union([t.String(), t.Null()]),
            isMock: t.Boolean(),
            createdAt: t.String(),
            updatedAt: t.String(),
            acceptedAt: t.Union([t.String(), t.Null()]),
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
              token: t.String(),
              disabled: t.Boolean(),
              banned: t.Boolean(),
              createdAt: t.String(),
            }),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.String(),
              currency: t.String(),
              commissionPayin: t.Number(),
              commissionPayout: t.Number(),
              maxPayin: t.Number(),
              minPayin: t.Number(),
              maxPayout: t.Number(),
              minPayout: t.Number(),
              chancePayin: t.Number(),
              chancePayout: t.Number(),
              isEnabled: t.Boolean(),
              rateSource: t.String(),
            }),
            receipts: t.Array(
              t.Object({
                id: t.String(),
                transactionId: t.String(),
                fileData: t.String(),
                fileName: t.String(),
                isChecked: t.Boolean(),
                isFake: t.Boolean(),
                isAuto: t.Boolean(),
                createdAt: t.String(),
                updatedAt: t.String(),
              }),
            ),
            requisites: t.Union([
              t.Object({
                id: t.String(),
                recipientName: t.String(),
                cardNumber: t.String(),
                bankType: t.String(),
                phoneNumber: t.String(),
                minAmount: t.Number(),
                maxAmount: t.Number(),
                dailyLimit: t.Number(),
                monthlyLimit: t.Number(),
                intervalMinutes: t.Number(),
                methodType: t.String(),
                isArchived: t.Boolean(),
                createdAt: t.String(),
                updatedAt: t.String(),
              }),
              t.Null(),
            ]),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )

    /* ───────── PATCH /trader/transactions/:id/status - обновление статуса транзакции ───────── */
    .patch(
      "/:id/status",
      async ({ trader, params, body, error }) => {
        // Проверяем, существует ли транзакция и принадлежит ли она трейдеру
        const transaction = await db.transaction.findFirst({
          where: {
            id: params.id,
            traderId: trader.id,
          },
        });

        if (!transaction) {
          return error(404, { error: "Транзакция не найдена" });
        }

        // Проверяем, можно ли обновить статус транзакции
        if (
          transaction.status === Status.EXPIRED ||
          transaction.status === Status.CANCELED
        ) {
          return error(400, {
            error: "Невозможно обновить статус завершенной транзакции",
          });
        }

        // Разрешено менять IN_PROGRESS на READY и READY на COMPLETED
        if (
          (transaction.status === Status.IN_PROGRESS && body.status === Status.READY) ||
          (transaction.status === Status.READY && body.status === Status.COMPLETED)
        ) {
          // Allowed transitions
        } else {
          return error(400, {
            error:
              "Можно установить статус 'Готово' для транзакций 'В процессе' или 'Завершено' для транзакций 'Готово'",
          });
        }

        // Обновляем статус транзакции
        const updateData: any = { status: body.status };
        
        if (body.status === Status.READY) {
          updateData.acceptedAt = new Date();
        } else if (body.status === Status.COMPLETED) {
          updateData.completedAt = new Date();
        }
        
        const updatedTransaction = await db.transaction.update({
          where: { id: params.id },
          data: updateData,
        });

        // If IN transaction moved to READY, handle freezing and merchant balance
        if (
          transaction.type === TransactionType.IN &&
          body.status === Status.READY
        ) {
          await db.$transaction(async (prisma) => {
            // Начисляем мерчанту
            const method = await prisma.method.findUnique({
              where: { id: transaction.methodId },
            });
            if (method && transaction.rate) {
              const netAmount =
                transaction.amount -
                (transaction.amount * method.commissionPayin) / 100;
              const increment = netAmount / transaction.rate;
              await prisma.merchant.update({
                where: { id: transaction.merchantId },
                data: { balanceUsdt: { increment } },
              });
            }

            // Обрабатываем заморозку трейдера
            const txWithFreezing = await prisma.transaction.findUnique({
              where: { id: transaction.id },
            });
            
            if (txWithFreezing?.frozenUsdtAmount && txWithFreezing?.calculatedCommission) {
              const totalFrozen = txWithFreezing.frozenUsdtAmount + txWithFreezing.calculatedCommission;
              
              // Размораживаем средства
              await prisma.user.update({
                where: { id: trader.id },
                data: {
                  frozenUsdt: { decrement: totalFrozen }
                }
              });

              // Списываем замороженную сумму с траст баланса
              await prisma.user.update({
                where: { id: trader.id },
                data: {
                  trustBalance: { decrement: totalFrozen }
                }
              });

              // Начисляем прибыль трейдеру (комиссия)
              const profit = roundDown2(txWithFreezing.calculatedCommission);
              if (profit > 0) {
                await prisma.user.update({
                  where: { id: trader.id },
                  data: {
                    profitFromDeals: { increment: profit }
                  }
                });
              }
            }
          });
        }

        // If OUT transaction moved to READY, deduct from trust balance
        if (
          transaction.type === TransactionType.OUT &&
          body.status === Status.READY
        ) {
          const stake = trader.stakePercent ?? 0;
          const commission = trader.profitPercent ?? 0;
          const rubAfter = transaction.amount * (1 - commission / 100);
          const rateAdj = transaction.rate
            ? transaction.rate * (1 - stake / 100)
            : undefined;
          const deduct =
            !rateAdj || transaction.currency?.toLowerCase() === "usdt"
              ? rubAfter
              : rubAfter / rateAdj;

          // Проверяем доступный траст баланс
          const traderRecord = await db.user.findUnique({
            where: { id: trader.id },
          });
          const availableTrustBalance = traderRecord?.trustBalance ?? 0;
          if (availableTrustBalance < deduct) {
            return error(400, { error: "Недостаточно баланса" });
          }

          await db.user.update({
            where: { id: trader.id },
            data: { trustBalance: { decrement: deduct } },
          });
        }

        // If transaction moved to COMPLETED, handle final accounting
        if (body.status === Status.COMPLETED) {
          // For IN transactions, profit is already added at READY status
          // For OUT transactions, we might need additional handling
          // Currently, no additional accounting needed at COMPLETED status
        }

        const hook = await notifyByStatus({
          id: updatedTransaction.id,
          status: updatedTransaction.status,
          successUri: updatedTransaction.successUri,
          failUri: updatedTransaction.failUri,
          callbackUri: updatedTransaction.callbackUri,
        });

        return {
          success: true,
          transaction: {
            ...updatedTransaction,
            rate: updatedTransaction.adjustedRate || 
              (updatedTransaction.rate !== null && updatedTransaction.kkkPercent !== null 
                ? Math.floor(updatedTransaction.rate * (1 - updatedTransaction.kkkPercent / 100) * 100) / 100 
                : updatedTransaction.rate),
            profit: updatedTransaction.adjustedRate !== null 
              ? updatedTransaction.amount / updatedTransaction.adjustedRate 
              : (updatedTransaction.rate !== null && updatedTransaction.kkkPercent !== null
                ? updatedTransaction.amount / (Math.floor(updatedTransaction.rate * (1 - updatedTransaction.kkkPercent / 100) * 100) / 100)
                : null),
            createdAt: updatedTransaction.createdAt.toISOString(),
            updatedAt: updatedTransaction.updatedAt.toISOString(),
            expired_at: updatedTransaction.expired_at.toISOString(),
            acceptedAt: updatedTransaction.acceptedAt?.toISOString() ?? null,
          },
          hook,
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Обновление статуса транзакции" },
        params: t.Object({
          id: t.String({
            description: "ID транзакции",
          }),
        }),
        body: t.Object({
          status: t.Enum(Status, {
            description: "Новый статус транзакции",
          }),
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
              profit: t.Union([t.Number(), t.Null()]),
              frozenUsdtAmount: t.Union([t.Number(), t.Null()]),
              calculatedCommission: t.Union([t.Number(), t.Null()]),
              traderId: t.Union([t.String(), t.Null()]),
              isMock: t.Boolean(),
              createdAt: t.String(),
              updatedAt: t.String(),
              acceptedAt: t.Union([t.String(), t.Null()]),
            }),
            hook: t.Optional(t.Unknown()),
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      },
    );
