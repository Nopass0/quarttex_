// src/middleware/merchantGuard.ts
import { Elysia, t } from 'elysia';
import { db } from '@/db';

/**
 * merchantGuard — защита «продавец-эндпоинтов».
 *
 * Ошибки:
 *  • 401 Invalid merchant key — нет/неверный `x-merchant-api-key`.
 *
 * Использование:
 *   app.use(merchantGuard())                 // глобально
 *   app.use('/merchant', merchantGuard())    // для группы /merchant
 */
export const merchantGuard =
  () => (app: Elysia) =>
    app
      /* 1. Схема заголовка + базовая проверка */
      .guard({
        headers: t.Object({
          'x-merchant-api-key': t.Optional(t.String({
            description: 'API-ключ мерчанта',
          })),
          authorization: t.Optional(t.String()),
        }),
        async beforeHandle({ headers, error, request }) {
          const authHeader = headers.authorization;

          // Если есть Bearer токен сессии, пропускаем проверку API-ключа
          if (authHeader && authHeader.startsWith('Bearer ')) {
            return; // merchantSessionGuard выполнит проверку
          }

          const token = headers['x-merchant-api-key'];

          if (!token) {
            console.log('[merchantGuard] Missing x-merchant-api-key header for:', request.url);
            return error(401, { error: 'Missing x-merchant-api-key header' });
          }

          // быстрая валидация: есть ли мерчант с таким токеном или API ключом
          const exists = await db.merchant.findFirst({
            where: {
              OR: [
                { token },
                { apiKeyPublic: token }
              ]
            },
            select: { id: true },          // только факт существования
          });
          if (!exists)
            return error(401, { error: 'Invalid merchant key' });

          /* ничего не возвращаем → основной handler выполняется */
        },
      })

      /* 2. Добавляем мерчанта в контекст */
      .derive(async ({ headers, error, request }) => {
        const authHeader = headers.authorization;

        // Если используется сессионный токен, merchantSessionGuard добавит мерчанта
        if (authHeader && authHeader.startsWith('Bearer ')) {
          return;
        }

        const token = headers['x-merchant-api-key'];
        console.log('[merchantGuard] Request to:', request.url, 'with token:', token ? 'provided' : 'missing');

        if (!token) {
          return error(401, { error: 'Missing x-merchant-api-key header' });
        }

        const merchant = await db.merchant.findFirst({
          where: {
            OR: [
              { token },
              { apiKeyPublic: token }
            ]
          },
        });
        if (!merchant)
          return error(401, { error: 'Invalid merchant key' });

        /* теперь в handlers доступно { merchant } */
        return { merchant };
      });
