import { expect, it, describe, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { db } from '@/db'
import merchantRoutes from '@/routes/merchant'
import { Status, TransactionType } from '@prisma/client'
import { randomBytes } from 'node:crypto'

let mockMerchant: any

const mockMerchantGuard = () => (app: Elysia) =>
  app.derive(() => ({ merchant: mockMerchant }))

const mockHeaders = {
  'x-merchant-api-key': 'test-key'
}

let app: Elysia
let orderId: string

describe('Маршруты мерчанта', () => {
  beforeAll(async () => {
    const merchant = await db.merchant.create({
      data: {
        name: 'Test Merchant',
        token: randomBytes(16).toString('hex'),
        disabled: false,
        banned: false
      }
    })

    const method = await db.method.create({
      data: {
        code: 'test-method-m',
        name: 'Test Method',
        type: 'c2c',
        commissionPayin: 0.01,
        commissionPayout: 0.02,
        maxPayin: 10000,
        minPayin: 100,
        maxPayout: 10000,
        minPayout: 100,
        chancePayin: 0.95,
        chancePayout: 0.95,
        isEnabled: true
      }
    })

    orderId = 'order-' + randomBytes(4).toString('hex')

    await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 500,
        assetOrBank: 'USDT',
        orderId,
        methodId: method.id,
        userId: 'user-test',
        callbackUri: 'https://example.com/cb',
        successUri: 'https://example.com/s',
        failUri: 'https://example.com/f',
        type: TransactionType.IN,
        expired_at: new Date(Date.now() + 86400000),
        commission: 5,
        clientName: 'Client',
        status: Status.IN_PROGRESS
      }
    })

    mockMerchant = {
      id: merchant.id,
      name: merchant.name,
      token: merchant.token,
      disabled: false,
      banned: false,
      createdAt: new Date()
    }

    app = new Elysia().use(mockMerchantGuard()).use(merchantRoutes)
  })

  afterAll(async () => {
    await db.transaction.deleteMany({ where: { orderId } })
    await db.method.deleteMany({ where: { code: 'test-method-m' } })
    await db.merchant.deleteMany({ where: { name: 'Test Merchant' } })
  })

  it('PATCH /transactions/by-order-id/:orderId/cancel отменяет транзакцию', async () => {
    const response = await app.handle(
      new Request(`http://localhost/transactions/by-order-id/${orderId}/cancel`, {
        method: 'PATCH',
        headers: mockHeaders
      })
    )

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body).toHaveProperty('success', true)
    expect(body).toHaveProperty('transaction')
    expect(body.transaction).toHaveProperty('status', 'CANCELED')
  })
})
