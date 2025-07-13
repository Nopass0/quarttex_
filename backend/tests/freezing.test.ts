import { expect, it, describe, beforeAll, afterAll, beforeEach } from 'bun:test'
import { Elysia } from 'elysia'
import { db } from '@/db'
import merchantRoutes from '@/routes/merchant'
import adminRoutes from '@/routes/admin'
import { Status, TransactionType, Currency, MethodType } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import { calculateFreezingParams, ceilUp2 } from '@/utils/freezing'

let mockMerchant: any
let mockAdmin: any
let testMethod: any
let testTrader: any

const mockMerchantGuard = () => (app: Elysia) =>
  app.derive(() => ({ merchant: mockMerchant }))

const mockAdminGuard = () => (app: Elysia) =>
  app.derive(() => ({ admin: mockAdmin }))

const mockHeaders = {
  'x-merchant-api-key': 'test-key'
}

const adminHeaders = {
  'x-admin-key': 'test-admin-key'
}

describe('Модуль заморозки средств', () => {
  let merchantApp: Elysia
  let adminApp: Elysia

  beforeAll(async () => {
    // Создаем тестового трейдера
    testTrader = await db.user.create({
      data: {
        email: 'test-trader-freezing@test.com',
        name: 'Test Trader Freezing',
        password: 'test123',
        balanceUsdt: 10000,
        balanceRub: 0,
        frozenUsdt: 0,
        profitFromDeals: 0,
        profitFromPayouts: 0
      }
    })

    // Создаем тестового мерчанта
    const merchant = await db.merchant.create({
      data: {
        name: 'Test Merchant Freezing',
        token: randomBytes(16).toString('hex'),
        disabled: false,
        banned: false,
        balanceUsdt: 5000
      }
    })

    // Создаем тестовый метод с RUB валютой
    testMethod = await db.method.create({
      data: {
        code: 'test-rub-method',
        name: 'Test RUB Method',
        type: MethodType.c2c,
        currency: Currency.rub,
        commissionPayin: 2.5,
        commissionPayout: 1.5,
        maxPayin: 100000,
        minPayin: 1000,
        maxPayout: 100000,
        minPayout: 1000,
        chancePayin: 100,
        chancePayout: 100,
        isEnabled: true,
        rateSource: 'bybit'
      }
    })

    // Создаем настройку ККК
    await db.systemConfig.create({
      data: {
        key: 'kkk_percent',
        value: '5'
      }
    })

    // Создаем тестового админа
    const admin = await db.admin.create({
      data: {
        token: randomBytes(16).toString('hex')
      }
    })

    mockMerchant = {
      id: merchant.id,
      name: merchant.name,
      token: merchant.token,
      disabled: false,
      banned: false,
      balanceUsdt: merchant.balanceUsdt,
      createdAt: new Date()
    }

    mockAdmin = {
      id: admin.id,
      token: admin.token
    }

    merchantApp = new Elysia().use(mockMerchantGuard()).use(merchantRoutes)
    adminApp = new Elysia().use(mockAdminGuard()).use(adminRoutes)
  })

  afterAll(async () => {
    // Очищаем тестовые данные
    await db.transaction.deleteMany({ 
      where: { 
        OR: [
          { merchantId: mockMerchant.id },
          { traderId: testTrader.id }
        ]
      } 
    })
    await db.systemConfig.deleteMany({ where: { key: 'kkk_percent' } })
    await db.method.deleteMany({ where: { code: 'test-rub-method' } })
    await db.merchant.deleteMany({ where: { name: 'Test Merchant Freezing' } })
    await db.user.deleteMany({ where: { email: 'test-trader-freezing@test.com' } })
    await db.admin.deleteMany({ where: { id: mockAdmin?.id } })
  })

  describe('Утилиты расчета заморозки', () => {
    it('ceilUp2 правильно округляет до 2 знаков вверх', () => {
      expect(ceilUp2(1.234)).toBe(1.24)
      expect(ceilUp2(1.235)).toBe(1.24)
      expect(ceilUp2(1.231)).toBe(1.24)
      expect(ceilUp2(1.2)).toBe(1.2)
      expect(ceilUp2(1)).toBe(1)
    })

    it('calculateFreezingParams правильно рассчитывает параметры заморозки', () => {
      const params = calculateFreezingParams(10000, 100, 5, 2.5)
      
      // adjRate = 100 * (1 - 5/100) = 100 * 0.95 = 95
      expect(params.adjustedRate).toBe(95)
      
      // usdtFreeze = ceilUp2(10000 / 95) = ceilUp2(105.2631...) = 105.27
      expect(params.frozenUsdtAmount).toBe(105.27)
      
      // commission = ceilUp2(105.27 * 2.5/100) = ceilUp2(2.63175) = 2.64
      expect(params.calculatedCommission).toBe(2.64)
    })

    it('calculateFreezingParams обрабатывает нулевые значения', () => {
      const params = calculateFreezingParams(10000, 100, 0, 0)
      
      expect(params.adjustedRate).toBe(100)
      expect(params.frozenUsdtAmount).toBe(100)
      expect(params.calculatedCommission).toBe(0)
    })
  })

  describe('Создание транзакции с заморозкой', () => {
    it('Создает RUB транзакцию с правильной заморозкой средств', async () => {
      const orderId = 'freeze-test-' + randomBytes(4).toString('hex')
      const rateMerchant = 100
      const amountRub = 10000

      const response = await merchantApp.handle(
        new Request('http://localhost/transactions/create', {
          method: 'POST',
          headers: {
            ...mockHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId,
            amount: amountRub,
            method: testMethod.code,
            userId: '123',
            assetOrBank: 'SBER',
            type: 'IN',
            expired_at: new Date(Date.now() + 3600000).toISOString(),
            callbackUri: 'https://example.com/callback',
            successUri: 'https://example.com/success',
            failUri: 'https://example.com/fail',
            rateMerchant
          })
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('transaction')
      
      // Проверяем транзакцию в БД
      const transaction = await db.transaction.findUnique({
        where: { id: body.transaction.id }
      })

      expect(transaction).toBeTruthy()
      expect(transaction!.frozenUsdtAmount).toBe(105.27) // ceilUp2(10000 / 95)
      expect(transaction!.adjustedRate).toBe(95) // 100 * (1 - 5/100)
      expect(transaction!.kkkPercent).toBe(5)
      expect(transaction!.feeInPercent).toBe(2.5)
      expect(transaction!.calculatedCommission).toBe(2.64) // ceilUp2(105.27 * 2.5/100)

      // Проверяем обновление баланса трейдера
      const trader = await db.user.findUnique({
        where: { id: transaction!.traderId! }
      })
      expect(trader!.frozenUsdt).toBe(105.27)

      // Очищаем после теста
      await db.transaction.delete({ where: { id: transaction!.id } })
    })

    it('Отклоняет создание транзакции при недостаточном балансе', async () => {
      const orderId = 'insufficient-' + randomBytes(4).toString('hex')
      const rateMerchant = 100
      const amountRub = 1000000 // Большая сумма

      const response = await merchantApp.handle(
        new Request('http://localhost/transactions/create', {
          method: 'POST',
          headers: {
            ...mockHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId,
            amount: amountRub,
            method: testMethod.code,
            userId: '123',
            assetOrBank: 'SBER',
            type: 'IN',
            expired_at: new Date(Date.now() + 3600000).toISOString(),
            callbackUri: 'https://example.com/callback',
            successUri: 'https://example.com/success',
            failUri: 'https://example.com/fail',
            rateMerchant
          })
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Недостаточно средств')
    })
  })

  describe('Разморозка средств', () => {
    let testTransaction: any

    beforeEach(async () => {
      // Создаем тестовую транзакцию с заморозкой
      testTransaction = await db.transaction.create({
        data: {
          merchantId: mockMerchant.id,
          traderId: testTrader.id,
          amount: 10000,
          assetOrBank: 'SBER',
          orderId: 'unfreeze-test-' + randomBytes(4).toString('hex'),
          methodId: testMethod.id,
          userId: 'test-user',
          callbackUri: 'https://example.com/cb',
          successUri: 'https://example.com/s',
          failUri: 'https://example.com/f',
          type: TransactionType.IN,
          expired_at: new Date(Date.now() + 3600000),
          commission: 2.5,
          clientName: 'Test Client',
          status: Status.ASSIGNED,
          frozenUsdtAmount: 105.27,
          adjustedRate: 95,
          kkkPercent: 5,
          feeInPercent: 2.5,
          calculatedCommission: 2.64
        }
      })

      // Обновляем frozenUsdt трейдера
      await db.user.update({
        where: { id: testTrader.id },
        data: { frozenUsdt: 105.27 }
      })
    })

    it('Размораживает средства при отмене транзакции', async () => {
      const response = await adminApp.handle(
        new Request(`http://localhost/transactions/status`, {
          method: 'PATCH',
          headers: {
            ...adminHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: testTransaction.id,
            status: 'CANCELED'
          })
        })
      )

      expect(response.status).toBe(200)

      // Проверяем разморозку
      const trader = await db.user.findUnique({
        where: { id: testTrader.id }
      })
      expect(trader!.frozenUsdt).toBe(0)

      // Проверяем статус транзакции
      const transaction = await db.transaction.findUnique({
        where: { id: testTransaction.id }
      })
      expect(transaction!.status).toBe(Status.CANCELED)
    })

    it('Размораживает средства при истечении транзакции', async () => {
      const response = await adminApp.handle(
        new Request(`http://localhost/transactions/status`, {
          method: 'PATCH',
          headers: {
            ...adminHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: testTransaction.id,
            status: 'EXPIRED'
          })
        })
      )

      expect(response.status).toBe(200)

      // Проверяем разморозку
      const trader = await db.user.findUnique({
        where: { id: testTrader.id }
      })
      expect(trader!.frozenUsdt).toBe(0)
    })
  })

  describe('Успешное завершение транзакции', () => {
    it('Правильно рассчитывает прибыль и списывает средства', async () => {
      // Создаем транзакцию с заморозкой
      const frozenAmount = 105.27
      const commission = 2.64
      const actualSpent = 100 // Фактически потрачено USDT

      const transaction = await db.transaction.create({
        data: {
          merchantId: mockMerchant.id,
          traderId: testTrader.id,
          amount: 10000,
          assetOrBank: 'SBER',
          orderId: 'success-test-' + randomBytes(4).toString('hex'),
          methodId: testMethod.id,
          userId: 'test-user',
          callbackUri: 'https://example.com/cb',
          successUri: 'https://example.com/s',
          failUri: 'https://example.com/f',
          type: TransactionType.IN,
          expired_at: new Date(Date.now() + 3600000),
          commission: 2.5,
          clientName: 'Test Client',
          status: Status.ASSIGNED,
          frozenUsdtAmount: frozenAmount,
          adjustedRate: 95,
          kkkPercent: 5,
          feeInPercent: 2.5,
          calculatedCommission: commission
        }
      })

      // Обновляем баланс трейдера для теста
      await db.user.update({
        where: { id: testTrader.id },
        data: { 
          frozenUsdt: frozenAmount,
          profitFromDeals: 0
        }
      })

      // Завершаем транзакцию успешно
      const response = await adminApp.handle(
        new Request(`http://localhost/transactions/status`, {
          method: 'PATCH',
          headers: {
            ...adminHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: transaction.id,
            status: 'READY',
            actualAmountSpent: actualSpent
          })
        })
      )

      expect(response.status).toBe(200)

      // Проверяем обновления
      const trader = await db.user.findUnique({
        where: { id: testTrader.id }
      })
      
      // Проверяем разморозку
      expect(trader!.frozenUsdt).toBe(0)
      
      // Проверяем прибыль: (frozenAmount - actualSpent) + commission
      const expectedProfit = (frozenAmount - actualSpent) + commission
      expect(trader!.profitFromDeals).toBeCloseTo(expectedProfit, 2)

      // Проверяем обновление мерчанта
      const merchant = await db.merchant.findUnique({
        where: { id: mockMerchant.id }
      })
      expect(merchant!.balanceUsdt).toBe(5000 + actualSpent)

      // Очищаем после теста
      await db.transaction.delete({ where: { id: transaction.id } })
    })
  })

  describe('Интеграция с настройками ККК', () => {
    it('Использует актуальное значение ККК из базы данных', async () => {
      // Обновляем ККК
      await db.systemConfig.update({
        where: { key: 'kkk_percent' },
        data: { value: '10' }
      })

      const orderId = 'kkk-test-' + randomBytes(4).toString('hex')
      const rateMerchant = 100
      const amountRub = 10000

      const response = await merchantApp.handle(
        new Request('http://localhost/transactions/create', {
          method: 'POST',
          headers: {
            ...mockHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId,
            amount: amountRub,
            method: testMethod.code,
            userId: '123',
            assetOrBank: 'SBER',
            type: 'IN',
            expired_at: new Date(Date.now() + 3600000).toISOString(),
            callbackUri: 'https://example.com/callback',
            successUri: 'https://example.com/success',
            failUri: 'https://example.com/fail',
            rateMerchant
          })
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      
      const transaction = await db.transaction.findUnique({
        where: { id: body.transaction.id }
      })

      // С ККК 10%: adjRate = 100 * (1 - 10/100) = 90
      expect(transaction!.adjustedRate).toBe(90)
      expect(transaction!.kkkPercent).toBe(10)
      
      // frozenAmount = ceilUp2(10000 / 90) = ceilUp2(111.111...) = 111.12
      expect(transaction!.frozenUsdtAmount).toBe(111.12)

      // Очищаем
      await db.transaction.delete({ where: { id: transaction!.id } })
      
      // Восстанавливаем ККК
      await db.systemConfig.update({
        where: { key: 'kkk_percent' },
        data: { value: '5' }
      })
    })

    it('Работает корректно если настройка ККК отсутствует', async () => {
      // Удаляем настройку ККК
      await db.systemConfig.delete({
        where: { key: 'kkk_percent' }
      })

      const orderId = 'no-kkk-test-' + randomBytes(4).toString('hex')
      const rateMerchant = 100
      const amountRub = 10000

      const response = await merchantApp.handle(
        new Request('http://localhost/transactions/create', {
          method: 'POST',
          headers: {
            ...mockHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId,
            amount: amountRub,
            method: testMethod.code,
            userId: '123',
            assetOrBank: 'SBER',
            type: 'IN',
            expired_at: new Date(Date.now() + 3600000).toISOString(),
            callbackUri: 'https://example.com/callback',
            successUri: 'https://example.com/success',
            failUri: 'https://example.com/fail',
            rateMerchant
          })
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      
      const transaction = await db.transaction.findUnique({
        where: { id: body.transaction.id }
      })

      // Без ККК: adjRate = 100 * (1 - 0/100) = 100
      expect(transaction!.adjustedRate).toBe(100)
      expect(transaction!.kkkPercent).toBe(0)
      expect(transaction!.frozenUsdtAmount).toBe(100) // 10000 / 100

      // Очищаем
      await db.transaction.delete({ where: { id: transaction!.id } })
      
      // Восстанавливаем настройку ККК
      await db.systemConfig.create({
        data: {
          key: 'kkk_percent',
          value: '5'
        }
      })
    })
  })
})