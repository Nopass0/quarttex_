import { Elysia } from 'elysia';
import { expect, it, beforeAll, afterAll, describe } from 'bun:test';
import { db } from '@/db';
import wellbitRoutes from '@/routes/wellbit';
import { createHmac } from 'node:crypto';

let publicKey: string;
let privateKey: string;
let payoutId: string;
let app: Elysia;

const sign = (body: any) =>
  createHmac('sha256', privateKey).update(JSON.stringify(body)).digest('hex');

describe('Wellbit routes', () => {
  beforeAll(async () => {
    publicKey = 'pub-' + Date.now();
    privateKey = 'priv-' + Date.now();
    await db.merchant.create({
      data: {
        name: 'Wellbit Test',
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

  it('creates payment with valid signature', async () => {
    const body = { amount: 100, wallet: '123', bank: 'SBERBANK', isCard: true };
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
    expect(data).toHaveProperty('id');
    payoutId = data.id;
  });

  it('rejects invalid signature', async () => {
    const body = { amount: 100, wallet: '123', bank: 'SBERBANK', isCard: true };
    const res = await app.handle(
      new Request('http://localhost/payment/create', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': publicKey,
          'x-api-token': 'bad',
        },
        body: JSON.stringify(body),
      })
    );
    expect(res.status).toBe(401);
  });

  it('gets payment', async () => {
    const body = { id: payoutId };
    const res = await app.handle(
      new Request('http://localhost/payment/get', {
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
  });

  it('checks payment status', async () => {
    const body = { id: payoutId };
    const res = await app.handle(
      new Request('http://localhost/payment/status', {
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
  });
});
