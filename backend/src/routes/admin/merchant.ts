/**
 * routes/admin/merchant.ts
 * ---------------------------------------------------------------------------
 * Админ-маршруты для управления мерчантами + статистика транзакций.
 *
 *   POST   /admin/merchant/create   — создать мерчанта
 *   GET    /admin/merchant/list     — список + totalTx + paidTx
 *   DELETE /admin/merchant/delete   — удалить мерчанта
 * ---------------------------------------------------------------------------
 */

import { Elysia, t } from 'elysia'
import { db } from '@/db'
import { Prisma, Status, TransactionType, PayoutStatus } from '@prisma/client'
import ErrorSchema from '@/types/error'
import { randomBytes } from 'node:crypto'

/* ─────────── Общие схемы ─────────── */

const AuthHeader = t.Object({ 'x-admin-key': t.String() })

const MerchantBase = t.Object({
  id: t.String(),
  name: t.String(),
  token: t.String({ description: 'Уникальный API-токен' }),
  apiKeyPublic: t.Nullable(t.String()),
  apiKeyPrivate: t.Nullable(t.String()),
  disabled: t.Boolean(),
  banned: t.Boolean(),
  createdAt: t.String(),
  balanceUsdt: t.Number(),
  countInRubEquivalent: t.Boolean()
})

const MerchantWithCounters = t.Intersect([
  MerchantBase,
  t.Object({
    totalTx: t.Number({ description: 'Всего транзакций' }),
    paidTx:  t.Number({ description: 'Транзакций со статусом READY' }),
    balanceRub: t.Number({ description: 'Баланс в рублях с учетом комиссий' })
  })
])

/* ─────────── Утилиты ─────────── */

const toISO = <T extends { createdAt: Date }>(obj: T) =>
  ({ ...obj, createdAt: obj.createdAt.toISOString() } as any)

/* ─────────── Роутер ─────────── */

