// src/server/routes/trader/bank-details.ts
import { Elysia, t } from "elysia";
import { db } from "@/db";
import { BankType, MethodType } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { startOfDay, endOfDay } from "date-fns";

/* ---------- DTOs ---------- */
const DeviceDTO = t.Object({
  id: t.String(),
  name: t.String(),
  energy: t.Union([t.Number(), t.Null()]),
  ethernetSpeed: t.Union([t.Number(), t.Null()]),
  isOnline: t.Optional(t.Boolean()),
  token: t.String(),
  createdAt: t.String(),
  updatedAt: t.String(),
});

const BankDetailDTO = t.Object({
  id: t.String(),
  methodType: t.String(),
  bankType: t.String(),
  cardNumber: t.String(),
  recipientName: t.String(),
  phoneNumber: t.Optional(t.String()),
  minAmount: t.Number(),
  maxAmount: t.Number(),
  dailyLimit: t.Number(),
  monthlyLimit: t.Number(),
  intervalMinutes: t.Number(),
  turnoverDay: t.Number(),
  turnoverTotal: t.Number(),
  isArchived: t.Boolean(),
  hasDevice: t.Boolean(), // Flag indicating if this bank detail has a device
  device: DeviceDTO, // Connected device (empty object if no device)
  createdAt: t.String(),
  updatedAt: t.String(),
});

