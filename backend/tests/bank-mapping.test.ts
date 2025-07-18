import { Elysia } from 'elysia';
import { describe, it, beforeAll, afterAll, expect } from 'bun:test';
import { db } from '@/db';
import wellbitRoutes from '@/routes/wellbit';
import { createHmac } from 'node:crypto';

let publicKey: string;
let privateKey: string;
let app: Elysia;

const sign = (body: any) =>
  createHmac('sha256', privateKey).update(JSON.stringify(body)).digest('hex');

const banks = [
  'CITIBANK',
  'UNICREDIT',
  'SOVCOMBANK',
  'ROSBANK',
  'RUSSIANSTANDARD',
  'OTKRITIE'
];

describe('Wellbit bank mapping', () => {
  beforeAll(async () => {
    publicKey = 'pub-' + Date.now();
    privateKey = 'priv-' + Date.now();
    await db.merchant.create({
      data: {
        name: 'Map Test',
        token: 'tok-' + Date.now(),
        apiKeyPublic: publicKey,
        apiKeyPrivate: privateKey,
      },
    });
    app = new Elysia().use(wellbitRoutes);
  });

  afterAll(async () => {
    await db.payout.deleteMany({ where: { merchant: { apiKeyPublic: publicKey } } });
    await db.merchant.deleteMany({ where: { apiKeyPublic: publicKey } });
  });

  for (const code of banks) {
    it(`maps ${code}`, async () => {
      const body = { amount: 100, wallet: '1', bank: code, isCard: true };
      const res = await app.handle(
        new Request('http://localhost/payment/create', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': publicKey,
            'x-api-token': sign(body),
          },
          body: JSON.stringify(body),
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      const payout = await db.payout.findUnique({ where: { id: data.id } });
      expect(payout?.bank).toBe(code);
    });
  }
});
