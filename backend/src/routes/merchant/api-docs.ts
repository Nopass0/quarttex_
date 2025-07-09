import { Elysia, t } from "elysia";
import { merchantSessionGuard } from "@/middleware/merchantSessionGuard";
import ErrorSchema from "@/types/error";

/**
 * Маршруты для интерактивной документации API мерчанта
 * Все эндпоинты защищены проверкой сессии мерчанта
 */
export default (app: Elysia) =>
  app
    .use(merchantSessionGuard())
    
    /* ──────── GET /merchant/api-docs/endpoints ──────── */
    .get(
      "/endpoints",
      async ({ merchant }) => {
        return {
          baseUrl: process.env.API_URL || "https://api.example.com",
          authentication: {
            type: "header",
            name: "x-merchant-api-key",
            description: "API ключ мерчанта для аутентификации запросов",
            example: merchant.token,
          },
          endpoints: [
            {
              id: "connect",
              method: "GET",
              path: "/merchant/connect",
              description: "Получение информации о мерчанте",
              category: "Общие",
              parameters: [],
              response: {
                example: {
                  id: "123",
                  name: "Название мерчанта",
                  createdAt: "2024-01-01T00:00:00.000Z",
                  totalTx: 100,
                  paidTx: 80,
                },
              },
            },
            {
              id: "balance",
              method: "GET",
              path: "/merchant/balance",
              description: "Получение текущего баланса мерчанта в USDT",
              category: "Общие",
              parameters: [],
              response: {
                example: {
                  balance: 1000.50,
                },
              },
            },
            {
              id: "methods",
              method: "GET",
              path: "/merchant/methods",
              description: "Получение списка доступных методов платежа",
              category: "Методы",
              parameters: [],
              response: {
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
                    isEnabled: true,
                  },
                ],
              },
            },
            {
              id: "create-transaction",
              method: "POST",
              path: "/merchant/transactions/create",
              description: "Создание новой транзакции (платежа)",
              category: "Транзакции",
              parameters: [
                {
                  name: "amount",
                  type: "number",
                  required: true,
                  description: "Сумма транзакции в рублях",
                  example: 5000,
                },
                {
                  name: "orderId",
                  type: "string",
                  required: true,
                  description: "Уникальный ID заказа от мерчанта",
                  example: "ORDER-12345",
                },
                {
                  name: "methodId",
                  type: "string",
                  required: true,
                  description: "ID метода платежа",
                  example: "method1",
                },
                {
                  name: "rate",
                  type: "number",
                  required: true,
                  description: "Курс USDT/RUB",
                  example: 95.5,
                },
                {
                  name: "expired_at",
                  type: "string",
                  required: true,
                  description: "ISO дата истечения транзакции",
                  example: "2024-01-01T12:00:00.000Z",
                },
                {
                  name: "userIp",
                  type: "string",
                  required: false,
                  description: "IP адрес пользователя",
                  example: "192.168.1.1",
                },
                {
                  name: "userId",
                  type: "string",
                  required: false,
                  description: "ID пользователя (по умолчанию генерируется)",
                  example: "user123",
                },
                {
                  name: "type",
                  type: "string",
                  required: false,
                  description: "Тип транзакции: IN (ввод) или OUT (вывод). По умолчанию IN",
                  example: "IN",
                },
              ],
              response: {
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
                    traderName: "Trader Name",
                  },
                  createdAt: "2024-01-01T10:00:00.000Z",
                  updatedAt: "2024-01-01T10:00:00.000Z",
                  expired_at: "2024-01-01T12:00:00.000Z",
                  method: {
                    id: "method1",
                    code: "sbp",
                    name: "СБП",
                    type: "sbp",
                    currency: "usdt",
                  },
                },
              },
            },
            {
              id: "transaction-status",
              method: "GET",
              path: "/merchant/transactions/status/:id",
              description: "Получение статуса транзакции по ID",
              category: "Транзакции",
              parameters: [
                {
                  name: "id",
                  type: "string",
                  required: true,
                  description: "ID транзакции",
                  example: "tx123",
                  in: "path",
                },
              ],
              response: {
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
                    currency: "usdt",
                  },
                },
              },
            },
            {
              id: "transaction-by-order",
              method: "GET",
              path: "/merchant/transactions/by-order-id/:orderId",
              description: "Получение транзакции по orderId",
              category: "Транзакции",
              parameters: [
                {
                  name: "orderId",
                  type: "string",
                  required: true,
                  description: "Order ID транзакции",
                  example: "ORDER-12345",
                  in: "path",
                },
              ],
              response: {
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
                    currency: "usdt",
                  },
                  requisites: {
                    id: "req123",
                    bankType: "SBERBANK",
                    cardNumber: "2202 **** **** 1234",
                    recipientName: "Иван И.",
                    traderId: "trader123",
                    traderName: "Trader Name",
                  },
                },
              },
            },
            {
              id: "cancel-transaction",
              method: "PATCH",
              path: "/merchant/transactions/by-order-id/:orderId/cancel",
              description: "Отмена транзакции по orderId",
              category: "Транзакции",
              parameters: [
                {
                  name: "orderId",
                  type: "string",
                  required: true,
                  description: "Order ID транзакции",
                  example: "ORDER-12345",
                  in: "path",
                },
              ],
              response: {
                example: {
                  success: true,
                  transaction: {
                    id: "tx123",
                    status: "CANCELED",
                    // ... остальные поля транзакции
                  },
                },
              },
            },
            {
              id: "list-transactions",
              method: "GET",
              path: "/merchant/transactions/list",
              description: "Получение списка транзакций с фильтрацией",
              category: "Транзакции",
              parameters: [
                {
                  name: "page",
                  type: "number",
                  required: false,
                  description: "Номер страницы (по умолчанию 1)",
                  example: 1,
                  in: "query",
                },
                {
                  name: "limit",
                  type: "number",
                  required: false,
                  description: "Количество записей на странице (по умолчанию 10)",
                  example: 10,
                  in: "query",
                },
                {
                  name: "status",
                  type: "string",
                  required: false,
                  description: "Фильтр по статусу: CREATED, IN_PROGRESS, DISPUTE, EXPIRED, READY, MILK, CANCELED",
                  example: "READY",
                  in: "query",
                },
                {
                  name: "type",
                  type: "string",
                  required: false,
                  description: "Фильтр по типу: IN, OUT",
                  example: "IN",
                  in: "query",
                },
                {
                  name: "methodId",
                  type: "string",
                  required: false,
                  description: "Фильтр по ID метода",
                  example: "method1",
                  in: "query",
                },
                {
                  name: "orderId",
                  type: "string",
                  required: false,
                  description: "Фильтр по orderId",
                  example: "ORDER",
                  in: "query",
                },
              ],
              response: {
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
                        currency: "usdt",
                      },
                    },
                  ],
                  pagination: {
                    total: 100,
                    page: 1,
                    limit: 10,
                    pages: 10,
                  },
                },
              },
            },
            {
              id: "upload-receipt",
              method: "POST",
              path: "/merchant/transactions/:id/receipt",
              description: "Загрузка чека для транзакции",
              category: "Чеки",
              parameters: [
                {
                  name: "id",
                  type: "string",
                  required: true,
                  description: "ID транзакции",
                  example: "tx123",
                  in: "path",
                },
                {
                  name: "fileData",
                  type: "string",
                  required: true,
                  description: "Файл в формате base64",
                  example: "data:image/png;base64,iVBORw0KGgoAAAANS...",
                },
                {
                  name: "fileName",
                  type: "string",
                  required: true,
                  description: "Имя файла",
                  example: "receipt.png",
                },
                {
                  name: "updateStatus",
                  type: "string",
                  required: false,
                  description: "Обновить статус транзакции",
                  example: "READY",
                },
              ],
              response: {
                example: {
                  id: "receipt123",
                  fileName: "receipt.png",
                  isChecked: false,
                  isFake: false,
                  isAuto: false,
                  createdAt: "2024-01-01T10:00:00.000Z",
                },
              },
            },
            {
              id: "get-receipts",
              method: "GET",
              path: "/merchant/transactions/:id/receipts",
              description: "Получение всех чеков для транзакции",
              category: "Чеки",
              parameters: [
                {
                  name: "id",
                  type: "string",
                  required: true,
                  description: "ID транзакции",
                  example: "tx123",
                  in: "path",
                },
              ],
              response: {
                example: [
                  {
                    id: "receipt123",
                    fileName: "receipt.png",
                    isChecked: true,
                    isFake: false,
                    isAuto: false,
                    createdAt: "2024-01-01T10:00:00.000Z",
                    updatedAt: "2024-01-01T10:05:00.000Z",
                  },
                ],
              },
            },
            {
              id: "get-enums",
              method: "GET",
              path: "/merchant/enums",
              description: "Получение всех enum значений",
              category: "Справочники",
              parameters: [],
              response: {
                example: {
                  status: ["CREATED", "IN_PROGRESS", "DISPUTE", "EXPIRED", "READY", "MILK", "CANCELED"],
                  transactionType: ["IN", "OUT"],
                  methodType: ["upi", "c2ckz", "c2cuz", "c2caz", "c2c", "sbp", "spay", "tpay", "vpay", "apay", "m2ctj", "m2ntj", "m2csber", "m2ctbank", "connectc2c", "connectsbp", "nspk", "ecom", "crypto"],
                  currency: ["rub", "usdt"],
                },
              },
            },
          ],
          webhooks: {
            description: "Система автоматически отправляет уведомления на указанный callbackUri при изменении статуса транзакции",
            example: {
              url: "https://your-domain.com/webhook",
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Signature": "HMAC-SHA256 подпись тела запроса",
              },
              body: {
                transactionId: "tx123",
                orderId: "ORDER-12345",
                status: "READY",
                amount: 5000,
                crypto: 52.36,
                timestamp: "2024-01-01T10:05:00.000Z",
              },
            },
          },
          errors: {
            "400": "Неверный запрос - проверьте параметры",
            "401": "Неавторизован - проверьте API ключ",
            "403": "Доступ запрещен - мерчант заблокирован или деактивирован",
            "404": "Не найдено - ресурс не существует",
            "409": "Конфликт - дублирование данных (например, orderId)",
            "500": "Внутренняя ошибка сервера",
          },
        };
      },
      {
        tags: ["merchant-api-docs"],
        detail: { summary: "Получение полной документации API для мерчанта" },
        headers: t.Object({ authorization: t.String() }),
        response: {
          200: t.Object({
            baseUrl: t.String(),
            authentication: t.Object({
              type: t.String(),
              name: t.String(),
              description: t.String(),
              example: t.String(),
            }),
            endpoints: t.Array(
              t.Object({
                id: t.String(),
                method: t.String(),
                path: t.String(),
                description: t.String(),
                category: t.String(),
                parameters: t.Array(
                  t.Object({
                    name: t.String(),
                    type: t.String(),
                    required: t.Boolean(),
                    description: t.String(),
                    example: t.Any(),
                    in: t.Optional(t.String()),
                  })
                ),
                response: t.Object({
                  example: t.Any(),
                }),
              })
            ),
            webhooks: t.Object({
              description: t.String(),
              example: t.Object({
                url: t.String(),
                method: t.String(),
                headers: t.Any(),
                body: t.Any(),
              }),
            }),
            errors: t.Any(),
          }),
          401: ErrorSchema,
        },
      },
    )

    /* ──────── POST /merchant/api-docs/test ──────── */
    .post(
      "/test",
      async ({ body, merchant, error }) => {
        try {
          // Формируем заголовки
          const headers: any = {
            "Content-Type": "application/json",
            "x-merchant-api-key": merchant.token,
          };

          // Добавляем дополнительные заголовки если есть
          if (body.headers) {
            Object.assign(headers, body.headers);
          }

          // Формируем URL
          const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
          const url = `${baseUrl}${body.path}`;

          // Выполняем запрос
          const response = await fetch(url, {
            method: body.method,
            headers,
            body: body.method !== "GET" && body.body ? JSON.stringify(body.body) : undefined,
          });

          // Получаем ответ
          const responseData = await response.text();
          let parsedResponse;
          
          try {
            parsedResponse = JSON.parse(responseData);
          } catch {
            parsedResponse = responseData;
          }

          return {
            request: {
              method: body.method,
              url,
              headers,
              body: body.body,
            },
            response: {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              body: parsedResponse,
            },
            duration: 0, // В реальной реализации можно замерить время выполнения
          };
        } catch (e: any) {
          return error(500, { 
            error: "Ошибка при выполнении тестового запроса", 
            details: e.message 
          });
        }
      },
      {
        tags: ["merchant-api-docs"],
        detail: { summary: "Тестирование API эндпоинта" },
        headers: t.Object({ authorization: t.String() }),
        body: t.Object({
          method: t.String({ description: "HTTP метод" }),
          path: t.String({ description: "Путь API" }),
          headers: t.Optional(t.Any({ description: "Дополнительные заголовки" })),
          body: t.Optional(t.Any({ description: "Тело запроса для POST/PUT/PATCH" })),
        }),
        response: {
          200: t.Object({
            request: t.Object({
              method: t.String(),
              url: t.String(),
              headers: t.Any(),
              body: t.Optional(t.Any()),
            }),
            response: t.Object({
              status: t.Number(),
              statusText: t.String(),
              headers: t.Any(),
              body: t.Any(),
            }),
            duration: t.Number(),
          }),
          401: ErrorSchema,
          500: ErrorSchema,
        },
      },
    );