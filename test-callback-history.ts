import { db } from "./backend/src/db";

async function checkCallbackHistory() {
  console.log("=== Проверка истории callback'ов ===\n");

  // Получаем последние callback'и
  const recentCallbacks = await db.callbackHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      transaction: {
        select: {
          id: true,
          status: true,
          amount: true,
          callbackUri: true,
          successUri: true,
          failUri: true,
          traderId: true,
          matchedNotificationId: true
        }
      }
    }
  });

  console.log("Найдено " + recentCallbacks.length + " последних callback'ов:\n");

  for (const cb of recentCallbacks) {
    console.log("Callback ID: " + cb.id);
    console.log("Transaction ID: " + cb.transactionId);
    console.log("URL: " + cb.url);
    console.log("Status Code: " + cb.statusCode);
    console.log("Error: " + (cb.error || 'none'));
    console.log("Created: " + cb.createdAt.toISOString());
    console.log("Transaction Status: " + cb.transaction?.status);
    console.log("Has Matched Notification: " + (cb.transaction?.matchedNotificationId ? 'Yes' : 'No'));
    console.log("Payload:", cb.payload);
    console.log('---');
  }

  // Проверяем транзакции со статусом READY за последние 24 часа
  const readyTransactions = await db.transaction.findMany({
    where: {
      status: 'READY',
      updatedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    select: {
      id: true,
      status: true,
      callbackUri: true,
      successUri: true,
      updatedAt: true,
      matchedNotificationId: true,
      traderId: true
    }
  });

  console.log("\n=== Транзакции со статусом READY за последние 24 часа: " + readyTransactions.length + " ===\n");

  // Проверяем, есть ли у них callback'и
  for (const tx of readyTransactions) {
    const callbacks = await db.callbackHistory.findMany({
      where: {
        transactionId: tx.id
      }
    });

    console.log("Transaction " + tx.id + ":");
    console.log("  Status: " + tx.status);
    console.log("  Has Callback URI: " + (tx.callbackUri ? 'Yes' : 'No'));
    console.log("  Has Success URI: " + (tx.successUri ? 'Yes' : 'No'));
    console.log("  Matched Notification: " + (tx.matchedNotificationId ? 'Yes' : 'No'));
    console.log("  Callbacks sent: " + callbacks.length);
    if (callbacks.length === 0 && (tx.callbackUri || tx.successUri)) {
      console.log("  WARNING: Has URIs but no callbacks sent\!");
    }
    console.log('');
  }
}

checkCallbackHistory()
  .then(() => {
    console.log("\n✅ Проверка завершена");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  });
ENDOFFILE < /dev/null