import { Elysia, t } from 'elysia';
import { db } from '@/db';
import { createHmac } from 'node:crypto';
import type { Merchant as MerchantModel } from '@prisma/client';

// Extend Elysia context
declare module 'elysia' {
  interface Context {
    wellbitMerchant: MerchantModel;
  }
}

export const wellbitGuard = () => (app: Elysia) =>
  app
    .guard({
      headers: t.Object({
        'x-api-key': t.String(),
        'x-api-token': t.String(),
      }),
      async beforeHandle({ headers, request, error }) {
        const apiKey = headers['x-api-key'];
        const token = headers['x-api-token'];
        const merchant = await db.merchant.findFirst({ where: { apiKeyPublic: apiKey } });
        if (!merchant) return error(401, { error: 'Invalid API key' });

        const bodyText = await request.clone().text();
        const expected = createHmac('sha256', merchant.apiKeyPrivate || '')
          .update(bodyText)
          .digest('hex');
        if (expected !== token) return error(401, { error: 'Invalid signature' });
      },
    })
    .derive(async ({ headers }) => {
      const merchant = await db.merchant.findFirst({ where: { apiKeyPublic: headers['x-api-key'] } });
      if (!merchant) throw new Error('Merchant not found');
      return { wellbitMerchant: merchant };
    });
