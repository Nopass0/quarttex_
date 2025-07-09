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
          'x-merchant-api-key': t.String({
            description: 'API-ключ мерчанта',
          }),
        }),
        async beforeHandle({ headers, error, request }) {
          const token = headers['x-merchant-api-key'];
          
          if (!token) {
            console.log('[merchantGuard] Missing x-merchant-api-key header for:', request.url);
            return error(401, { error: 'Missing x-merchant-api-key header' });
          }
          
          // быстрая валидация: есть ли мерчант с таким токеном
          const exists = await db.merchant.findFirst({
            where: { token },
            select: { id: true },          // только факт существования
          });
          if (!exists)
            return error(401, { error: 'Invalid merchant key' });

          /* ничего не возвращаем → основной handler выполняется */
        },
      })

      /* 2. Добавляем мерчанта в контекст */
      .derive(async ({ headers, error, request }) => {
        const token = headers['x-merchant-api-key'];
        console.log('[merchantGuard] Request to:', request.url, 'with token:', token ? 'provided' : 'missing');
        
        if (!token) {
          return error(401, { error: 'Missing x-merchant-api-key header' });
        }
        
        const merchant = await db.merchant.findUnique({
          where: { token },
        });
        if (!merchant)
          return error(401, { error: 'Invalid merchant key' });

        /* теперь в handlers доступно { merchant } */
        return { merchant };
      });
