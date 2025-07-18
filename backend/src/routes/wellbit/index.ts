import { Elysia, t } from 'elysia';
import { BankType } from '@prisma/client';
import { wellbitGuard } from '@/middleware/wellbitGuard';
import { PayoutService } from '@/services/payout.service';
import { db } from '@/db';

const payoutService = PayoutService.getInstance();

const mapBank = (name: string): BankType => {
  const key = name.toUpperCase().replace(/\s+/g, '');
  return (BankType as any)[key] ?? BankType.SBERBANK;
};

export default (app: Elysia) =>
  app
    .use(wellbitGuard())
    .post(
      '/payment/create',
      async ({ body, wellbitMerchant }) => {
        const payout = await payoutService.createPayout({
          merchantId: wellbitMerchant.id,
          amount: body.amount,
          wallet: body.wallet,
          bank: mapBank(body.bank),
          isCard: body.isCard,
          merchantRate: body.merchantRate,
          externalReference: body.externalReference,
          webhookUrl: body.webhookUrl,
          metadata: body.metadata,
        });
        return { id: payout.id, status: payout.status };
      },
      {
        body: t.Object({
          amount: t.Number(),
          wallet: t.String(),
          bank: t.String(),
          isCard: t.Boolean(),
          merchantRate: t.Optional(t.Number()),
          externalReference: t.Optional(t.String()),
          webhookUrl: t.Optional(t.String()),
          metadata: t.Optional(t.Any()),
        }),
      }
    )
    .get(
      '/payment/get',
      async ({ query, wellbitMerchant, error }) => {
        const payout = await db.payout.findUnique({ where: { id: String(query.id) } });
        if (!payout || payout.merchantId !== wellbitMerchant.id) {
          return error(404, { error: 'Payment not found' });
        }
        return { payout };
      },
      {
        query: t.Object({ id: t.String() }),
      }
    )
    .get(
      '/payment/status',
      async ({ query, wellbitMerchant, error }) => {
        const payout = await db.payout.findUnique({ where: { id: String(query.id) } });
        if (!payout || payout.merchantId !== wellbitMerchant.id) {
          return error(404, { error: 'Payment not found' });
        }
        return { status: payout.status };
      },
      { query: t.Object({ id: t.String() }) }
    );
