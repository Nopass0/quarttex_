/**
 * admin/transactions.ts
 * ---------------------------------------------------------------------------
 * Полный набор административных маршрутов для управления транзакциями.
 *
 * ▸ Elysia + Prisma + TypeBox (t)
 * ▸ Все даты сериализуются в ISO-формат, поэтому схемы t.String() валидны.
 * ▸ В ответах не возвращаем `rate: null` (заменяем на undefined).
 * ▸ Добавлено частичное редактирование (PATCH /:id).
 * ▸ Каждый маршрут снабжён полной документацией — headers, params/query/body,
 *   описания, схемы ответов и ошибок.
 * ---------------------------------------------------------------------------
 */

import { Elysia, t } from 'elysia'
import { db } from '@/db'
import {
  Prisma,
  Status,
  TransactionType,
  MethodType,
  Currency,
  BankType
} from '@prisma/client'
import ErrorSchema from '@/types/error'
import { notifyByStatus } from '@/utils/notify'
import axios from 'axios'

/* ───────────────────── helpers ───────────────────── */

/** Унифицированная сериализация транзакции и связанных сущностей */
const serializeTransaction = (trx: any) => ({
  ...trx,
  expired_at: trx.expired_at.toISOString(),
  createdAt: trx.createdAt.toISOString(),
  updatedAt: trx.updatedAt.toISOString(),
  merchant: {
    ...trx.merchant,
    createdAt: trx.merchant.createdAt.toISOString()
  },
  trader: trx.trader
    ? { ...trx.trader, createdAt: trx.trader.createdAt.toISOString() }
    : null,
  requisites: trx.requisites ?? null,
  ...(trx.rate === null ? { rate: undefined } : {})
})

/** Обновление + include + сериализация (чтобы не дублировать код) */
const updateTrx = async (
  id: string,
  data: Prisma.TransactionUpdateInput
) =>
  serializeTransaction(
    await db.transaction.update({
      where: { id },
      data,
      include: {
        merchant: true,
        method: true,
        trader: true,
        requisites: {
          select: {
            id: true,
            bankType: true,
            cardNumber: true,
            phoneNumber: true,
            recipientName: true,
          },
        },
      }
    })
  )

/* ───────────────────── reusable schemas ───────────────────── */

const TransactionResponseSchema = t.Object({
  id: t.String(),
  merchantId: t.String(),
  amount: t.Number(),
  assetOrBank: t.String(),
  orderId: t.String(),
  methodId: t.String(),
  currency: t.Optional(t.String()),
  userId: t.String(),
  userIp: t.Optional(t.String()),
  callbackUri: t.String(),
  successUri: t.String(),
  failUri: t.String(),
  type: t.Enum(TransactionType),
  expired_at: t.String(),
  commission: t.Number(),
  clientName: t.String(),
  status: t.Enum(Status),
  rate: t.Optional(t.Number()),
  isMock: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
  merchant: t.Object({
    id: t.String(),
    name: t.String(),
    token: t.String(),
    createdAt: t.String()
  }),
  method: t.Object({
    id: t.String(),
    code: t.String(),
    name: t.String(),
    type: t.Enum(MethodType),
    currency: t.Enum(Currency)
  }),
  trader: t.Object({
    id: t.String(),
    email: t.String(),
    banned: t.Boolean(),
    createdAt: t.String()
  }),
  requisites: t.Optional(
    t.Object({
      id: t.String(),
      bankType: t.Enum(BankType),
      cardNumber: t.String(),
      phoneNumber: t.Optional(t.String()),
      recipientName: t.String(),
    })
  )
})

const TransactionWithHookSchema = t.Object({
  transaction: TransactionResponseSchema,
  hook: t.Optional(t.Unknown())
})

const AuthHeaderSchema = t.Object({ 'x-admin-key': t.String() })

/* ───────────────────── router ───────────────────── */

