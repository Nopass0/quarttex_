import { Elysia, t } from 'elysia';
import { BankType, PayoutStatus, Status, TransactionType } from '@prisma/client';
import { wellbitGuard } from '@/middleware/wellbitGuard';
import { db } from '@/db';
import { mapToWellbitStatus, mapFromWellbitStatusToTransaction } from '@/utils/wellbit-status-mapper';
import { mapWellbitBankToOurs } from '@/utils/wellbit-bank-mapper';
import { randomBytes } from 'node:crypto';
import { calculateFreezingParams } from '@/utils/freezing';

/**
 * Wellbit Payment Integration Routes
 * 
 * Implements the Wellbit payment API specification:
 * - /payment/create - Create a new payment
 * - /payment/get - Get payment details  
 * - /payment/status - Update payment status
 */
export default (app: Elysia) =>
  app
    .use(wellbitGuard())
    
    // Create Payment
    .post(
      '/payment/create',
      async ({ body, wellbitMerchant, error }) => {
        try {
          // Map Wellbit bank code to our bank type
          const bankType = await mapWellbitBankToOurs(body.payment_bank);
          
          // Find any active C2C method for the bank
          let method = await db.method.findFirst({
            where: {
              OR: [
                { code: 'sber_c2c' },
                { code: 'tinkoff_c2c' },
                { code: 'TEST_C2C' },
                { code: 'test-rub-method' }
              ],
              isEnabled: true
            }
          });

          if (!method) {
            // Try to find any active method
            method = await db.method.findFirst({
              where: {
                isEnabled: true,
                type: 'c2c'
              }
            });
          }

          if (!method) {
            console.error('No active payment methods found');
            return error(400, { error: 'Payment method not available' });
          }

          console.log('Found method:', method);

          // Check if merchant has access to this method
          const merchantMethod = await db.merchantMethod.findUnique({
            where: {
              merchantId_methodId: {
                merchantId: wellbitMerchant.id,
                methodId: method.id,
              },
            },
          });

          if (!merchantMethod || !merchantMethod.isEnabled) {
            return error(404, { error: 'Method not available for merchant' });
          }

          // Check amount limits
          if (body.payment_amount < method.minPayin || body.payment_amount > method.maxPayin) {
            return error(400, { error: 'Amount out of allowed range' });
          }

          // Find suitable requisites
          const pool = await db.bankDetail.findMany({
            where: {
              isArchived: false,
              methodType: method.type,
              user: { banned: false },
              bankType: bankType,
            },
            orderBy: { updatedAt: 'asc' },
            include: { user: true },
          });

          let chosen = null;
          for (const bd of pool) {
            if (body.payment_amount < bd.minAmount || body.payment_amount > bd.maxAmount) continue;
            if (body.payment_amount < bd.user.minAmountPerRequisite || body.payment_amount > bd.user.maxAmountPerRequisite) continue;
            
            chosen = bd;
            break;
          }

          if (!chosen) {
            console.error('No suitable requisites found for amount:', body.payment_amount, 'bank:', bankType);
            return error(409, { error: 'No suitable payment credentials available' });
          }

          // Get trader merchant settings for fee calculation
          const traderMerchant = await db.traderMerchant.findUnique({
            where: {
              traderId_merchantId_methodId: {
                traderId: chosen.userId,
                merchantId: wellbitMerchant.id,
                methodId: method.id
              }
            }
          });

          // Calculate freezing parameters
          const kkkPercent = 0; // TODO: Get from system config
          const feeInPercent = traderMerchant?.feeIn || 0;
          
          const freezingParams = calculateFreezingParams(
            body.payment_amount,
            body.payment_course,
            kkkPercent,
            feeInPercent
          );

          // Create transaction with freezing parameters and assigned trader
          const transaction = await db.transaction.create({
            data: {
              merchantId: wellbitMerchant.id,
              methodId: method.id,
              orderId: `WELLBIT_${body.payment_id}`,
              amount: body.payment_amount,
              type: TransactionType.IN,
              status: Status.ACTIVE, // Set to ACTIVE since we have requisites
              rate: body.payment_course,
              currency: 'RUB',
              expired_at: new Date(Date.now() + body.payment_lifetime * 1000),
              clientName: `Wellbit Payment ${body.payment_id}`,
              userIp: '127.0.0.1',
              callbackUri: wellbitMerchant.wellbitCallbackUrl || `${process.env.BASE_URL || 'http://localhost:3000'}/api/wellbit/webhook/${body.payment_id}`,
              successUri: `${process.env.BASE_URL || 'http://localhost:3000'}/api/wellbit/success/${body.payment_id}`,
              failUri: `${process.env.BASE_URL || 'http://localhost:3000'}/api/wellbit/fail/${body.payment_id}`,
              // Required fields
              assetOrBank: `${chosen.bankType}: ${chosen.cardNumber}`,
              userId: chosen.userId,
              commission: method.commissionPayin,
              // Trader assignment
              traderId: chosen.userId,
              bankDetailId: chosen.id,
              // Freezing parameters
              adjustedRate: freezingParams.adjustedRate,
              frozenUsdtAmount: freezingParams.frozenUsdtAmount,
              calculatedCommission: freezingParams.calculatedCommission,
              feeInPercent: feeInPercent,
              kkkPercent: kkkPercent,
            },
          });

          // Freeze trader's balance
          await db.user.update({
            where: { id: chosen.userId },
            data: {
              frozenUsdt: {
                increment: freezingParams.totalRequired
              }
            }
          });

          console.log('Created transaction with requisites:', {
            transactionId: transaction.id,
            traderId: chosen.userId,
            cardNumber: chosen.cardNumber,
            frozenAmount: freezingParams.totalRequired
          });

          // Return response with payment credentials
          return {
            ...body,
            payment_bank: body.payment_bank || bankType, // Keep original Wellbit bank code
            payment_credential: chosen.cardNumber, // Return card number
            payment_status: 'new',
          };
        } catch (err) {
          console.error('Failed to create payment:', err);
          console.error('Full error details:', JSON.stringify(err, null, 2));
          if (err instanceof Error) {
            console.error('Error message:', err.message);
            console.error('Error stack:', err.stack);
          }
          return error(500, { error: 'Failed to create payment' });
        }
      },
      {
        body: t.Object({
          payment_id: t.Number(),
          payment_amount: t.Number(),
          payment_amount_usdt: t.Number(),
          payment_amount_profit: t.Number(),
          payment_amount_profit_usdt: t.Number(),
          payment_fee_percent_profit: t.Number(),
          payment_type: t.String(),
          payment_bank: t.Union([t.String(), t.Null()]),
          payment_course: t.Number(),
          payment_lifetime: t.Number(),
          payment_status: t.String(),
        }),
      }
    )
    
    // Get Payment
    .post(
      '/payment/get',
      async ({ body, wellbitMerchant, error }) => {
        try {
          // Find transaction by order ID
          const transaction = await db.transaction.findFirst({
            where: {
              merchantId: wellbitMerchant.id,
              orderId: `WELLBIT_${body.payment_id}`,
            },
          });

          if (!transaction) {
            return error(404, { error: 'Payment not found' });
          }

          return {
            payment_id: body.payment_id,
            payment_status: mapToWellbitStatus(transaction.status),
          };
        } catch (err) {
          console.error('Failed to get payment:', err);
          return error(500, { error: 'Failed to get payment' });
        }
      },
      {
        body: t.Object({
          payment_id: t.Number(),
        }),
      }
    )
    
    // Update Payment Status
    .post(
      '/payment/status',
      async ({ body, wellbitMerchant, error }) => {
        try {
          // Find transaction by order ID
          const transaction = await db.transaction.findFirst({
            where: {
              merchantId: wellbitMerchant.id,
              orderId: `WELLBIT_${body.payment_id}`,
            },
          });

          if (!transaction) {
            return error(404, { error: 'Payment not found' });
          }

          // Map Wellbit status to internal status
          const internalStatus = mapFromWellbitStatusToTransaction(body.payment_status);

          // Update transaction status
          await db.transaction.update({
            where: { id: transaction.id },
            data: { status: internalStatus },
          });

          // Send webhook to Wellbit about status change
          if (transaction.callbackUri) {
            try {
              const webhookData = {
                payment_id: body.payment_id,
                payment_status: body.payment_status,
                updated_at: new Date().toISOString()
              };
              
              await fetch(transaction.callbackUri, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookData),
              });
            } catch (webhookError) {
              console.error('Failed to send webhook:', webhookError);
              // Don't fail the request if webhook fails
            }
          }

          return {
            payment_id: body.payment_id,
            payment_status: body.payment_status,
          };
        } catch (err) {
          console.error('Failed to update payment status:', err);
          return error(500, { error: 'Failed to update payment status' });
        }
      },
      {
        body: t.Object({
          payment_id: t.Number(),
          payment_status: t.String(),
        }),
      }
    );