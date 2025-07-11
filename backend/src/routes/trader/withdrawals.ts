import { Elysia, t } from "elysia";
import { db } from "@/db";
import { authPlugin } from "@/plugins/auth";
import { WithdrawalBalanceType, WithdrawalStatus } from "@prisma/client";

export const traderWithdrawalsRoutes = new Elysia({ prefix: "/withdrawals" })
  .use(authPlugin({ variant: "trader" }))
  .get("/", async ({ trader }) => {
    const withdrawals = await db.withdrawalRequest.findMany({
      where: { traderId: trader.id },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return {
      success: true,
      data: withdrawals
    };
  })
  .get("/settings", async ({ trader }) => {
    const [
      minAmount,
      feePercent,
      feeFixed,
      processingHours
    ] = await Promise.all([
      db.systemConfig.findUnique({ where: { key: "min_withdrawal_amount" } }),
      db.systemConfig.findUnique({ where: { key: "withdrawal_fee_percent" } }),
      db.systemConfig.findUnique({ where: { key: "withdrawal_fee_fixed" } }),
      db.systemConfig.findUnique({ where: { key: "withdrawal_processing_time_hours" } })
    ]);

    return {
      success: true,
      data: {
        minAmount: parseFloat(minAmount?.value || "50"),
        feePercent: parseFloat(feePercent?.value || "2"),
        feeFixed: parseFloat(feeFixed?.value || "5"),
        processingHours: parseInt(processingHours?.value || "24")
      }
    };
  })
  .get("/balances", async ({ trader }) => {
    const user = await db.user.findUnique({
      where: { id: trader.id },
      select: {
        trustBalance: true,
        payoutBalance: true,
        profitFromDeals: true,
        profitFromPayouts: true,
        // Referral balance would be calculated from referral system
      }
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      success: true,
      data: {
        [WithdrawalBalanceType.TRUST]: user.trustBalance,
        [WithdrawalBalanceType.COMPENSATION]: user.payoutBalance,
        [WithdrawalBalanceType.PROFIT_DEALS]: user.profitFromDeals,
        [WithdrawalBalanceType.PROFIT_PAYOUTS]: user.profitFromPayouts,
        [WithdrawalBalanceType.REFERRAL]: 0 // TODO: Implement referral balance
      }
    };
  })
  .post("/", async ({ trader, body, set }) => {
    const { amountUSDT, balanceType, walletAddress } = body;

    // Get settings
    const [minAmountSetting, feePercentSetting, feeFixedSetting] = await Promise.all([
      db.systemConfig.findUnique({ where: { key: "min_withdrawal_amount" } }),
      db.systemConfig.findUnique({ where: { key: "withdrawal_fee_percent" } }),
      db.systemConfig.findUnique({ where: { key: "withdrawal_fee_fixed" } })
    ]);

    const minAmount = parseFloat(minAmountSetting?.value || "50");
    const feePercent = parseFloat(feePercentSetting?.value || "2");
    const feeFixed = parseFloat(feeFixedSetting?.value || "5");

    // Validate amount
    if (amountUSDT < minAmount) {
      set.status = 400;
      return {
        success: false,
        error: `Минимальная сумма вывода: ${minAmount} USDT`
      };
    }

    // Calculate fees
    const totalFee = (amountUSDT * feePercent / 100) + feeFixed;
    const amountAfterFees = amountUSDT - totalFee;

    // Check balance
    const user = await db.user.findUnique({
      where: { id: trader.id }
    });

    if (!user) {
      throw new Error("User not found");
    }

    let availableBalance = 0;
    let balanceField = "";

    switch (balanceType) {
      case WithdrawalBalanceType.TRUST:
        availableBalance = user.trustBalance;
        balanceField = "trustBalance";
        break;
      case WithdrawalBalanceType.COMPENSATION:
        availableBalance = user.payoutBalance;
        balanceField = "payoutBalance";
        break;
      case WithdrawalBalanceType.PROFIT_DEALS:
        availableBalance = user.profitFromDeals;
        balanceField = "profitFromDeals";
        break;
      case WithdrawalBalanceType.PROFIT_PAYOUTS:
        availableBalance = user.profitFromPayouts;
        balanceField = "profitFromPayouts";
        break;
      case WithdrawalBalanceType.REFERRAL:
        availableBalance = 0; // TODO: Implement referral balance
        break;
    }

    if (availableBalance < amountUSDT) {
      set.status = 400;
      return {
        success: false,
        error: "Недостаточно средств на балансе"
      };
    }

    // Check for pending withdrawals
    const pendingCount = await db.withdrawalRequest.count({
      where: {
        traderId: trader.id,
        status: {
          in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING]
        }
      }
    });

    if (pendingCount >= 3) {
      set.status = 400;
      return {
        success: false,
        error: "У вас есть незавершенные заявки на вывод. Дождитесь их обработки"
      };
    }

    // Create withdrawal request and update balance in transaction
    const result = await db.$transaction(async (tx) => {
      // Create withdrawal request
      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          traderId: trader.id,
          amountUSDT,
          balanceType,
          walletAddress,
          status: WithdrawalStatus.PENDING
        }
      });

      // Deduct from balance (block the funds)
      if (balanceField && balanceField !== "referralBalance") {
        await tx.user.update({
          where: { id: trader.id },
          data: {
            [balanceField]: {
              decrement: amountUSDT
            }
          }
        });
      }

      // Create admin log
      await tx.adminLog.create({
        data: {
          adminId: "system",
          action: "WITHDRAWAL_REQUEST_CREATED",
          details: `Withdrawal request ${withdrawal.id} created for ${amountUSDT} USDT from ${balanceType}`,
          ip: "system"
        }
      });

      return withdrawal;
    });

    return {
      success: true,
      data: {
        id: result.id,
        amountUSDT: result.amountUSDT,
        balanceType: result.balanceType,
        walletAddress: result.walletAddress,
        status: result.status,
        fee: totalFee,
        amountAfterFees,
        createdAt: result.createdAt
      }
    };
  }, {
    body: t.Object({
      amountUSDT: t.Number({ minimum: 1 }),
      balanceType: t.Enum(WithdrawalBalanceType),
      walletAddress: t.String({ minLength: 20 })
    })
  })
  .post("/:id/cancel", async ({ trader, params, set }) => {
    const withdrawal = await db.withdrawalRequest.findUnique({
      where: { id: params.id }
    });

    if (!withdrawal) {
      set.status = 404;
      return {
        success: false,
        error: "Заявка не найдена"
      };
    }

    if (withdrawal.traderId !== trader.id) {
      set.status = 403;
      return {
        success: false,
        error: "Доступ запрещен"
      };
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      set.status = 400;
      return {
        success: false,
        error: "Заявку можно отменить только в статусе 'Ожидание'"
      };
    }

    // Cancel withdrawal and refund balance
    await db.$transaction(async (tx) => {
      // Update withdrawal status
      await tx.withdrawalRequest.update({
        where: { id: params.id },
        data: {
          status: WithdrawalStatus.REJECTED,
          rejectionReason: "Отменено пользователем",
          processedAt: new Date()
        }
      });

      // Refund balance
      let balanceField = "";
      switch (withdrawal.balanceType) {
        case WithdrawalBalanceType.TRUST:
          balanceField = "trustBalance";
          break;
        case WithdrawalBalanceType.COMPENSATION:
          balanceField = "payoutBalance";
          break;
        case WithdrawalBalanceType.PROFIT_DEALS:
          balanceField = "profitFromDeals";
          break;
        case WithdrawalBalanceType.PROFIT_PAYOUTS:
          balanceField = "profitFromPayouts";
          break;
      }

      if (balanceField) {
        await tx.user.update({
          where: { id: trader.id },
          data: {
            [balanceField]: {
              increment: withdrawal.amountUSDT
            }
          }
        });
      }

      // Create admin log
      await tx.adminLog.create({
        data: {
          adminId: "user",
          action: "WITHDRAWAL_CANCELLED",
          details: `Withdrawal ${withdrawal.id} cancelled by user`,
          ip: "user"
        }
      });
    });

    return {
      success: true,
      message: "Заявка успешно отменена"
    };
  });