export default (app: Elysia) =>
  app
    /* ─────────── POST /admin/transactions/create ─────────── */
    .post(
      '/create',
      async ({ body, error }) => {
        try {
          /* Проверка FK */
          const [merchant, method, user] = await Promise.all([
            db.merchant.findUnique({ where: { id: body.merchantId } }),
            db.method.findUnique({ where: { id: body.methodId } }),
            db.user.findUnique({ where: { id: body.userId } })
          ])
          if (!merchant) return error(404, { error: 'Мерчант не найден' })
          if (!method) return error(404, { error: 'Метод не найден' })
          if (!user) return error(404, { error: 'Пользователь не найден' })

          const trx = await db.transaction.create({
            data: {
              ...body,
              expired_at:
                body.expired_at ??
                new Date(Date.now() + 24 * 60 * 60 * 1000),
              isMock: true
            },
            include: { merchant: true, method: true, trader: true }
          })

          return new Response(
            JSON.stringify(serializeTransaction(trx)),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002'
          )
            return error(409, { error: 'orderId уже используется' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Создание новой транзакции (моковая)' },
        headers: AuthHeaderSchema,
        body: t.Object({
          merchantId: t.String({ description: 'ID мерчанта' }),
          amount: t.Number({ description: 'Сумма' }),
          assetOrBank: t.String({ description: 'Актив/банк' }),
          orderId: t.String({ description: 'Уникальный orderId' }),
          methodId: t.String({ description: 'ID метода' }),
          currency: t.Optional(t.String()),
          userId: t.String({ description: 'ID пользователя' }),
          userIp: t.Optional(t.String()),
          callbackUri: t.String(),
          successUri: t.String(),
          failUri: t.String(),
          type: t.Optional(t.Enum(TransactionType)),
          expired_at: t.Optional(t.String()),
          commission: t.Number(),
          clientName: t.String(),
          status: t.Optional(t.Enum(Status)),
          rate: t.Optional(t.Number())
        }),
        response: {
          201: TransactionResponseSchema,
          404: ErrorSchema,
          409: ErrorSchema
        }
      }
    )

/* ──────────── GET /admin/transactions/list ──────────── */
.get(
  '/list',
  async ({ query }) => {
    const where: Prisma.TransactionWhereInput = {};

    /* ------- фильтры из query-строки ------- */
    if (query.status)      where.status     = query.status as Status;
    if (query.type)        where.type       = query.type as TransactionType;
    if (query.merchantId)  where.merchantId = query.merchantId;
    if (query.methodId)    where.methodId   = query.methodId;
    if (query.userId)      where.userId     = query.userId;
    if (query.isMock !== undefined)
      where.isMock = query.isMock === 'true';

    if (query.createdFrom)
      where.createdAt = { ...where.createdAt, gte: new Date(query.createdFrom) };
    if (query.createdTo)
      where.createdAt = { ...where.createdAt, lte: new Date(query.createdTo) };

    if (query.search) {
      const s = query.search;
      where.OR = [
        { id          : { contains: s, mode: 'insensitive' } },
        { orderId     : { contains: s, mode: 'insensitive' } },
        { assetOrBank : { contains: s, mode: 'insensitive' } },
        { clientName  : { contains: s, mode: 'insensitive' } },
        { currency    : { contains: s, mode: 'insensitive' } },
        { userIp      : { contains: s, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (query.sortBy)
      orderBy[query.sortBy] = query.sortOrder === 'desc' ? 'desc' : 'asc';
    else orderBy.updatedAt = 'desc';

    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          merchant : true,
          method   : true,
          trader   : { select: { id: true, name: true, email: true } },
          requisites: {
            select: {
              id: true,
              bankType: true,
              cardNumber: true,
              phoneNumber: true,
              recipientName: true,
            },
          },
        },
      }),
      db.transaction.count({ where }),
    ]);

    /* сериализация дат → ISO */
    const data = rows.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },
  {
    tags: ['admin'],
    detail : { summary: 'Список транзакций (фильтры, сортировка, пагинация)' },
    headers: AuthHeaderSchema,
    query  : t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      status: t.Optional(t.String()),
      type: t.Optional(t.String()),
      merchantId: t.Optional(t.String()),
      methodId  : t.Optional(t.String()),
      userId    : t.Optional(t.String()),
      isMock    : t.Optional(t.String()),
      createdFrom: t.Optional(t.String()),
      createdTo  : t.Optional(t.String()),
      search   : t.Optional(t.String()),
      sortBy   : t.Optional(t.String()),
      sortOrder: t.Optional(t.String()),
    }),
  },
)


    /* ─────────── GET /admin/transactions/:id ─────────── */
    .get(
      '/:id',
      async ({ params, error }) => {
        try {
          const trx = await db.transaction.findUniqueOrThrow({
            where: { id: params.id },
            include: { merchant: true, method: true, trader: true }
          })
          return serializeTransaction(trx)
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Транзакция не найдена' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить транзакцию по ID' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        response: { 200: TransactionResponseSchema, 404: ErrorSchema }
      }
    )

    /* ─────────── PATCH /admin/transactions/:id ─────────── */
    .patch(
      '/:id',
      async ({ params, body, error }) => {
        try {
          const trx = await updateTrx(params.id, {
            ...body,
            expired_at: body.expired_at
              ? new Date(body.expired_at)
              : undefined,
            isMock: true
          })

          const hook = await notifyByStatus(trx)

          return { transaction: trx, hook }
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Транзакция не найдена' })
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002'
          )
            return error(409, { error: 'orderId уже используется' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Частичное редактирование транзакции' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Partial(
          t.Object({
            amount: t.Number(),
            assetOrBank: t.String(),
            orderId: t.String(),
            methodId: t.String(),
            merchantId: t.String(),
            currency: t.Optional(t.String()),
            userId: t.String(),
            userIp: t.Optional(t.String()),
            callbackUri: t.String(),
            successUri: t.String(),
            failUri: t.String(),
            type: t.Enum(TransactionType),
            expired_at: t.Optional(t.String()),
            commission: t.Number(),
            clientName: t.String(),
            status: t.Enum(Status),
            rate: t.Optional(t.Number())
          })
        ),
        response: { 200: TransactionWithHookSchema, 404: ErrorSchema, 409: ErrorSchema }
      }
    )

    /* ─────────── PUT /admin/transactions/update ─────────── */
    .put(
      '/update',
      async ({ body, error }) =>
        updateTrx(body.id, {
          ...body,
          expired_at: body.expired_at ? new Date(body.expired_at) : undefined,
          isMock: true
        }).catch((e) => {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Транзакция не найдена' })
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002'
          )
            return error(409, { error: 'orderId уже используется' })
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2003'
          )
            return error(400, {
              error: 'Указанный мерчант, метод или пользователь не существует'
            })
          throw e
        }),
      {
        tags: ['admin'],
        detail: { summary: 'Полное обновление транзакции' },
        headers: AuthHeaderSchema,
        body: t.Object({
          id: t.String(),
          merchantId: t.String(),
          amount: t.Number(),
          assetOrBank: t.String(),
          orderId: t.String(),
          methodId: t.String(),
          currency: t.Optional(t.String()),
          userId: t.String(),
          userIp: t.Optional(t.String()),
          callbackUri: t.String(),
          successUri: t.String(),
          failUri: t.String(),
          type: t.Enum(TransactionType),
          expired_at: t.Optional(t.String()),
          commission: t.Number(),
          clientName: t.String(),
          status: t.Enum(Status),
          rate: t.Optional(t.Number())
        }),
        response: {
          200: TransactionResponseSchema,
          404: ErrorSchema,
          409: ErrorSchema,
          400: ErrorSchema
        }
      }
    )

    /* ─────────── PUT /admin/transactions/status ─────────── */
    .put(
      '/status',
      async ({ body, error }) => {
        try {
          const existing = await db.transaction.findUnique({
            where: { id: body.id },
          });
          if (!existing)
            return error(404, { error: 'Транзакция не найдена' });

          const trx = await updateTrx(body.id, { status: body.status });

          // Размораживаем средства при отмене транзакции
          if (
            existing.status !== Status.CANCELED &&
            body.status === Status.CANCELED &&
            existing.type === TransactionType.IN &&
            existing.traderId &&
            existing.frozenUsdtAmount &&
            existing.calculatedCommission
          ) {
            const totalToUnfreeze = existing.frozenUsdtAmount + existing.calculatedCommission;
            
            await db.user.update({
              where: { id: existing.traderId },
              data: {
                frozenUsdt: { decrement: totalToUnfreeze }
              }
            });
          }

          if (
            existing.status !== Status.READY &&
            body.status === Status.READY &&
            existing.type === TransactionType.IN
          ) {
            await db.$transaction(async (prisma) => {
              // Начисляем мерчанту
              const method = await prisma.method.findUnique({
                where: { id: existing.methodId },
              });
              if (method && existing.rate) {
                const rateWithFee =
                  existing.rate * (1 + method.commissionPayin / 100);
                const increment = existing.amount / rateWithFee;
                await prisma.merchant.update({
                  where: { id: existing.merchantId },
                  data: { balanceUsdt: { increment } },
                });
              }

              // Обрабатываем заморозку трейдера
              if (existing.traderId && existing.frozenUsdtAmount && existing.calculatedCommission) {
                const totalFrozen = existing.frozenUsdtAmount + existing.calculatedCommission;
                
                // Размораживаем средства
                await prisma.user.update({
                  where: { id: existing.traderId },
                  data: {
                    frozenUsdt: { decrement: totalFrozen }
                  }
                });

                // Вычисляем фактически потраченную сумму (по курсу мерчанта)
                const actualSpent = existing.amount / existing.rate!;
                
                // Списываем фактически потраченную сумму с баланса
                await prisma.user.update({
                  where: { id: existing.traderId },
                  data: {
                    balanceUsdt: { decrement: actualSpent }
                  }
                });

                // Начисляем прибыль трейдеру
                const profit = (existing.frozenUsdtAmount - actualSpent) + existing.calculatedCommission;
                if (profit > 0) {
                  await prisma.user.update({
                    where: { id: existing.traderId },
                    data: {
                      profitFromDeals: { increment: profit }
                    }
                  });
                }
              }
            });
          }

          if (
            existing.status !== Status.READY &&
            body.status === Status.READY &&
            existing.type === TransactionType.OUT &&
            existing.traderId
          ) {
            const trader = await db.user.findUnique({
              where: { id: existing.traderId },
            });
            if (trader) {
              const stake = trader.stakePercent ?? 0;
              const commission = trader.profitPercent ?? 0;
              const rubAfter = existing.amount * (1 - commission / 100);
              const rateAdj = existing.rate
                ? existing.rate * (1 - stake / 100)
                : undefined;
              const deduct =
                !rateAdj || existing.currency?.toLowerCase() === "usdt"
                  ? rubAfter
                  : rubAfter / rateAdj;
              await db.user.update({
                where: { id: trader.id },
                data: { balanceUsdt: { decrement: deduct } },
              });
            }
          }

          const hook = await notifyByStatus(trx);
          return { transaction: trx, hook };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Транзакция не найдена' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Сменить статус транзакции' },
        headers: AuthHeaderSchema,
        body: t.Object({
          id: t.String(),
          status: t.Enum(Status)
        }),
        response: { 200: TransactionWithHookSchema, 404: ErrorSchema }
      }
    )

    /* ─────────── PUT /admin/transactions/trader ─────────── */
    .put(
      '/trader',
      async ({ body, error }) => {
        const updateData: any = { traderId: body.traderId };
        
        if (body.traderId) {
          const [tx, trader] = await Promise.all([
            db.transaction.findUnique({ where: { id: body.id } }),
            db.user.findUnique({ where: { id: body.traderId } }),
          ])
          if (!tx) return error(404, { error: 'Транзакция не найдена' })
          if (!trader) return error(400, { error: 'Указанный трейдер не существует' })
          
          // Рассчитываем параметры заморозки для IN транзакций
          if (tx.type === TransactionType.IN && tx.rate !== null) {
            // Получаем параметры трейдера для данного мерчанта
            const traderMerchant = await db.traderMerchant.findUnique({
              where: {
                traderId_merchantId: {
                  traderId: body.traderId,
                  merchantId: tx.merchantId
                }
              }
            });
            
            const kkkPercent = traderMerchant?.kkkPercent || 0;
            const feeInPercent = traderMerchant?.feeInPercent || 0;
            
            const { calculateFreezingParams } = require('@/utils/freezing');
            const freezingParams = calculateFreezingParams(
              tx.amount,
              tx.rate,
              kkkPercent,
              feeInPercent
            );
            
            // Добавляем параметры заморозки к обновлению
            updateData.adjustedRate = freezingParams.adjustedRate;
            updateData.kkkPercent = kkkPercent;
            updateData.feeInPercent = feeInPercent;
            updateData.frozenUsdtAmount = freezingParams.frozenUsdtAmount;
            updateData.calculatedCommission = freezingParams.calculatedCommission;
            
            // Проверяем доступный баланс с учетом заморозки
            if (trader.trustBalance < freezingParams.totalRequired) {
              return error(400, { error: 'Недостаточно баланса трейдера для заморозки' })
            }
          }
        }
        
        return updateTrx(body.id, updateData).catch((e) => {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Транзакция не найдена' })
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2003'
          )
            return error(400, { error: 'Указанный трейдер не существует' })
          throw e
        })
      },
      {
        tags: ['admin'],
        detail: { summary: 'Назначить трейдера транзакции' },
        headers: AuthHeaderSchema,
        body: t.Object({
          id: t.String(),
          traderId: t.Union([t.String(), t.Null()])
        }),
        response: { 200: TransactionResponseSchema, 404: ErrorSchema, 400: ErrorSchema }
      }
    )

    /* ─────────── POST /admin/transactions/:id/callback ─────────── */
    .post(
      '/:id/callback',
      async ({ params, body, error }) => {
        try {
          const trx = await db.transaction.findUniqueOrThrow({
            where: { id: params.id },
            include: { merchant: true }
          })

          // Определяем URL и данные в зависимости от типа callback
          let url: string | null = null
          let callbackData: any = {}

          if (body.type === 'success') {
            url = trx.successUri
            callbackData = {
              transactionId: trx.id,
              orderId: trx.orderId,
              status: 'success',
              amount: trx.amount,
              timestamp: new Date().toISOString()
            }
          } else if (body.type === 'fail') {
            url = trx.failUri
            callbackData = {
              transactionId: trx.id,
              orderId: trx.orderId,
              status: 'failed',
              amount: trx.amount,
              timestamp: new Date().toISOString()
            }
          } else if (body.type === 'standard') {
            // Стандартный callback на callbackUri
            url = trx.callbackUri
            callbackData = {
              id: trx.id,
              status: body.status || trx.status
            }
          }

          if (!url) {
            return error(400, { error: `URL для ${body.type} callback не установлен в транзакции` })
          }

          let result
          try {
            const headers: any = {
              'Content-Type': 'application/json'
            }
            
            // Добавляем токен мерчанта для аутентификации
            if (trx.merchant?.token) {
              headers['X-Merchant-Token'] = trx.merchant.token
            }

            const res = await axios.post(url, callbackData, { headers })
            result = { status: res.status, data: res.data }
          } catch (e: any) {
            result = { 
              error: e?.message ?? 'request failed',
              status: e?.response?.status,
              data: e?.response?.data
            }
          }

          return { 
            callback: body.type, 
            url, 
            payload: callbackData,
            result 
          }
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Транзакция не найдена' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Отправить callback вручную (успешный, неудачный или стандартный)' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Object({ 
          type: t.Union([
            t.Literal('success'), 
            t.Literal('fail'), 
            t.Literal('standard')
          ], { 
            description: 'Тип callback: success (successUri), fail (failUri) или standard (callbackUri)' 
          }),
          status: t.Optional(t.String({ description: 'Статус для standard callback' }))
        }),
        response: {
          200: t.Object({
            callback: t.String(),
            url: t.String(),
            payload: t.Unknown(),
            result: t.Unknown()
          }),
          400: ErrorSchema,
          404: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/transactions/test/in ─────────── */
    .post(
      '/test/in',
      async ({ body, set, error }) => {
        try {
          // Ищем тестового мерчанта
          const testMerchant = await db.merchant.findFirst({
            where: { name: 'test' }
          })

          if (!testMerchant) {
            return error(404, { error: 'Тестовый мерчант не найден. Сначала создайте мерчанта с именем "test"' })
          }

          // Проверяем метод
          const method = await db.method.findUnique({
            where: { id: body.methodId }
          })
          if (!method) {
            return error(404, { error: 'Метод не найден' })
          }

          // Генерируем дефолтные значения если не указаны
          const amount = body.amount || Math.floor(Math.random() * 9000) + 1000
          const rate = body.rate || (95 + Math.random() * 10)
          const orderId = body.orderId || `TEST_IN_${Date.now()}_${Math.random().toString(36).substring(7)}`
          const expired_at = body.expired_at || new Date(Date.now() + 3600000).toISOString()
          const userIp = body.userIp || `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
          const callbackUri = body.callbackUri || ''

          // Делаем запрос от имени тестового мерчанта
          const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || '3000'}/api`
          const response = await fetch(`${baseUrl}/merchant/transactions/in`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-merchant-api-key': testMerchant.token
            },
            body: JSON.stringify({
              amount,
              orderId,
              methodId: body.methodId,
              rate,
              expired_at,
              userIp,
              callbackUri
            })
          })

          if (response.ok) {
            const transaction = await response.json()
            set.status = 201
            return { success: true, transaction }
          } else {
            const responseText = await response.text()
            console.error('[Admin Test IN] Merchant API error:', {
              status: response.status,
              response: responseText,
              requestData: {
                amount,
                orderId,
                methodId: body.methodId,
                rate,
                expired_at,
                userIp,
                callbackUri
              }
            })
            try {
              const errorData = JSON.parse(responseText)
              return error(response.status, errorData)
            } catch {
              return error(response.status, { error: responseText || 'Неизвестная ошибка' })
            }
          }
        } catch (e: any) {
          console.error('Test transaction creation error:', e)
          return error(500, { error: 'Ошибка создания тестовой транзакции', details: e.message })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Создать тестовую IN транзакцию от имени тестового мерчанта' },
        headers: AuthHeaderSchema,
        body: t.Object({
          methodId: t.String({ description: 'ID метода платежа' }),
          amount: t.Optional(t.Number({ description: 'Сумма транзакции (по умолчанию случайная)' })),
          rate: t.Optional(t.Number({ description: 'Курс USDT/RUB (по умолчанию случайный)' })),
          orderId: t.Optional(t.String({ description: 'ID заказа (по умолчанию генерируется)' })),
          expired_at: t.Optional(t.String({ description: 'Дата истечения ISO (по умолчанию через час)' })),
          userIp: t.Optional(t.String({ description: 'IP пользователя (по умолчанию случайный)' })),
          callbackUri: t.Optional(t.String({ description: 'URL для колбэков' }))
        }),
        response: {
          201: t.Object({
            success: t.Boolean(),
            transaction: t.Any()
          }),
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/transactions/test/out ─────────── */
    .post(
      '/test/out',
      async ({ body, set, error, headers }) => {
        try {
          // Перенаправляем на правильный эндпоинт для создания выплат
          const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || '3000'}/api`
          const response = await fetch(`${baseUrl}/admin/payouts/test`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-key': headers['x-admin-key'] || '' // Используем тот же admin key из запроса
            },
            body: JSON.stringify({
              amount: body.amount,
              wallet: body.assetOrBank, // Используем assetOrBank как wallet
              bank: 'Сбербанк', // Дефолтный банк
              isCard: true,
              rate: body.rate,
              direction: 'OUT',
              metadata: {
                orderId: body.orderId,
                userIp: body.userIp,
                clientName: body.clientName
              }
            })
          })

          if (response.ok) {
            const result = await response.json()
            set.status = 201
            return { 
              success: true, 
              transaction: {
                id: result.payout.id,
                numericId: result.payout.numericId,
                status: result.payout.status,
                amount: result.payout.amount,
                type: 'OUT',
                assetOrBank: result.payout.wallet,
                bank: result.payout.bank,
                rate: result.payout.rate,
                expireAt: result.payout.expireAt,
                traderId: result.payout.traderId
              }
            }
          } else {
            const responseText = await response.text()
            console.error('Merchant API error response:', responseText)
            try {
              const errorData = JSON.parse(responseText)
              return error(response.status, errorData)
            } catch {
              return error(response.status, { error: responseText })
            }
          }
        } catch (e: any) {
          console.error('Test transaction creation error:', e)
          return error(500, { error: 'Ошибка создания тестовой транзакции', details: e.message })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Создать тестовую OUT транзакцию от имени тестового мерчанта' },
        headers: AuthHeaderSchema,
        body: t.Object({
          methodId: t.String({ description: 'ID метода платежа' }),
          amount: t.Optional(t.Number({ description: 'Сумма транзакции (по умолчанию случайная)' })),
          assetOrBank: t.Optional(t.String({ description: 'Номер карты или кошелька' })),
          rate: t.Optional(t.Number({ description: 'Курс USDT/RUB (по умолчанию случайный)' })),
          orderId: t.Optional(t.String({ description: 'ID заказа (по умолчанию генерируется)' })),
          expired_at: t.Optional(t.String({ description: 'Дата истечения ISO (по умолчанию через час)' })),
          userIp: t.Optional(t.String({ description: 'IP пользователя (по умолчанию случайный)' })),
          callbackUri: t.Optional(t.String({ description: 'URL для колбэков' })),
          clientName: t.Optional(t.String({ description: 'Имя клиента' }))
        }),
        response: {
          201: t.Object({
            success: t.Boolean(),
            transaction: t.Any()
          }),
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── DELETE /admin/transactions/delete ─────────── */
    .delete(
      '/delete',
      async ({ body, error }) => {
        try {
          await db.transaction.delete({ where: { id: body.id } })
          return { ok: true }
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Транзакция не найдена' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Удаление транзакции' },
        headers: AuthHeaderSchema,
        body: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema
        }
      }
    )