export default (app: Elysia) =>
  app
    /* ───────── POST /admin/merchant/create ───────── */
    .post(
      '/create',
      async ({ body, error }) => {
        try {
          const m = await db.merchant.create({
            data: { name: body.name, token: randomBytes(32).toString('hex') },
            select: { id: true, name: true, token: true, createdAt: true, balanceUsdt: true, apiKeyPublic: true, apiKeyPrivate: true, disabled: true, banned: true, countInRubEquivalent: true }
          })
          return new Response(JSON.stringify(toISO(m)), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002'
          )
            return error(409, { error: 'Мерчант с таким именем уже существует' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Создать нового мерчанта' },
        headers: AuthHeader,
        body: t.Object({ name: t.String({ description: 'Название мерчанта' }) }),
        response: { 201: MerchantBase, 409: ErrorSchema }
      }
    )

    /* ───────── POST /admin/merchant/settle ───────── */
    .post(
      '/settle',
      async ({ body, error }) => {
        const merchant = await db.merchant.findUnique({ where: { id: body.id } });
        if (!merchant) return error(404, { error: 'Мерчант не найден' });

        const transactions = await db.transaction.findMany({
          where: {
            merchantId: merchant.id,
            type: TransactionType.IN,
            status: Status.READY,
            settlementId: null,
          },
          include: { method: true },
        });

        let amount = 0;
        for (const tx of transactions) {
          if (tx.rate && tx.method) {
            const netAmount = tx.amount - (tx.amount * tx.method.commissionPayin) / 100;
            amount += netAmount / tx.rate;
          }
        }

        const settlement = await db.merchantSettlement.create({
          data: {
            merchantId: merchant.id,
            amount,
            transactions: { connect: transactions.map((t) => ({ id: t.id })) },
          },
        });

        await db.merchant.update({
          where: { id: merchant.id },
          data: { balanceUsdt: 0 },
        });

        await db.transaction.updateMany({
          where: { id: { in: transactions.map((t) => t.id) } },
          data: { settlementId: settlement.id },
        });

        return { ok: true, amount };
      },
      {
        tags: ['admin'],
        detail: { summary: 'Обнулить баланс мерчанта и записать сетл' },
        headers: AuthHeader,
        body: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean(), amount: t.Number() }),
          404: ErrorSchema,
        },
      },
    )

    /* ───────── GET /admin/merchant/settlements ───────── */
    .get(
      '/settlements',
      async () => {
        const items = await db.merchantSettlement.findMany({
          include: { merchant: true, transactions: true },
          orderBy: { createdAt: 'desc' },
        });
        return items.map((i) => ({
          id: i.id,
          amount: i.amount,
          createdAt: i.createdAt.toISOString(),
          merchant: { id: i.merchant.id, name: i.merchant.name },
          transactions: i.transactions.map((t) => ({
            id: t.id,
            numericId: t.numericId,
          })),
        }));
      },
      {
        tags: ['admin'],
        detail: { summary: 'История сетлов мерчантов' },
        headers: AuthHeader,
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              amount: t.Number(),
              createdAt: t.String(),
              merchant: t.Object({ id: t.String(), name: t.String() }),
            }),
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────── GET /admin/merchant/list ───────── */
    .get(
      '/list',
      async () => {
        /* 1. Получаем мерчантов */
        const merchants = await db.merchant.findMany({
          select: { id: true, name: true, token: true, createdAt: true, balanceUsdt: true, apiKeyPublic: true, apiKeyPrivate: true, disabled: true, banned: true, countInRubEquivalent: true }
        })

        if (!merchants.length) return []

        const ids = merchants.map((m) => m.id)

        /* 2. Агрегируем транзакции одним groupBy */
        const grouped = await db.transaction.groupBy({
          by: ['merchantId'],
          _count: { _all: true },
          where: { merchantId: { in: ids } }
        })

        const groupedPaid = await db.transaction.groupBy({
          by: ['merchantId'],
          _count: { _all: true },
          where: {
            merchantId: { in: ids },
            status: Status.READY
          }
        })

        /* 3. Быстрый lookup по merchantId → counts */
        const totalMap = Object.fromEntries(
          grouped.map((g) => [g.merchantId, g._count._all])
        )
        const paidMap = Object.fromEntries(
          groupedPaid.map((g) => [g.merchantId, g._count._all])
        )

        // Рассчитываем рублевый баланс для каждого мерчанта
        const merchantsWithRubBalance = await Promise.all(
          merchants.map(async (m) => {
            // Получаем успешные транзакции мерчанта
            const successfulTransactions = await db.transaction.findMany({
              where: {
                merchantId: m.id,
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

            // Получаем успешные выплаты мерчанта
            const successfulPayouts = await db.payout.findMany({
              where: {
                merchantId: m.id,
                status: PayoutStatus.COMPLETED,
              },
              select: {
                amount: true,
                feePercent: true,
              },
            });

            // Рассчитываем рублевый баланс
            let balanceRub = 0;

            // Добавляем транзакции
            for (const tx of successfulTransactions) {
              const commission = tx.type === TransactionType.IN 
                ? tx.method.commissionPayin 
                : tx.method.commissionPayout;
              const netAmount = tx.amount * (1 - commission / 100);
              balanceRub += netAmount;
            }

            // Добавляем выплаты (для выплат комиссия прибавляется к сумме)
            for (const payout of successfulPayouts) {
              const netAmount = payout.amount * (1 + payout.feePercent / 100);
              balanceRub -= netAmount; // Выплаты уменьшают баланс
            }

            return {
              ...toISO(m),
              totalTx: totalMap[m.id] ?? 0,
              paidTx: paidMap[m.id] ?? 0,
              balanceRub: Math.round(balanceRub * 100) / 100, // Округляем до копеек
            };
          })
        );

        return merchantsWithRubBalance;
      },
      {
        tags: ['admin'],
        detail: { summary: 'Список мерчантов + статистика транзакций' },
        headers: AuthHeader,
        response: { 200: t.Array(MerchantWithCounters) }
      }
    )

    /* ───────── PUT /admin/merchant/update ───────── */
    .put(
      '/update',
      async ({ body, error }) => {
        try {
          const merchant = await db.merchant.update({
            where: { id: body.id },
            data: {
              name: body.name,
              disabled: body.disabled,
              banned: body.banned,
              countInRubEquivalent: body.countInRubEquivalent,
            },
            select: { id: true, name: true, token: true, createdAt: true, balanceUsdt: true, disabled: true, banned: true, apiKeyPublic: true, apiKeyPrivate: true, countInRubEquivalent: true }
          })
          return toISO(merchant)
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Мерчант не найден' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Обновить мерчанта' },
        headers: AuthHeader,
        body: t.Object({ 
          id: t.String(),
          name: t.String(),
          disabled: t.Optional(t.Boolean()),
          banned: t.Optional(t.Boolean()),
          countInRubEquivalent: t.Optional(t.Boolean()),
        }),
        response: {
          200: t.Intersect([MerchantBase, t.Object({ disabled: t.Boolean(), banned: t.Boolean(), countInRubEquivalent: t.Boolean() })]),
          404: ErrorSchema
        }
      }
    )

    /* ───────── GET /admin/merchant/:id/settlements ───────── */
    .get(
      '/:id/settlements',
      async ({ params: { id }, error }) => {
        const merchant = await db.merchant.findUnique({
          where: { id },
          include: {
            settlements: {
              orderBy: { createdAt: 'desc' },
              include: {
                _count: {
                  select: { transactions: true }
                }
              }
            }
          }
        })
        
        if (!merchant) return error(404, { error: 'Мерчант не найден' })
        
        // Подсчет суммы готовой к сеттлу
        const pendingTransactions = await db.transaction.findMany({
          where: {
            merchantId: id,
            type: TransactionType.IN,
            status: Status.READY,
            settlementId: null,
          },
          include: { method: true },
        })
        
        let pendingAmount = 0
        for (const tx of pendingTransactions) {
          if (tx.rate && tx.method) {
            const netAmount = tx.amount - (tx.amount * tx.method.commissionPayin) / 100
            pendingAmount += netAmount / tx.rate
          }
        }
        
        return {
          settlements: merchant.settlements.map(s => ({
            id: s.id,
            amount: s.amount,
            createdAt: s.createdAt.toISOString(),
            transactionCount: s._count.transactions
          })),
          pendingAmount
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить сеттлы мерчанта' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            settlements: t.Array(t.Object({
              id: t.String(),
              amount: t.Number(),
              createdAt: t.String(),
              transactionCount: t.Number(),
            })),
            pendingAmount: t.Number(),
          }),
          404: ErrorSchema
        }
      }
    )

    /* ───────── GET /admin/merchant/:id ───────── */
    .get(
      '/:id',
      async ({ params: { id }, error }) => {
        const merchant = await db.merchant.findUnique({
          where: { id },
          include: {
            merchantMethods: {
              include: {
                method: true
              }
            }
          }
        })
        
        if (!merchant) return error(404, { error: 'Мерчант не найден' })
        
        // Рассчитываем рублевый баланс
        const successfulTransactions = await db.transaction.findMany({
          where: {
            merchantId: id,
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

        const successfulPayouts = await db.payout.findMany({
          where: {
            merchantId: id,
            status: PayoutStatus.COMPLETED,
          },
          select: {
            amount: true,
            feePercent: true,
          },
        });

        let balanceRub = 0;

        // Добавляем транзакции
        for (const tx of successfulTransactions) {
          const commission = tx.type === TransactionType.IN 
            ? tx.method.commissionPayin 
            : tx.method.commissionPayout;
          const netAmount = tx.amount * (1 - commission / 100);
          balanceRub += netAmount;
        }

        // Добавляем выплаты (для выплат комиссия прибавляется к сумме)
        for (const payout of successfulPayouts) {
          const netAmount = payout.amount * (1 + payout.feePercent / 100);
          balanceRub -= netAmount; // Выплаты уменьшают баланс
        }
        
        return {
          ...toISO(merchant),
          apiKeyPublic: merchant.apiKeyPublic,
          apiKeyPrivate: merchant.apiKeyPrivate,
          balanceRub: Math.round(balanceRub * 100) / 100,
          merchantMethods: merchant.merchantMethods.map(mm => ({
            id: mm.id,
            isEnabled: mm.isEnabled,
            method: {
              id: mm.method.id,
              code: mm.method.code,
              name: mm.method.name,
              type: mm.method.type,
              currency: mm.method.currency,
            }
          }))
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить мерчанта с методами' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            id: t.String(),
            name: t.String(),
            token: t.String(),
            apiKeyPublic: t.Nullable(t.String()),
            apiKeyPrivate: t.Nullable(t.String()),
            disabled: t.Boolean(),
            banned: t.Boolean(),
            balanceUsdt: t.Number(),
            balanceRub: t.Number(),
            createdAt: t.String(),
            merchantMethods: t.Array(t.Object({
              id: t.String(),
              isEnabled: t.Boolean(),
              method: t.Object({
                id: t.String(),
                code: t.String(),
                name: t.String(),
                type: t.String(),
                currency: t.String(),
              })
            }))
          }),
          404: ErrorSchema
        }
      }
    )

    /* ───────── POST /admin/merchant/:id/methods ───────── */
    .post(
      '/:id/methods',
      async ({ params: { id }, body, error }) => {
        const merchant = await db.merchant.findUnique({ where: { id } })
        if (!merchant) return error(404, { error: 'Мерчант не найден' })

        const method = await db.method.findUnique({ where: { id: body.methodId } })
        if (!method) return error(404, { error: 'Метод не найден' })

        try {
          const merchantMethod = await db.merchantMethod.create({
            data: {
              merchantId: id,
              methodId: body.methodId,
              isEnabled: body.isEnabled ?? true,
            },
            include: {
              method: true
            }
          })

          return {
            id: merchantMethod.id,
            isEnabled: merchantMethod.isEnabled,
            method: {
              id: merchantMethod.method.id,
              code: merchantMethod.method.code,
              name: merchantMethod.method.name,
              type: merchantMethod.method.type,
              currency: merchantMethod.method.currency,
            }
          }
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002'
          )
            return error(409, { error: 'Метод уже привязан к мерчанту' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Добавить метод к мерчанту' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({ 
          methodId: t.String(),
          isEnabled: t.Optional(t.Boolean()),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            isEnabled: t.Boolean(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.String(),
              currency: t.String(),
            })
          }),
          404: ErrorSchema,
          409: ErrorSchema
        }
      }
    )

    /* ───────── DELETE /admin/merchant/:id/methods/:methodId ───────── */
    .delete(
      '/:id/methods/:methodId',
      async ({ params: { id, methodId }, error }) => {
        try {
          await db.merchantMethod.delete({
            where: {
              merchantId_methodId: {
                merchantId: id,
                methodId: methodId
              }
            }
          })
          return { ok: true }
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Связь мерчант-метод не найдена' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Удалить метод у мерчанта' },
        headers: AuthHeader,
        params: t.Object({ id: t.String(), methodId: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema
        }
      }
    )

    /* ───────── PUT /admin/merchant/:id/methods/:methodId ───────── */
    .put(
      '/:id/methods/:methodId',
      async ({ params: { id, methodId }, body, error }) => {
        try {
          const merchantMethod = await db.merchantMethod.update({
            where: {
              merchantId_methodId: {
                merchantId: id,
                methodId: methodId
              }
            },
            data: { isEnabled: body.isEnabled },
            include: { method: true }
          })

          return {
            id: merchantMethod.id,
            isEnabled: merchantMethod.isEnabled,
            method: {
              id: merchantMethod.method.id,
              code: merchantMethod.method.code,
              name: merchantMethod.method.name,
              type: merchantMethod.method.type,
              currency: merchantMethod.method.currency,
            }
          }
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Связь мерчант-метод не найдена' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Обновить метод мерчанта' },
        headers: AuthHeader,
        params: t.Object({ id: t.String(), methodId: t.String() }),
        body: t.Object({ isEnabled: t.Boolean() }),
        response: {
          200: t.Object({
            id: t.String(),
            isEnabled: t.Boolean(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.String(),
              currency: t.String(),
            })
          }),
          404: ErrorSchema
        }
      }
    )

    /* ───────── GET /admin/merchant/:id/milk-deals ───────── */
    .get(
      '/:id/milk-deals',
      async ({ params: { id }, query, error }) => {
        const merchant = await db.merchant.findUnique({ where: { id } })
        if (!merchant) return error(404, { error: 'Мерчант не найден' })

        // Build filters
        const where: any = {
          merchantId: id,
          type: TransactionType.IN,
          status: Status.MILK,
        }

        // Add filters
        if (query.startDate) {
          where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) }
        }
        if (query.endDate) {
          where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) }
        }
        if (query.amountMin) {
          where.amount = { ...where.amount, gte: query.amountMin }
        }
        if (query.amountMax) {
          where.amount = { ...where.amount, lte: query.amountMax }
        }
        if (query.currency) {
          where.currency = query.currency
        }
        if (query.txId) {
          where.orderId = { contains: query.txId }
        }

        // Determine reason based on query
        let reasonFilter: any = {}
        if (query.reason === 'provider') {
          // FAIL_PROVIDER: client didn't pay, no requisites issued
          reasonFilter = {
            requisites: null,
          }
        } else if (query.reason === 'aggregator') {
          // FAIL_AGGREGATOR: requisites issued but not paid
          reasonFilter = {
            requisites: { isNot: null },
          }
        }
        // If reason === 'success' or not specified, include all MILK deals

        const finalWhere = { ...where, ...reasonFilter }

        // Get total counts for each category
        const [totalProvider, totalAggregator, totalAll] = await Promise.all([
          db.transaction.count({
            where: {
              merchantId: id,
              type: TransactionType.IN,
              status: Status.MILK,
              requisites: null,
            }
          }),
          db.transaction.count({
            where: {
              merchantId: id,
              type: TransactionType.IN,
              status: Status.MILK,
              requisites: { isNot: null },
            }
          }),
          db.transaction.count({
            where: {
              merchantId: id,
              type: TransactionType.IN,
              status: Status.MILK,
            }
          }),
        ])

        // Pagination
        const page = query.page || 1
        const pageSize = query.pageSize || 50
        const skip = (page - 1) * pageSize

        // Get paginated data
        const [transactions, total] = await Promise.all([
          db.transaction.findMany({
            where: finalWhere,
            include: {
              method: true,
              requisites: true,
              trader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
          }),
          db.transaction.count({ where: finalWhere })
        ])

        // Determine reason for each transaction
        const deals = transactions.map(tx => {
          let reason: string = 'SUCCESS'
          if (!tx.requisites) {
            reason = 'FAIL_PROVIDER'
          } else {
            reason = 'FAIL_AGGREGATOR'
          }

          return {
            id: tx.id,
            numericId: tx.numericId,
            orderId: tx.orderId,
            amount: tx.amount,
            currency: tx.currency || 'RUB',
            status: tx.status,
            reason,
            clientName: tx.clientName,
            userIp: tx.userIp,
            method: tx.method ? {
              id: tx.method.id,
              code: tx.method.code,
              name: tx.method.name,
            } : null,
            trader: tx.trader,
            requisites: tx.requisites ? {
              id: tx.requisites.id,
              cardNumber: tx.requisites.cardNumber,
              bankType: tx.requisites.bankType,
            } : null,
            createdAt: tx.createdAt.toISOString(),
            expiredAt: tx.expired_at.toISOString(),
          }
        })

        return {
          statistics: {
            failProvider: totalProvider,
            failAggregator: totalAggregator,
            success: totalAll - totalProvider - totalAggregator,
            total: totalAll,
          },
          deals,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          }
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить milk deals мерчанта' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        query: t.Object({
          reason: t.Optional(t.Union([t.Literal('provider'), t.Literal('aggregator'), t.Literal('success')])),
          startDate: t.Optional(t.String()),
          endDate: t.Optional(t.String()),
          amountMin: t.Optional(t.Number()),
          amountMax: t.Optional(t.Number()),
          currency: t.Optional(t.String()),
          txId: t.Optional(t.String()),
          page: t.Optional(t.Number({ minimum: 1 })),
          pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        }),
        response: {
          200: t.Object({
            statistics: t.Object({
              failProvider: t.Number(),
              failAggregator: t.Number(),
              success: t.Number(),
              total: t.Number(),
            }),
            deals: t.Array(t.Object({
              id: t.String(),
              numericId: t.Number(),
              orderId: t.String(),
              amount: t.Number(),
              currency: t.String(),
              status: t.String(),
              reason: t.String(),
              clientName: t.String(),
              userIp: t.Nullable(t.String()),
              method: t.Nullable(t.Object({
                id: t.String(),
                code: t.String(),
                name: t.String(),
              })),
              trader: t.Nullable(t.Object({
                id: t.String(),
                name: t.String(),
                email: t.String(),
              })),
              requisites: t.Nullable(t.Object({
                id: t.String(),
                cardNumber: t.String(),
                bankType: t.String(),
              })),
              createdAt: t.String(),
              expiredAt: t.String(),
            })),
            pagination: t.Object({
              page: t.Number(),
              pageSize: t.Number(),
              total: t.Number(),
              totalPages: t.Number(),
            }),
          }),
          404: ErrorSchema
        }
      }
    )

    /* ───────── GET /admin/merchant/:id/extra-settlements ───────── */
    .get(
      '/:id/extra-settlements',
      async ({ params: { id }, query, error }) => {
        const merchant = await db.merchant.findUnique({ where: { id } })
        if (!merchant) return error(404, { error: 'Мерчант не найден' })

        const page = query.page || 1
        const pageSize = query.pageSize || 50
        const skip = (page - 1) * pageSize

        const where: any = { merchantId: id }
        if (query.startDate) {
          where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) }
        }
        if (query.endDate) {
          where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) }
        }

        const [settlements, total] = await Promise.all([
          db.merchantSettlement.findMany({
            where,
            include: {
              transactions: {
                select: {
                  id: true,
                  numericId: true,
                  amount: true,
                  status: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
          }),
          db.merchantSettlement.count({ where })
        ])

        return {
          settlements: settlements.map(s => ({
            id: s.id,
            amount: s.amount,
            transactionCount: s.transactions.length,
            reason: 'manual', // или другое поле если добавите в схему
            createdAt: s.createdAt.toISOString(),
          })),
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          }
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить дополнительные сеттлы мерчанта' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        query: t.Object({
          startDate: t.Optional(t.String()),
          endDate: t.Optional(t.String()),
          page: t.Optional(t.Number({ minimum: 1 })),
          pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        }),
        response: {
          200: t.Object({
            settlements: t.Array(t.Object({
              id: t.String(),
              amount: t.Number(),
              transactionCount: t.Number(),
              reason: t.String(),
              createdAt: t.String(),
            })),
            pagination: t.Object({
              page: t.Number(),
              pageSize: t.Number(),
              total: t.Number(),
              totalPages: t.Number(),
            }),
          }),
          404: ErrorSchema
        }
      }
    )

    /* ───────── DELETE /admin/merchant/delete ───────── */
    .delete(
      '/delete',
      async ({ body, error }) => {
        try {
          await db.merchant.delete({ where: { id: body.id } })
          return { ok: true }
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Мерчант не найден' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Удалить мерчанта' },
        headers: AuthHeader,
        body: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema
        }
      }
    )
