'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, ChevronRight, ChevronDown, Check, AlertCircle, FileJson, Webhook, ShieldCheck } from 'lucide-react'
import { useMerchantAuth } from '@/stores/merchant-auth'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from '@/components/ui/scroll-area'

type ApiMethod = {
  id: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  title: string
  description: string
  category: string
  headers: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
  pathParams?: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
  queryParams?: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
  body?: Array<{
    name: string
    type: string
    required: boolean
    description: string
    example?: any
  }>
  responses: {
    [key: string]: {
      description: string
      example: any
    }
  }
}

const methodColors: Record<string, string> = {
  GET: 'bg-blue-500',
  POST: 'bg-green-500',
  PATCH: 'bg-orange-500',
  DELETE: 'bg-red-500',
}

const apiMethods: ApiMethod[] = [
  {
    id: 'connect',
    method: 'GET',
    path: '/api/merchant/connect',
    title: 'Получение информации о мерчанте',
    description: 'Возвращает основную информацию о мерчанте, включая статистику транзакций',
    category: 'Основные',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта для аутентификации'
      }
    ],
    responses: {
      '200': {
        description: 'Успешный ответ',
        example: {
          id: "merchant123",
          name: "Название мерчанта",
          createdAt: "2024-01-01T00:00:00.000Z",
          totalTx: 150,
          paidTx: 120
        }
      },
      '401': {
        description: 'Неверный API ключ',
        example: { error: "Invalid API key" }
      }
    }
  },
  {
    id: 'balance',
    method: 'GET',
    path: '/api/merchant/balance',
    title: 'Получение баланса',
    description: 'Возвращает текущий баланс мерчанта в USDT',
    category: 'Основные',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    responses: {
      '200': {
        description: 'Успешный ответ',
        example: { balance: 5000.50 }
      },
      '401': {
        description: 'Неверный API ключ',
        example: { error: "Invalid API key" }
      }
    }
  },
  {
    id: 'methods',
    method: 'GET',
    path: '/api/merchant/methods',
    title: 'Доступные методы платежа',
    description: 'Возвращает список всех доступных методов платежа с их параметрами и комиссиями',
    category: 'Методы',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    responses: {
      '200': {
        description: 'Список методов',
        example: [
          {
            id: "method1",
            code: "sbp",
            name: "СБП",
            type: "sbp",
            currency: "usdt",
            commissionPayin: 1.5,
            commissionPayout: 2.0,
            maxPayin: 100000,
            minPayin: 100,
            maxPayout: 50000,
            minPayout: 500,
            isEnabled: true
          }
        ]
      }
    }
  },
  {
    id: 'create-transaction',
    method: 'POST',
    path: '/api/merchant/transactions/create',
    title: 'Создание транзакции',
    description: 'Создает новую транзакцию (платеж). При создании входящей транзакции (IN) автоматически подбираются реквизиты',
    category: 'Транзакции',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    body: [
      {
        name: 'amount',
        type: 'number',
        required: true,
        description: 'Сумма транзакции в рублях',
        example: 5000
      },
      {
        name: 'orderId',
        type: 'string',
        required: true,
        description: 'Уникальный ID заказа от мерчанта',
        example: 'ORDER-12345'
      },
      {
        name: 'methodId',
        type: 'string',
        required: true,
        description: 'ID метода платежа',
        example: 'method1'
      },
      {
        name: 'rate',
        type: 'number',
        required: true,
        description: 'Курс USDT/RUB',
        example: 95.5
      },
      {
        name: 'expired_at',
        type: 'string',
        required: true,
        description: 'ISO дата истечения транзакции',
        example: '2024-01-01T12:00:00.000Z'
      },
      {
        name: 'userIp',
        type: 'string',
        required: false,
        description: 'IP адрес пользователя',
        example: '192.168.1.1'
      },
      {
        name: 'userId',
        type: 'string',
        required: false,
        description: 'ID пользователя (генерируется автоматически если не указан)',
        example: 'user123'
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        description: 'Тип транзакции: IN (ввод) или OUT (вывод). По умолчанию IN',
        example: 'IN'
      },
      {
        name: 'callbackUri',
        type: 'string',
        required: false,
        description: 'URL для webhook уведомлений об изменении статуса',
        example: 'https://example.com/webhook'
      }
    ],
    responses: {
      '201': {
        description: 'Транзакция создана',
        example: {
          id: "tx123",
          numericId: 1001,
          amount: 5000,
          crypto: 52.36,
          status: "IN_PROGRESS",
          traderId: "trader123",
          requisites: {
            id: "req123",
            bankType: "SBERBANK",
            cardNumber: "2202 **** **** 1234",
            recipientName: "Иван И.",
            traderName: "Trader Name"
          },
          createdAt: "2024-01-01T10:00:00.000Z",
          updatedAt: "2024-01-01T10:00:00.000Z",
          expired_at: "2024-01-01T12:00:00.000Z",
          method: {
            id: "method1",
            code: "sbp",
            name: "СБП",
            type: "sbp",
            currency: "usdt"
          }
        }
      },
      '400': {
        description: 'Неверные параметры',
        example: { error: "Invalid parameters" }
      },
      '409': {
        description: 'Дублирование orderId',
        example: { error: "Order ID already exists" }
      }
    }
  },
  {
    id: 'transaction-status',
    method: 'GET',
    path: '/api/merchant/transactions/status/{id}',
    title: 'Статус транзакции',
    description: 'Получение текущего статуса транзакции по её ID',
    category: 'Транзакции',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'ID транзакции'
      }
    ],
    responses: {
      '200': {
        description: 'Информация о транзакции',
        example: {
          id: "tx123",
          orderId: "ORDER-12345",
          amount: 5000,
          status: "READY",
          type: "IN",
          createdAt: "2024-01-01T10:00:00.000Z",
          updatedAt: "2024-01-01T10:05:00.000Z",
          method: {
            id: "method1",
            code: "sbp",
            name: "СБП",
            type: "sbp",
            currency: "usdt"
          }
        }
      },
      '404': {
        description: 'Транзакция не найдена',
        example: { error: "Transaction not found" }
      }
    }
  },
  {
    id: 'transaction-by-order',
    method: 'GET',
    path: '/api/merchant/transactions/by-order-id/{orderId}',
    title: 'Получение транзакции по Order ID',
    description: 'Получение полной информации о транзакции включая реквизиты по orderId',
    category: 'Транзакции',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    pathParams: [
      {
        name: 'orderId',
        type: 'string',
        required: true,
        description: 'Order ID транзакции'
      }
    ],
    responses: {
      '200': {
        description: 'Полная информация о транзакции',
        example: {
          id: "tx123",
          orderId: "ORDER-12345",
          amount: 5000,
          status: "READY",
          type: "IN",
          createdAt: "2024-01-01T10:00:00.000Z",
          updatedAt: "2024-01-01T10:05:00.000Z",
          isMock: false,
          method: {
            id: "method1",
            code: "sbp",
            name: "СБП",
            type: "sbp",
            currency: "usdt"
          },
          requisites: {
            id: "req123",
            bankType: "SBERBANK",
            cardNumber: "2202 **** **** 1234",
            recipientName: "Иван И.",
            traderId: "trader123",
            traderName: "Trader Name"
          }
        }
      }
    }
  },
  {
    id: 'cancel-transaction',
    method: 'PATCH',
    path: '/api/merchant/transactions/by-order-id/{orderId}/cancel',
    title: 'Отмена транзакции',
    description: 'Отмена транзакции по orderId. Возможна только для транзакций в статусах CREATED или IN_PROGRESS',
    category: 'Транзакции',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    pathParams: [
      {
        name: 'orderId',
        type: 'string',
        required: true,
        description: 'Order ID транзакции'
      }
    ],
    responses: {
      '200': {
        description: 'Транзакция отменена',
        example: {
          success: true,
          transaction: {
            id: "tx123",
            status: "CANCELED",
            // остальные поля транзакции
          }
        }
      },
      '400': {
        description: 'Невозможно отменить транзакцию',
        example: { error: "Transaction cannot be canceled in current status" }
      }
    }
  },
  {
    id: 'transactions-list',
    method: 'GET',
    path: '/api/merchant/transactions/list',
    title: 'Список транзакций',
    description: 'Получение списка транзакций с возможностью фильтрации и пагинации',
    category: 'Транзакции',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    queryParams: [
      {
        name: 'page',
        type: 'number',
        required: false,
        description: 'Номер страницы (по умолчанию 1)'
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: 'Количество записей на странице (по умолчанию 10, максимум 100)'
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: 'Фильтр по статусу: CREATED, IN_PROGRESS, DISPUTE, EXPIRED, READY, MILK, CANCELED'
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        description: 'Фильтр по типу: IN, OUT'
      },
      {
        name: 'methodId',
        type: 'string',
        required: false,
        description: 'Фильтр по ID метода'
      },
      {
        name: 'orderId',
        type: 'string',
        required: false,
        description: 'Поиск по orderId (частичное совпадение)'
      }
    ],
    responses: {
      '200': {
        description: 'Список транзакций',
        example: {
          data: [
            {
              id: "tx123",
              orderId: "ORDER-12345",
              amount: 5000,
              status: "READY",
              type: "IN",
              createdAt: "2024-01-01T10:00:00.000Z",
              updatedAt: "2024-01-01T10:05:00.000Z",
              isMock: false,
              method: {
                id: "method1",
                code: "sbp",
                name: "СБП",
                type: "sbp",
                currency: "usdt"
              }
            }
          ],
          pagination: {
            total: 100,
            page: 1,
            limit: 10,
            pages: 10
          }
        }
      }
    }
  },
  {
    id: 'upload-receipt',
    method: 'POST',
    path: '/api/merchant/transactions/{id}/receipt',
    title: 'Загрузка чека',
    description: 'Загрузка чека для транзакции. Используется для подтверждения оплаты',
    category: 'Чеки',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'ID транзакции'
      }
    ],
    body: [
      {
        name: 'fileData',
        type: 'string',
        required: true,
        description: 'Файл в формате base64',
        example: 'data:image/png;base64,iVBORw0KGgoAAAANS...'
      },
      {
        name: 'fileName',
        type: 'string',
        required: true,
        description: 'Имя файла',
        example: 'receipt.png'
      },
      {
        name: 'updateStatus',
        type: 'string',
        required: false,
        description: 'Обновить статус транзакции на указанный',
        example: 'READY'
      }
    ],
    responses: {
      '201': {
        description: 'Чек загружен',
        example: {
          id: "receipt123",
          fileName: "receipt.png",
          isChecked: false,
          isFake: false,
          isAuto: false,
          createdAt: "2024-01-01T10:00:00.000Z"
        }
      }
    }
  },
  {
    id: 'get-receipts',
    method: 'GET',
    path: '/api/merchant/transactions/{id}/receipts',
    title: 'Получение чеков',
    description: 'Получение всех загруженных чеков для транзакции',
    category: 'Чеки',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'ID транзакции'
      }
    ],
    responses: {
      '200': {
        description: 'Список чеков',
        example: [
          {
            id: "receipt123",
            fileName: "receipt.png",
            isChecked: true,
            isFake: false,
            isAuto: false,
            createdAt: "2024-01-01T10:00:00.000Z",
            updatedAt: "2024-01-01T10:05:00.000Z"
          }
        ]
      }
    }
  },
  {
    id: 'enums',
    method: 'GET',
    path: '/api/merchant/enums',
    title: 'Справочники',
    description: 'Получение всех возможных значений для enum полей',
    category: 'Справочники',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    responses: {
      '200': {
        description: 'Справочники значений',
        example: {
          status: ["CREATED", "IN_PROGRESS", "DISPUTE", "EXPIRED", "READY", "MILK", "CANCELED"],
          transactionType: ["IN", "OUT"],
          methodType: ["upi", "c2ckz", "c2cuz", "c2caz", "c2c", "sbp", "spay", "tpay", "vpay", "apay"],
          currency: ["rub", "usdt"]
        }
      }
    }
  },
  // Payout API endpoints (v1.6)
  {
    id: 'create-payout',
    method: 'POST',
    path: '/api/merchant/payouts',
    title: 'Создание выплаты',
    description: 'Создание новой выплаты (OUT транзакции) с автоматическим расчетом курса и комиссий',
    category: 'Выплаты',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта для аутентификации'
      }
    ],
    body: [
      {
        name: 'amount',
        type: 'number',
        required: true,
        description: 'Сумма выплаты в рублях',
        example: 10000
      },
      {
        name: 'wallet',
        type: 'string',
        required: true,
        description: 'Кошелек получателя (USDT TRC-20)',
        example: 'TRx1234567890abcdef'
      },
      {
        name: 'bank',
        type: 'string',
        required: true,
        description: 'Банк или платежная система',
        example: 'SBERBANK'
      },
      {
        name: 'isCard',
        type: 'boolean',
        required: true,
        description: 'Является ли выплата на карту',
        example: true
      },
      {
        name: 'merchantRate',
        type: 'number',
        required: true,
        description: 'Курс мерчанта USDT/RUB',
        example: 95.5
      },
      {
        name: 'externalReference',
        type: 'string',
        required: false,
        description: 'Внешний идентификатор для отслеживания',
        example: 'PAYOUT-12345'
      },
      {
        name: 'processingTime',
        type: 'number',
        required: false,
        description: 'Время обработки в минутах (5-60, по умолчанию 15)',
        example: 15
      },
      {
        name: 'webhookUrl',
        type: 'string',
        required: false,
        description: 'URL для webhook уведомлений',
        example: 'https://your-domain.com/webhook/payouts'
      },
      {
        name: 'metadata',
        type: 'object',
        required: false,
        description: 'Дополнительные данные',
        example: { userId: 'user123', orderId: 'order456' }
      }
    ],
    responses: {
      '201': {
        description: 'Выплата создана',
        example: {
          success: true,
          payout: {
            id: "payout123",
            numericId: 2001,
            amount: 10000,
            amountUsdt: 104.71,
            total: 10000,
            totalUsdt: 104.71,
            rate: 95.5,
            wallet: "TRx1234567890abcdef",
            bank: "SBERBANK",
            isCard: true,
            status: "CREATED",
            expireAt: "2024-01-01T12:00:00.000Z",
            createdAt: "2024-01-01T10:00:00.000Z"
          }
        }
      },
      '400': {
        description: 'Неверные параметры',
        example: { error: "Invalid parameters" }
      }
    }
  },
  {
    id: 'get-payout',
    method: 'GET',
    path: '/api/merchant/payouts/{id}',
    title: 'Получение выплаты',
    description: 'Получение полной информации о выплате по ID',
    category: 'Выплаты',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'ID выплаты'
      }
    ],
    responses: {
      '200': {
        description: 'Информация о выплате',
        example: {
          success: true,
          payout: {
            id: "payout123",
            numericId: 2001,
            amount: 10000,
            amountUsdt: 104.71,
            total: 10000,
            totalUsdt: 104.71,
            rate: 95.5,
            wallet: "TRx1234567890abcdef",
            bank: "SBERBANK",
            isCard: true,
            status: "ACTIVE",
            expireAt: "2024-01-01T12:00:00.000Z",
            createdAt: "2024-01-01T10:00:00.000Z",
            acceptedAt: "2024-01-01T10:05:00.000Z",
            confirmedAt: null,
            cancelledAt: null,
            proofFiles: [],
            disputeFiles: [],
            disputeMessage: null,
            cancelReason: null
          }
        }
      },
      '404': {
        description: 'Выплата не найдена',
        example: { error: "Payout not found" }
      }
    }
  },
  {
    id: 'list-payouts',
    method: 'GET',
    path: '/api/merchant/payouts',
    title: 'Список выплат',
    description: 'Получение списка выплат с фильтрацией и пагинацией',
    category: 'Выплаты',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    queryParams: [
      {
        name: 'status',
        type: 'string',
        required: false,
        description: 'Фильтр по статусу (можно несколько через запятую): CREATED, ACTIVE, CHECKING, COMPLETED, CANCELLED, DISPUTED, EXPIRED'
      },
      {
        name: 'direction',
        type: 'string',
        required: false,
        description: 'Направление: IN или OUT'
      },
      {
        name: 'dateFrom',
        type: 'string',
        required: false,
        description: 'Дата начала периода (ISO 8601)'
      },
      {
        name: 'dateTo',
        type: 'string',
        required: false,
        description: 'Дата конца периода (ISO 8601)'
      },
      {
        name: 'page',
        type: 'number',
        required: false,
        description: 'Номер страницы (по умолчанию 1)'
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: 'Количество записей на странице (1-100, по умолчанию 20)'
      }
    ],
    responses: {
      '200': {
        description: 'Список выплат',
        example: {
          success: true,
          data: [
            {
              id: "payout123",
              numericId: 2001,
              status: "COMPLETED",
              direction: "OUT",
              amount: 10000,
              rate: 95.5,
              total: 10000,
              wallet: "TRx1234567890abcdef",
              bank: "SBERBANK",
              isCard: true,
              externalReference: "PAYOUT-12345",
              createdAt: "2024-01-01T10:00:00.000Z",
              acceptedAt: "2024-01-01T10:05:00.000Z",
              confirmedAt: "2024-01-01T10:10:00.000Z",
              cancelledAt: null,
              trader: {
                numericId: 1001,
                email: "trader@example.com"
              }
            }
          ],
          meta: {
            total: 150,
            page: 1,
            limit: 20,
            totalPages: 8
          }
        }
      }
    }
  },
  {
    id: 'approve-payout',
    method: 'POST',
    path: '/api/merchant/payouts/{id}/approve',
    title: 'Подтверждение выплаты',
    description: 'Подтверждение выплаты после проверки документов трейдера',
    category: 'Выплаты',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'ID выплаты'
      }
    ],
    responses: {
      '200': {
        description: 'Выплата подтверждена',
        example: {
          success: true,
          payout: {
            id: "payout123",
            numericId: 2001,
            status: "COMPLETED"
          }
        }
      },
      '400': {
        description: 'Неверный статус выплаты',
        example: { error: "Payout is not in checking status" }
      }
    }
  },
  {
    id: 'cancel-payout',
    method: 'PATCH',
    path: '/api/merchant/payouts/{id}/cancel',
    title: 'Отмена выплаты',
    description: 'Отмена выплаты (только для статуса CREATED)',
    category: 'Выплаты',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'ID выплаты'
      }
    ],
    body: [
      {
        name: 'reasonCode',
        type: 'string',
        required: true,
        description: 'Код причины отмены (минимум 3 символа)',
        example: 'INSUFFICIENT_FUNDS'
      }
    ],
    responses: {
      '200': {
        description: 'Выплата отменена',
        example: {
          success: true,
          payout: {
            id: "payout123",
            numericId: 2001,
            status: "CANCELLED",
            cancelledAt: "2024-01-01T10:30:00.000Z",
            cancelReasonCode: "INSUFFICIENT_FUNDS"
          }
        }
      },
      '400': {
        description: 'Неверный статус выплаты',
        example: { error: "Cannot cancel payout in current status" }
      }
    }
  },
  {
    id: 'update-payout-rate',
    method: 'PATCH',
    path: '/api/merchant/payouts/{id}/rate',
    title: 'Обновление курса выплаты',
    description: 'Обновление курса или суммы выплаты (только для статуса CREATED)',
    category: 'Выплаты',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'ID выплаты'
      }
    ],
    body: [
      {
        name: 'merchantRate',
        type: 'number',
        required: false,
        description: 'Новый курс мерчанта',
        example: 96.0
      },
      {
        name: 'amount',
        type: 'number',
        required: false,
        description: 'Новая сумма выплаты',
        example: 15000
      }
    ],
    responses: {
      '200': {
        description: 'Курс обновлен',
        example: {
          success: true,
          payout: {
            id: "payout123",
            numericId: 2001,
            amount: 15000,
            merchantRate: 96.0,
            rate: 96.0,
            total: 15000
          }
        }
      },
      '400': {
        description: 'Неверный статус выплаты',
        example: { error: "Cannot update rate after payout is accepted" }
      }
    }
  },
  {
    id: 'create-dispute',
    method: 'POST',
    path: '/api/merchant/payouts/{id}/dispute',
    title: 'Создание спора',
    description: 'Создание спора по выплате (только для статуса CHECKING)',
    category: 'Выплаты',
    headers: [
      {
        name: 'x-merchant-api-key',
        type: 'string',
        required: true,
        description: 'API-ключ мерчанта'
      }
    ],
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'ID выплаты'
      }
    ],
    body: [
      {
        name: 'message',
        type: 'string',
        required: true,
        description: 'Сообщение о причине спора (минимум 10 символов)',
        example: 'Неверные реквизиты получателя'
      },
      {
        name: 'files',
        type: 'array',
        required: false,
        description: 'Массив URL файлов-доказательств',
        example: ['https://example.com/proof1.png', 'https://example.com/proof2.pdf']
      }
    ],
    responses: {
      '200': {
        description: 'Спор создан',
        example: {
          success: true,
          payout: {
            id: "payout123",
            numericId: 2001,
            status: "DISPUTED"
          }
        }
      },
      '400': {
        description: 'Неверный статус выплаты',
        example: { error: "Can only dispute payouts in checking status" }
      }
    }
  }
]