/* ---------- helpers ---------- */
const formatDevice = (device) => {
  if (!device) {
    // Return empty device object instead of null to satisfy schema requirements
    return {
      id: "",
      name: "",
      energy: 0,
      ethernetSpeed: 0,
      isOnline: false,
      token: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  
  return {
    id: device.id,
    name: device.name,
    energy: device.energy, // Can be null
    ethernetSpeed: device.ethernetSpeed, // Can be null
    isOnline: device.isOnline,
    token: device.token || '',
    createdAt: device.createdAt.toISOString(),
    updatedAt: device.updatedAt.toISOString(),
  };
};

const toDTO = (
  bankDetail,
  turnoverDay = 0,
  turnoverTotal = 0,
  device = null,
) => {
  const { 
    userId, 
    device: deviceFromRelation, 
    maxCountTransactions,
    dailyTraffic,
    monthlyTraffic,
    deviceId,
    ...rest 
  } = bankDetail;
  
  // Try to get device from the device property if it exists and no device was provided
  const deviceToUse = device || deviceFromRelation;
  
  return {
    ...rest,
    phoneNumber: rest.phoneNumber || "", // Ensure phoneNumber is never null for DTO
    turnoverDay,
    turnoverTotal,
    hasDevice: !!deviceToUse,
    device: formatDevice(deviceToUse),
    createdAt: bankDetail.createdAt.toISOString(),
    updatedAt: bankDetail.updatedAt.toISOString(),
  };
};

/* ---------- routes ---------- */
export default (app: Elysia) =>
  app
    /* ───────── GET /trader/bank-details ───────── */
    .get(
      "",
      async ({ trader, query }) => {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        // Get bank details with their devices
        const bankDetails = await db.bankDetail.findMany({
          where: { 
            userId: trader.id, 
            isArchived: query.archived === "true" 
          },
          include: {
            device: true
          },
          orderBy: { createdAt: "desc" },
        });

        const result = await Promise.all(
          bankDetails.map(async (bd) => {
            /* —— daily turnover (only READY transactions) —— */
            const {
              _sum: { amount: daySum },
            } = await db.transaction.aggregate({
              where: {
                bankDetailId: bd.id,
                createdAt: { gte: todayStart, lte: todayEnd },
                status: "READY",
              },
              _sum: { amount: true },
            });

            /* —— total turnover (only READY transactions) —— */
            const {
              _sum: { amount: totalSum },
            } = await db.transaction.aggregate({
              where: {
                bankDetailId: bd.id,
                status: "READY",
              },
              _sum: { amount: true },
            });

            return toDTO(bd, daySum ?? 0, totalSum ?? 0);
          }),
        );

        return result;
      },
      {
        tags: ["trader"],
        detail: { summary: "Список реквизитов" },
        query: t.Object({ archived: t.Optional(t.String()) }),
        response: {
          200: t.Array(BankDetailDTO),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────── POST /trader/bank-details ───────── */
    .post(
      "",
      async ({ trader, body, error }) => {
        // Проверяем, что минимальная и максимальная суммы в пределах лимитов трейдера
        if (body.minAmount < trader.minAmountPerRequisite) {
          return error(400, { 
            error: `Минимальная сумма должна быть не менее ${trader.minAmountPerRequisite}` 
          });
        }
        
        if (body.maxAmount > trader.maxAmountPerRequisite) {
          return error(400, { 
            error: `Максимальная сумма не должна превышать ${trader.maxAmountPerRequisite}` 
          });
        }
        
        if (body.minAmount > body.maxAmount) {
          return error(400, { 
            error: "Минимальная сумма не может быть больше максимальной" 
          });
        }

        // Map frontend bank type to database enum
        const bankTypeMap: Record<string, string> = {
          "SBER": "SBERBANK",
          "TINK": "TINKOFF",
          "VTB": "VTB",
          "ALFA": "ALFABANK",
          "GAZPROM": "GAZPROMBANK",
          "OZON": "OZONBANK",
          "RAIFF": "RAIFFEISEN",
          "POCHTA": "POCHTABANK",
          "RSHB": "ROSSELKHOZBANK",
          "MTS": "MTSBANK"
        };
        
        const mappedBankType = bankTypeMap[body.bankType] || body.bankType;

        const bankDetail = await db.bankDetail.create({
          data: {
            cardNumber: body.cardNumber,
            bankType: mappedBankType as BankType,
            methodType: body.methodType as MethodType,
            recipientName: body.recipientName,
            phoneNumber: body.phoneNumber,
            minAmount: body.minAmount,
            maxAmount: body.maxAmount,
            dailyLimit: body.dailyLimit ?? 0,
            monthlyLimit: body.monthlyLimit ?? 0,
            intervalMinutes: body.intervalMinutes,
            userId: trader.id,
            deviceId: body.deviceId,
          },
        });
        
        // Bank detail was just created, so there are no devices yet
        return toDTO(bankDetail, 0, 0);
      },
      {
        tags: ["trader"],
        detail: { summary: "Создать реквизит" },
        body: t.Object({
          methodId: t.Optional(t.String()),
          cardNumber: t.String(),
          bankType: t.String(),
          methodType: t.String(),
          recipientName: t.String(),
          phoneNumber: t.Optional(t.String()),
          minAmount: t.Number(),
          maxAmount: t.Number(),
          dailyLimit: t.Optional(t.Number()),
          monthlyLimit: t.Optional(t.Number()),
          intervalMinutes: t.Number(),
          deviceId: t.Optional(t.String()),
        }),
        response: { 
          200: BankDetailDTO, 
          400: ErrorSchema,
          401: ErrorSchema, 
          403: ErrorSchema 
        },
      },
    )

    /* ───────── PUT /trader/bank-details/:id ───────── */
    .put(
      "/:id",
      async ({ trader, params, body, error }) => {
        const exists = await db.bankDetail.findFirst({
          where: { id: params.id, userId: trader.id },
        });

        if (!exists) return error(404, { error: "Реквизит не найден" });
        if (!exists.isArchived)
          return error(400, { error: "Реквизит нужно сначала архивировать" });

        // Проверяем лимиты трейдера если обновляются суммы
        if (body.minAmount !== undefined && body.minAmount < trader.minAmountPerRequisite) {
          return error(400, { 
            error: `Минимальная сумма должна быть не менее ${trader.minAmountPerRequisite}` 
          });
        }
        
        if (body.maxAmount !== undefined && body.maxAmount > trader.maxAmountPerRequisite) {
          return error(400, { 
            error: `Максимальная сумма не должна превышать ${trader.maxAmountPerRequisite}` 
          });
        }
        
        const minAmount = body.minAmount ?? exists.minAmount;
        const maxAmount = body.maxAmount ?? exists.maxAmount;
        
        if (minAmount > maxAmount) {
          return error(400, { 
            error: "Минимальная сумма не может быть больше максимальной" 
          });
        }

        // Map frontend bank type to database enum for updates
        const bankTypeMap: Record<string, string> = {
          "SBER": "SBERBANK",
          "TINK": "TINKOFF",
          "VTB": "VTB",
          "ALFA": "ALFABANK",
          "GAZPROM": "GAZPROMBANK",
          "OZON": "OZONBANK",
          "RAIFF": "RAIFFEISEN",
          "POCHTA": "POCHTABANK",
          "RSHB": "ROSSELKHOZBANK",
          "MTS": "MTSBANK"
        };
        
        const mappedBankType = body.bankType ? (bankTypeMap[body.bankType] || body.bankType) : exists.bankType;

        const bankDetail = await db.bankDetail.update({
          where: { id: params.id },
          data: {
            ...body,
            dailyLimit: body.dailyLimit ?? 0,
            monthlyLimit: body.monthlyLimit ?? 0,
            bankType: mappedBankType as BankType,
          },
          include: {
            device: true
          }
        });
        
        return toDTO(bankDetail, 0, 0);
      },
      {
        tags: ["trader"],
        detail: { summary: "Обновить реквизит" },
        params: t.Object({ id: t.String() }),
        body: t.Partial(
          t.Object({
            methodType: t.String(),
            bankType: t.String(),
            cardNumber: t.String(),
            recipientName: t.String(),
            phoneNumber: t.Optional(t.String()),
            minAmount: t.Number(),
            maxAmount: t.Number(),
            dailyLimit: t.Number(),
            monthlyLimit: t.Number(),
            intervalMinutes: t.Number(),
          })
        ),
        response: {
          200: BankDetailDTO,
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )

    /* ───────── PATCH /trader/bank-details/:id/archive ───────── */
    .patch(
      "/:id/archive",
      async ({ trader, params, body }) => {
        await db.bankDetail.update({
          where: { id: params.id, userId: trader.id },
          data: { isArchived: body.archived },
        });
        return { ok: true };
      },
      {
        tags: ["trader"],
        detail: { summary: "Архивировать / разархивировать" },
        params: t.Object({ id: t.String() }),
        body: t.Object({ archived: t.Boolean() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )
    
    /* ───────── GET /trader/bank-details/:id/device/notifications ───────── */
    .get(
      "/:id/device/notifications",
      async ({ trader, params, error }) => {
        const bankDetail = await db.bankDetail.findFirst({
          where: { id: params.id, userId: trader.id },
          include: {
            device: {
              include: {
                notifications: {
                  orderBy: { createdAt: 'desc' },
                  take: 100, // Limit to last 100 notifications
                }
              }
            }
          }
        });

        if (!bankDetail) {
          return error(404, { error: "Реквизит не найден" });
        }

        if (!bankDetail.device || bankDetail.device.length === 0) {
          return error(404, { error: "К реквизиту не подключено устройство" });
        }

        const device = bankDetail.device[0];
        
        return {
          deviceId: device.id,
          deviceName: device.name,
          isOnline: device.isOnline,
          notifications: device.notifications.map(n => ({
            id: n.id,
            type: n.type,
            application: n.application,
            title: n.title,
            message: n.message,
            metadata: n.metadata,
            isRead: n.isRead,
            createdAt: n.createdAt.toISOString(),
          }))
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Получить уведомления устройства" },
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            deviceId: t.String(),
            deviceName: t.String(),
            isOnline: t.Union([t.Boolean(), t.Null()]),
            notifications: t.Array(t.Object({
              id: t.String(),
              type: t.String(),
              application: t.Union([t.String(), t.Null()]),
              title: t.Union([t.String(), t.Null()]),
              message: t.String(),
              metadata: t.Any(),
              isRead: t.Boolean(),
              createdAt: t.String(),
            }))
          }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────── DELETE /trader/bank-details/:id/device ───────── */
    .delete(
      "/:id/device",
      async ({ trader, params, error }) => {
        const bankDetail = await db.bankDetail.findFirst({
          where: { id: params.id, userId: trader.id },
          include: {
            device: true
          }
        });

        if (!bankDetail) {
          return error(404, { error: "Реквизит не найден" });
        }

        if (!bankDetail.device || bankDetail.device.length === 0) {
          return error(404, { error: "К реквизиту не подключено устройство" });
        }

        // Delete all notifications first (cascade delete)
        await db.notification.deleteMany({
          where: {
            deviceId: bankDetail.device[0].id
          }
        });

        // Delete the device
        await db.device.delete({
          where: {
            id: bankDetail.device[0].id
          }
        });

        return { ok: true, message: "Устройство успешно отключено" };
      },
      {
        tags: ["trader"],
        detail: { summary: "Отключить устройство от реквизита" },
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean(), message: t.String() }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────── PATCH /trader/bank-details/:id/device/notifications/mark-read ───────── */
    .patch(
      "/:id/device/notifications/mark-read",
      async ({ trader, params, body, error }) => {
        const bankDetail = await db.bankDetail.findFirst({
          where: { id: params.id, userId: trader.id },
          include: {
            device: true
          }
        });

        if (!bankDetail) {
          return error(404, { error: "Реквизит не найден" });
        }

        if (!bankDetail.device || bankDetail.device.length === 0) {
          return error(404, { error: "К реквизиту не подключено устройство" });
        }

        // Mark notifications as read
        await db.notification.updateMany({
          where: {
            deviceId: bankDetail.device[0].id,
            id: { in: body.notificationIds }
          },
          data: {
            isRead: true
          }
        });

        return { ok: true };
      },
      {
        tags: ["trader"],
        detail: { summary: "Отметить уведомления как прочитанные" },
        params: t.Object({ id: t.String() }),
        body: t.Object({ notificationIds: t.Array(t.String()) }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────── PATCH /trader/bank-details/:id/start ───────── */
    .patch(
      "/:id/start",
      async ({ trader, params, error }) => {
        const bankDetail = await db.bankDetail.findFirst({
          where: { id: params.id, userId: trader.id }
        });

        if (!bankDetail) {
          return error(404, { error: "Реквизит не найден" });
        }

        // Note: status field doesn't exist in current schema
        // Could add isArchived: false or other status tracking
        await db.bankDetail.update({
          where: { id: params.id },
          data: { isArchived: false }
        });

        return { ok: true, message: "Реквизит запущен" };
      },
      {
        tags: ["trader"],
        detail: { summary: "Запустить реквизит" },
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean(), message: t.String() }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────── PATCH /trader/bank-details/:id/stop ───────── */
    .patch(
      "/:id/stop",
      async ({ trader, params, error }) => {
        const bankDetail = await db.bankDetail.findFirst({
          where: { id: params.id, userId: trader.id }
        });

        if (!bankDetail) {
          return error(404, { error: "Реквизит не найден" });
        }

        // Note: status field doesn't exist in current schema  
        // Using isArchived as a proxy for inactive status
        await db.bankDetail.update({
          where: { id: params.id },
          data: { isArchived: true }
        });

        return { ok: true, message: "Реквизит остановлен" };
      },
      {
        tags: ["trader"],
        detail: { summary: "Остановить реквизит" },
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean(), message: t.String() }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      },
    );