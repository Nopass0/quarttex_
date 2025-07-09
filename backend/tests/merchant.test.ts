import { expect, it, describe, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { db } from '@/db'
import merchantRoutes from '@/routes/merchant'
import { Status, TransactionType } from '@prisma/client'
import { randomBytes } from 'node:crypto'

let mockHeaders: Record<string, string> = {
  'x-merchant-api-key': 'test-key'
}

let app: Elysia
let orderId: string
let merchantId: string
let methodId: string
let merchantToken: string

describe('Маршруты мерчанта', () => {
  beforeAll(async () => {
    const uniqueName = `Test Merchant ${Date.now()}`;
    merchantToken = randomBytes(16).toString('hex');
    const merchant = await db.merchant.create({
      data: {
        name: uniqueName,
        token: merchantToken,
        disabled: false,
        banned: false
      }
    })
    merchantId = merchant.id;

    const methodCode = `test-method-m-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const method = await db.method.create({
      data: {
        code: methodCode,
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
    methodId = method.id;

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

    // Update headers with actual merchant token
    mockHeaders = {
      'x-merchant-api-key': merchantToken
    }

    app = new Elysia().use(merchantRoutes)
  })

  afterAll(async () => {
    await db.transaction.deleteMany({ where: { orderId } })
    await db.method.deleteMany({ where: { id: methodId } })
    await db.merchant.deleteMany({ where: { id: merchantId } })
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