import { MerchantProtectedRoute } from '@/components/auth/merchant-protected-route'
import { MerchantLayout } from '@/components/layouts/merchant-layout'

export default function MerchantApiDocsPage() {
  const { merchant } = useMerchantAuth()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const categories = ['all', ...new Set(apiMethods.map(m => m.category))]
  const filteredMethods = apiMethods.filter(m => 
    selectedCategory === 'all' || m.category === selectedCategory
  )

  const toggleMethod = (methodId: string) => {
    const newExpanded = new Set(expandedMethods)
    if (newExpanded.has(methodId)) {
      newExpanded.delete(methodId)
    } else {
      newExpanded.add(methodId)
    }
    setExpandedMethods(newExpanded)
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      toast.success('Скопировано в буфер обмена')
    } catch (error) {
      toast.error('Не удалось скопировать')
    }
  }

  const generateCurlExample = (method: ApiMethod) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com'
    let curl = `curl ${baseUrl}${method.path}`
    
    // Replace path parameters
    if (method.pathParams) {
      method.pathParams.forEach(param => {
        curl = curl.replace(`{${param.name}}`, `YOUR_${param.name.toUpperCase()}`)
      })
    }
    
    // Add method if not GET
    if (method.method !== 'GET') {
      curl += ` \\\n  --request ${method.method}`
    }
    
    // Add headers
    curl += ` \\\n  --header 'x-merchant-api-key: ${merchant?.token || 'YOUR_API_KEY'}'`
    
    // Add body for POST/PATCH
    if (method.body && ['POST', 'PATCH'].includes(method.method)) {
      curl += ` \\\n  --header 'Content-Type: application/json'`
      const bodyExample: any = {}
      method.body.forEach(field => {
        bodyExample[field.name] = field.example || `YOUR_${field.name.toUpperCase()}`
      })
      curl += ` \\\n  --data '${JSON.stringify(bodyExample, null, 2)}'`
    }
    
    // Add query parameters
    if (method.queryParams && method.queryParams.length > 0) {
      const queryExample = method.queryParams
        .filter(p => p.required)
        .map(p => `${p.name}=VALUE`)
        .join('&')
      if (queryExample) {
        curl = curl.replace(method.path, `${method.path}?${queryExample}`)
      }
    }
    
    return curl
  }

  const generateJsExample = (method: ApiMethod) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com'
    let path = method.path
    
    // Replace path parameters
    if (method.pathParams) {
      method.pathParams.forEach(param => {
        path = path.replace(`{${param.name}}`, `\${${param.name}}`)
      })
    }

    let code = `const response = await fetch(\`${baseUrl}${path}\`, {\n`
    code += `  method: '${method.method}',\n`
    code += `  headers: {\n`
    code += `    'x-merchant-api-key': '${merchant?.token || 'YOUR_API_KEY'}',\n`
    
    if (method.body && ['POST', 'PATCH'].includes(method.method)) {
      code += `    'Content-Type': 'application/json',\n`
    }
    
    code += `  },\n`
    
    if (method.body && ['POST', 'PATCH'].includes(method.method)) {
      const bodyExample: any = {}
      method.body.forEach(field => {
        bodyExample[field.name] = field.example || `YOUR_${field.name.toUpperCase()}`
      })
      code += `  body: JSON.stringify(${JSON.stringify(bodyExample, null, 2).split('\n').join('\n  ')}),\n`
    }
    
    code += `})\n\n`
    code += `if (!response.ok) {\n`
    code += `  throw new Error(\`Error: \${response.status}\`)\n`
    code += `}\n\n`
    code += `const data = await response.json()\n`
    code += `console.log(data)`
    
    return code
  }

  return (
    <MerchantProtectedRoute>
      <MerchantLayout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Документация</h1>
            <p className="text-gray-600 mt-2">
              Полное руководство по интеграции с API платежной системы
            </p>
          </div>

      {/* Authentication Info */}
      <Alert>
        <ShieldCheck className="h-4 w-4 text-[#006039]" />
        <AlertTitle>Аутентификация</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            <p>Все запросы к API должны содержать заголовок <code className="bg-gray-100 px-1 rounded">x-merchant-api-key</code> с вашим API ключом.</p>
            <div className="flex items-center gap-2 mt-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                x-merchant-api-key: {merchant?.token || 'YOUR_API_KEY'}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(merchant?.token || '', 'api-key')}
              >
                {copiedId === 'api-key' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Категории</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'Все методы' : cat}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Methods */}
      <div className="space-y-4">
        {filteredMethods.map(method => (
          <Card key={method.id} className="overflow-hidden">
            <Collapsible
              open={expandedMethods.has(method.id)}
              onOpenChange={() => toggleMethod(method.id)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Badge 
                      className={`${methodColors[method.method]} text-white`}
                      variant="secondary"
                    >
                      {method.method}
                    </Badge>
                    <div className="text-left">
                      <div className="font-mono text-sm">{method.path}</div>
                      <div className="text-sm text-gray-600 mt-1">{method.title}</div>
                    </div>
                  </div>
                  {expandedMethods.has(method.id) ? (
                    <ChevronDown className="h-5 w-5 text-[#006039]" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-[#006039]" />
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t">
                  <div className="p-6">
                    <p className="text-gray-600 mb-6">{method.description}</p>

                    <Tabs defaultValue="parameters" className="w-full">
                      <TabsList>
                        <TabsTrigger value="parameters">Параметры</TabsTrigger>
                        <TabsTrigger value="examples">Примеры</TabsTrigger>
                        <TabsTrigger value="responses">Ответы</TabsTrigger>
                      </TabsList>

                      <TabsContent value="parameters" className="space-y-6 mt-6">
                        {/* Headers */}
                        {method.headers && method.headers.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3">Заголовки</h4>
                            <div className="space-y-2">
                              {method.headers.map(header => (
                                <div key={header.name} className="border rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                      {header.name}
                                    </code>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{header.type}</Badge>
                                      {header.required && (
                                        <Badge variant="destructive">Обязательный</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-2">{header.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Path Parameters */}
                        {method.pathParams && method.pathParams.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3">Параметры пути</h4>
                            <div className="space-y-2">
                              {method.pathParams.map(param => (
                                <div key={param.name} className="border rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                      {param.name}
                                    </code>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{param.type}</Badge>
                                      {param.required && (
                                        <Badge variant="destructive">Обязательный</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-2">{param.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Query Parameters */}
                        {method.queryParams && method.queryParams.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3">Query параметры</h4>
                            <div className="space-y-2">
                              {method.queryParams.map(param => (
                                <div key={param.name} className="border rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                      {param.name}
                                    </code>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{param.type}</Badge>
                                      {param.required && (
                                        <Badge variant="destructive">Обязательный</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-2">{param.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Body Parameters */}
                        {method.body && method.body.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3">Тело запроса</h4>
                            <div className="space-y-2">
                              {method.body.map(field => (
                                <div key={field.name} className="border rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                      {field.name}
                                    </code>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{field.type}</Badge>
                                      {field.required && (
                                        <Badge variant="destructive">Обязательный</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-2">{field.description}</p>
                                  {field.example !== undefined && (
                                    <div className="mt-2">
                                      <span className="text-xs text-gray-500">Пример: </span>
                                      <code className="text-xs bg-gray-100 px-1 rounded">
                                        {JSON.stringify(field.example)}
                                      </code>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="examples" className="space-y-6 mt-6">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">cURL</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(generateCurlExample(method), `curl-${method.id}`)}
                            >
                              {copiedId === `curl-${method.id}` ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
                            </Button>
                          </div>
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            {generateCurlExample(method)}
                          </pre>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">JavaScript</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(generateJsExample(method), `js-${method.id}`)}
                            >
                              {copiedId === `js-${method.id}` ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
                            </Button>
                          </div>
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            {generateJsExample(method)}
                          </pre>
                        </div>
                      </TabsContent>

                      <TabsContent value="responses" className="space-y-6 mt-6">
                        {Object.entries(method.responses).map(([code, response]) => (
                          <div key={code}>
                            <div className="flex items-center gap-3 mb-3">
                              <Badge 
                                variant={code.startsWith('2') ? 'default' : 'destructive'}
                              >
                                {code}
                              </Badge>
                              <span className="text-sm text-gray-600">{response.description}</span>
                            </div>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                              {JSON.stringify(response.example, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Additional Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <Webhook className="h-5 w-5 inline mr-2 text-[#006039]" />
              Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Система автоматически отправляет уведомления при изменении статуса транзакций и выплат.
            </p>
            
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="transactions" className="flex-1">Транзакции</TabsTrigger>
                <TabsTrigger value="payouts" className="flex-1">Выплаты</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transactions" className="mt-4">
                <p className="text-xs text-gray-600 mb-2">
                  URL указывается в параметре <code className="bg-gray-100 px-1 rounded">callbackUri</code>
                </p>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs">
                  <pre>{`POST https://your-domain.com/webhook
Content-Type: application/json
X-Signature: HMAC-SHA256

{
  "transactionId": "tx123",
  "orderId": "ORDER-12345",
  "status": "READY",
  "amount": 5000,
  "crypto": 52.36,
  "timestamp": "2024-01-01T10:05:00.000Z"
}`}</pre>
                </div>
              </TabsContent>
              
              <TabsContent value="payouts" className="mt-4">
                <p className="text-xs text-gray-600 mb-2">
                  URL указывается в параметре <code className="bg-gray-100 px-1 rounded">webhookUrl</code>
                </p>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs">
                  <pre>{`POST https://your-domain.com/webhook/payouts
Content-Type: application/json

{
  "event": "ACTIVE",
  "payout": {
    "id": "payout123",
    "numericId": 2001,
    "status": "ACTIVE",
    "amount": 10000,
    "amountUsdt": 104.71,
    "wallet": "TRx123...",
    "bank": "SBERBANK",
    "externalReference": "PAYOUT-12345",
    "metadata": { "userId": "user123" }
  }
}`}</pre>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  События: ACTIVE, CHECKING, COMPLETED, CANCELLED, DISPUTED
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <AlertCircle className="h-5 w-5 inline mr-2 text-[#006039]" />
              Коды ошибок
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Badge variant="outline">400</Badge>
                <span className="text-sm text-gray-600">Неверный запрос - проверьте параметры</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">401</Badge>
                <span className="text-sm text-gray-600">Неавторизован - проверьте API ключ</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">403</Badge>
                <span className="text-sm text-gray-600">Доступ запрещен - мерчант заблокирован</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">404</Badge>
                <span className="text-sm text-gray-600">Не найдено - ресурс не существует</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">409</Badge>
                <span className="text-sm text-gray-600">Конфликт - дублирование данных</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">500</Badge>
                <span className="text-sm text-gray-600">Внутренняя ошибка сервера</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Лимиты API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Создание транзакций</h4>
              <p className="text-sm text-gray-600">100 запросов в минуту</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Получение данных</h4>
              <p className="text-sm text-gray-600">1000 запросов в минуту</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Загрузка файлов</h4>
              <p className="text-sm text-gray-600">10 МБ максимальный размер</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
      </MerchantLayout>
    </MerchantProtectedRoute>
  )
}