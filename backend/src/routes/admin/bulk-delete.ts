import { Elysia, t } from "elysia";
import { db } from "@/db";

export default new Elysia()
  
  /* ───────────────── Get deletion statistics ───────────────── */
  .get("/stats", async () => {
    const [
      totalTransactions,
      totalPayouts,
      totalDeals,
      merchants,
      transactionStatuses,
      payoutStatuses,
      dealStatuses
    ] = await Promise.all([
      db.transaction.count(),
      db.payout.count(),
      db.dispute.count({ where: { type: "DEAL" } }),
      db.merchant.findMany({ select: { id: true, name: true } }),
      db.transaction.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      db.payout.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      db.dispute.groupBy({
        by: ['status'],
        where: { type: "DEAL" },
        _count: { status: true }
      })
    ]);

    return {
      totals: {
        transactions: totalTransactions,
        payouts: totalPayouts,
        deals: totalDeals
      },
      merchants: merchants.map(m => ({ id: m.id, name: m.name })),
      statuses: {
        transactions: transactionStatuses.map(s => ({
          status: s.status,
          count: s._count.status
        })),
        payouts: payoutStatuses.map(s => ({
          status: s.status,
          count: s._count.status
        })),
        deals: dealStatuses.map(s => ({
          status: s.status,
          count: s._count.status
        }))
      }
    };
  })
  
  /* ───────────────── Delete transactions ───────────────── */
  .delete("/transactions", async ({ body }) => {
    const { status, merchantId, deleteAll } = body;
    
    let whereClause: any = {};
    
    if (!deleteAll) {
      if (status) whereClause.status = status;
      if (merchantId) whereClause.merchantId = merchantId;
    }
    
    const count = await db.transaction.count({ where: whereClause });
    
    if (count === 0) {
      return { deleted: 0, message: "Нет транзакций для удаления" };
    }
    
    // Delete related records first
    const transactionIds = await db.transaction.findMany({
      where: whereClause,
      select: { id: true }
    }).then(txs => txs.map(tx => tx.id));
    
    // Delete notifications related to these transactions
    await db.notification.deleteMany({
      where: { transactionId: { in: transactionIds } }
    });
    
    // Delete callbacks
    await db.transactionCallback.deleteMany({
      where: { transactionId: { in: transactionIds } }
    });
    
    // Delete disputes
    await db.dispute.deleteMany({
      where: { transactionId: { in: transactionIds } }
    });
    
    // Delete the transactions
    const result = await db.transaction.deleteMany({ where: whereClause });
    
    return { 
      deleted: result.count, 
      message: `Удалено ${result.count} транзакций` 
    };
  }, {
    body: t.Object({
      status: t.Optional(t.String()),
      merchantId: t.Optional(t.String()),
      deleteAll: t.Boolean({ default: false })
    })
  })
  
  /* ───────────────── Delete payouts ───────────────── */
  .delete("/payouts", async ({ body }) => {
    const { status, deleteAll } = body;
    
    let whereClause: any = {};
    
    if (!deleteAll) {
      if (status) whereClause.status = status;
    }
    
    const count = await db.payout.count({ where: whereClause });
    
    if (count === 0) {
      return { deleted: 0, message: "Нет выплат для удаления" };
    }
    
    // Delete related records
    const payoutIds = await db.payout.findMany({
      where: whereClause,
      select: { id: true }
    }).then(payouts => payouts.map(p => p.id));
    
    // Delete disputes related to payouts
    await db.dispute.deleteMany({
      where: { payoutId: { in: payoutIds } }
    });
    
    // Delete the payouts
    const result = await db.payout.deleteMany({ where: whereClause });
    
    return { 
      deleted: result.count, 
      message: `Удалено ${result.count} выплат` 
    };
  }, {
    body: t.Object({
      status: t.Optional(t.String()),
      deleteAll: t.Boolean({ default: false })
    })
  })
  
  /* ───────────────── Delete deals (disputes) ───────────────── */
  .delete("/deals", async ({ body }) => {
    const { status, deleteAll } = body;
    
    let whereClause: any = { type: "DEAL" };
    
    if (!deleteAll) {
      if (status) whereClause.status = status;
    }
    
    const count = await db.dispute.count({ where: whereClause });
    
    if (count === 0) {
      return { deleted: 0, message: "Нет сделок для удаления" };
    }
    
    // Delete dispute messages first
    const disputeIds = await db.dispute.findMany({
      where: whereClause,
      select: { id: true }
    }).then(disputes => disputes.map(d => d.id));
    
    await db.disputeMessage.deleteMany({
      where: { disputeId: { in: disputeIds } }
    });
    
    // Delete the disputes
    const result = await db.dispute.deleteMany({ where: whereClause });
    
    return { 
      deleted: result.count, 
      message: `Удалено ${result.count} сделок` 
    };
  }, {
    body: t.Object({
      status: t.Optional(t.String()),
      deleteAll: t.Boolean({ default: false })
    })
  })
  
  /* ───────────────── Delete everything ───────────────── */
  .delete("/all", async () => {
    // Delete in correct order to respect foreign key constraints
    const deletedCounts = {
      disputeMessages: await db.disputeMessage.deleteMany(),
      disputes: await db.dispute.deleteMany(),
      notifications: await db.notification.deleteMany(),
      callbacks: await db.transactionCallback.deleteMany(),
      transactions: await db.transaction.deleteMany(),
      payouts: await db.payout.deleteMany()
    };
    
    return {
      deleted: {
        transactions: deletedCounts.transactions.count,
        payouts: deletedCounts.payouts.count,
        disputes: deletedCounts.disputes.count,
        notifications: deletedCounts.notifications.count,
        callbacks: deletedCounts.callbacks.count,
        disputeMessages: deletedCounts.disputeMessages.count
      },
      message: "Все данные удалены"
    };
  });