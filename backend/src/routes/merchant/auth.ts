import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import crypto from "crypto";

/**
 * Маршруты для аутентификации мерчантов
 * Доступны без проверки токена
 */
export default (app: Elysia) =>
  app
    /* ──────── POST /merchant/auth/login ──────── */
    .post(
      "/login",
      async ({ body, error, set }) => {
        // Проверяем токен сотрудника
        const staff = await db.merchantStaff.findFirst({
          where: { token: body.token, isActive: true },
        });

        let merchant;
        let role: "owner" | "staff" = "owner";
        let staffId: string | null = null;
        let rights = {
          can_settle: true,
          can_view_docs: true,
          can_view_token: true,
          can_manage_disputes: true,
        };

        if (staff) {
          merchant = await db.merchant.findUnique({
            where: { id: staff.merchantId },
          });
          if (!merchant) {
            return error(401, { error: "Неверный токен" });
          }
          role = staff.role;
          staffId = staff.id;
          rights = {
            can_settle: false,
            can_view_docs: false,
            can_view_token: false,
            can_manage_disputes: true,
          };
        } else {
          merchant = await db.merchant.findUnique({
            where: { token: body.token },
          });

          if (!merchant) {
            return error(401, { error: "Неверный токен" });
          }
        }

        // Проверка статуса мерчанта
        if (merchant.disabled) {
          return error(403, { error: "Мерчант деактивирован" });
        }

        if (merchant.banned) {
          return error(403, { error: "Мерчант заблокирован" });
        }

        // Создаем сессионный токен
        const sessionToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

        // Сохраняем сессию в базе данных
        const sessionData = {
          merchantId: merchant.id,
          staffId,
          role,
          rights,
          expiresAt,
        };

        await db.systemConfig.upsert({
          where: { key: `merchant_session_${sessionToken}` },
          update: { value: JSON.stringify(sessionData) },
          create: {
            key: `merchant_session_${sessionToken}`,
            value: JSON.stringify(sessionData),
          },
        });

        // Получаем статистику мерчанта
        const [totalTransactions, successfulTransactions, totalVolume] = await Promise.all([
          db.transaction.count({
            where: { merchantId: merchant.id },
          }),
          db.transaction.count({
            where: { merchantId: merchant.id, status: "READY" },
          }),
          db.transaction.aggregate({
            where: { merchantId: merchant.id, status: "READY" },
            _sum: { amount: true },
          }),
        ]);

        set.status = 200;
        return {
          success: true,
          sessionToken,
          expiresAt: expiresAt.toISOString(),
          role,
          rights,
          merchant: {
            id: merchant.id,
            name: merchant.name,
            balanceUsdt: merchant.balanceUsdt,
            createdAt: merchant.createdAt.toISOString(),
            statistics: {
              totalTransactions,
              successfulTransactions,
              successRate: totalTransactions > 0
                ? Math.round((successfulTransactions / totalTransactions) * 100)
                : 0,
              totalVolume: totalVolume._sum.amount || 0,
            },
          },
        };
      },
      {
        tags: ["merchant-auth"],
        detail: { summary: "Вход в систему для мерчанта" },
        body: t.Object({
          token: t.String({ description: "API токен мерчанта" }),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            sessionToken: t.String({ description: "Сессионный токен для авторизации" }),
            expiresAt: t.String({ description: "Время истечения сессии" }),
            role: t.String(),
            rights: t.Record(t.String(), t.Boolean()),
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
              balanceUsdt: t.Number(),
              createdAt: t.String(),
              statistics: t.Object({
                totalTransactions: t.Number(),
                successfulTransactions: t.Number(),
                successRate: t.Number(),
                totalVolume: t.Number(),
              }),
            }),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ──────── POST /merchant/auth/logout ──────── */
    .post(
      "/logout",
      async ({ headers, set }) => {
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          set.status = 200;
          return { success: true };
        }

        const sessionToken = authHeader.substring(7);
        
        // Удаляем сессию из базы данных
        try {
          await db.systemConfig.delete({
            where: { key: `merchant_session_${sessionToken}` },
          });
        } catch (e) {
          // Игнорируем ошибку, если сессия не найдена
        }

        set.status = 200;
        return { success: true };
      },
      {
        tags: ["merchant-auth"],
        detail: { summary: "Выход из системы для мерчанта" },
        headers: t.Object({
          authorization: t.Optional(t.String({ description: "Bearer токен сессии" })),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
          }),
        },
      },
    )

    /* ──────── GET /merchant/auth/me ──────── */
    .get(
      "/me",
      async ({ headers, error }) => {
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return error(401, { error: "Отсутствует токен авторизации" });
        }

        const sessionToken = authHeader.substring(7);
        
        // Получаем сессию из базы данных
        const sessionConfig = await db.systemConfig.findUnique({
          where: { key: `merchant_session_${sessionToken}` },
        });

        if (!sessionConfig) {
          return error(401, { error: "Недействительная сессия" });
        }

        const session = JSON.parse(sessionConfig.value);
        
        // Проверяем срок действия сессии
        if (new Date(session.expiresAt) < new Date()) {
          // Удаляем истекшую сессию
          await db.systemConfig.delete({
            where: { key: `merchant_session_${sessionToken}` },
          });
          return error(401, { error: "Сессия истекла" });
        }

        // Получаем данные мерчанта
        const merchant = await db.merchant.findUnique({
          where: { id: session.merchantId },
        });

        if (!merchant) {
          return error(404, { error: "Мерчант не найден" });
        }

        // Получаем статистику мерчанта
        const [totalTransactions, successfulTransactions, totalVolume, methods] = await Promise.all([
          db.transaction.count({
            where: { merchantId: merchant.id },
          }),
          db.transaction.count({
            where: { merchantId: merchant.id, status: "READY" },
          }),
          db.transaction.aggregate({
            where: { merchantId: merchant.id, status: "READY" },
            _sum: { amount: true },
          }),
          db.merchantMethod.findMany({
            where: { merchantId: merchant.id, isEnabled: true },
            include: {
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                  isEnabled: true,
                },
              },
            },
          }),
        ]);

        return {
          merchant: {
            id: merchant.id,
            name: merchant.name,
            balanceUsdt: merchant.balanceUsdt,
            countInRubEquivalent: merchant.countInRubEquivalent,
            createdAt: merchant.createdAt.toISOString(),
            statistics: {
              totalTransactions,
              successfulTransactions,
              successRate: totalTransactions > 0
                ? Math.round((successfulTransactions / totalTransactions) * 100)
                : 0,
              totalVolume: totalVolume._sum.amount || 0,
            },
            methods: methods.filter(mm => mm.method.isEnabled).map(mm => mm.method),
          },
          role: session.role,
          rights: session.rights,
        };
      },
      {
        tags: ["merchant-auth"],
        detail: { summary: "Получение текущего мерчанта" },
        headers: t.Object({
          authorization: t.String({ description: "Bearer токен сессии" }),
        }),
        response: {
          200: t.Object({
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
              balanceUsdt: t.Number(),
              countInRubEquivalent: t.Boolean(),
              createdAt: t.String(),
              statistics: t.Object({
                totalTransactions: t.Number(),
                successfulTransactions: t.Number(),
                successRate: t.Number(),
                totalVolume: t.Number(),
              }),
              methods: t.Array(
                t.Object({
                  id: t.String(),
                  code: t.String(),
                  name: t.String(),
                  type: t.String(),
                  currency: t.String(),
                })
              ),
            }),
            role: t.String(),
            rights: t.Record(t.String(), t.Boolean()),
          }),
          401: ErrorSchema,
          404: ErrorSchema,
        },
      },
    );