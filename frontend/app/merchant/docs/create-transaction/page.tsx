"use client"

import { MerchantProtectedRoute } from "@/components/auth/merchant-protected-route"
import { MerchantLayout } from "@/components/layouts/merchant-layout"
import { ApiDocumentation } from "@/components/merchant/api-documentation"

const createTransactionDoc = {
  title: "Создание транзакции",
  description: "Создание новой транзакции для приема или отправки платежа",
  endpoint: "/api/merchant/transaction/create",
  method: "POST" as const,
  headers: [
    {
      name: "x-api-key",
      type: "string",
      required: true,
      description: "Ваш API ключ"
    },
    {
      name: "Content-Type",
      type: "string",
      required: true,
      description: "application/json"
    }
  ],
  parameters: [
    {
      name: "amount",
      type: "number",
      required: true,
      description: "Сумма транзакции в рублях"
    },
    {
      name: "methodCode",
      type: "string",
      required: true,
      description: "Код метода оплаты (например: sbp, c2c)"
    },
    {
      name: "type",
      type: "string",
      required: true,
      description: "Тип транзакции: IN (прием) или OUT (отправка)"
    },
    {
      name: "externalId",
      type: "string",
      required: false,
      description: "Ваш внутренний ID транзакции для отслеживания"
    },
    {
      name: "webhookUrl",
      type: "string",
      required: false,
      description: "URL для отправки webhook уведомлений о статусе"
    },
    {
      name: "redirectUrl",
      type: "string",
      required: false,
      description: "URL для редиректа после оплаты"
    }
  ],
  responses: [
    {
      status: 200,
      description: "Транзакция успешно создана",
      example: {
        success: true,
        transaction: {
          id: "clx1234567890",
          numericId: 1234567,
          status: "CREATED",
          amount: 1000,
          commission: 10,
          paymentUrl: "https://pay.example.com/t/clx1234567890",
          expiresAt: "2024-01-01T12:00:00Z"
        }
      }
    },
    {
      status: 400,
      description: "Неверные параметры запроса",
      example: {
        error: "Invalid amount"
      }
    },
    {
      status: 401,
      description: "Неверный API ключ",
      example: {
        error: "Invalid API key"
      }
    },
    {
      status: 409,
      description: "Нет доступных реквизитов",
      example: {
        error: "NO_REQUISITE: подходящий реквизит не найден"
      }
    }
  ],
  exampleRequest: {
    amount: 1000,
    methodCode: "sbp",
    type: "IN",
    externalId: "ORDER-123456",
    webhookUrl: "https://yoursite.com/webhook",
    redirectUrl: "https://yoursite.com/success"
  }
}

export default function CreateTransactionDocsPage() {
  return (
    <MerchantProtectedRoute>
      <MerchantLayout>
        <ApiDocumentation {...createTransactionDoc} />
      </MerchantLayout>
    </MerchantProtectedRoute>
  )
}