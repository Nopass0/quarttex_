import { Elysia, t } from 'elysia';
import { db } from '@/db';
import { randomBytes } from 'node:crypto';

export const adminMerchantsRoutes = new Elysia({ prefix: '/merchants' })
  .get(
    '/wellbit/keys',
    async ({ error }) => {
      const merchant = await db.merchant.findFirst({ where: { name: 'Wellbit' } });
      if (!merchant) return error(404, { error: 'Wellbit merchant not found' });
      return {
        apiKeyPublic: merchant.apiKeyPublic,
        apiKeyPrivate: merchant.apiKeyPrivate,
      };
    },
    {
      tags: ['admin'],
      detail: { summary: 'Get Wellbit API keys' },
      headers: t.Object({ 'x-admin-key': t.String() }),
      response: {
        200: t.Object({
          apiKeyPublic: t.Nullable(t.String()),
          apiKeyPrivate: t.Nullable(t.String()),
        }),
        404: t.Object({ error: t.String() }),
      },
    }
  )
  .post(
    '/wellbit/regenerate',
    async () => {
      const apiKeyPublic = randomBytes(16).toString('hex');
      const apiKeyPrivate = randomBytes(32).toString('hex');
      const merchant = await db.merchant.upsert({
        where: { name: 'Wellbit' },
        update: { apiKeyPublic, apiKeyPrivate },
        create: {
          name: 'Wellbit',
          token: randomBytes(32).toString('hex'),
          apiKeyPublic,
          apiKeyPrivate,
        },
      });
      return {
        apiKeyPublic: merchant.apiKeyPublic,
        apiKeyPrivate: merchant.apiKeyPrivate,
      };
    },
    {
      tags: ['admin'],
      detail: { summary: 'Regenerate Wellbit API keys' },
      headers: t.Object({ 'x-admin-key': t.String() }),
      response: {
        200: t.Object({
          apiKeyPublic: t.String(),
          apiKeyPrivate: t.String(),
        }),
      },
    }
  );

export default adminMerchantsRoutes;

