import { db } from "@/db";

async function checkNotificationProcessing() {
  console.log("=== Checking notification processing ===\n");

  // Проверяем последние обработанные уведомления
  const processedNotifications = await db.notification.findMany({
    where: {
      isProcessed: true,
      type: "AppNotification"
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: {
      Device: {
        include: {
          user: true,
          bankDetails: true
        }
      }
    }
  });

  console.log(`Found ${processedNotifications.length} processed notifications:\n`);

  for (const notification of processedNotifications) {
    console.log(`Notification ${notification.id}:`);
    console.log(`- Message: "${notification.message}"`);
    console.log(`- Device: ${notification.Device?.name} (${notification.deviceId})`);
    console.log(`- Processed at: ${notification.updatedAt}`);
    
    const metadata = notification.metadata as any;
    console.log(`- Process reason: ${metadata?.processedReason || 'SUCCESS'}`);
    
    if (metadata?.processedReason) {
      console.log(`  ⚠️ Processing failed: ${metadata.processedReason}`);
      
      if (metadata.processedReason === 'NO_MATCHING_TXN') {
        // Проверяем, какие транзакции есть для этого устройства
        const deviceTransactions = await db.transaction.findMany({
          where: {
            requisites: {
              deviceId: notification.deviceId
            },
            status: "IN_PROGRESS",
            type: "IN"
          },
          select: {
            id: true,
            amount: true,
            createdAt: true,
            traderId: true
          }
        });
        
        console.log(`  Found ${deviceTransactions.length} IN_PROGRESS transactions for this device`);
        deviceTransactions.forEach(tx => {
          console.log(`  - Amount: ${tx.amount}, Created: ${tx.createdAt}, Trader: ${tx.traderId}`);
        });
      }
    } else {
      // Найдем транзакцию, которая была обработана
      const matchedTransaction = await db.transaction.findFirst({
        where: {
          status: "READY",
          updatedAt: {
            gte: new Date(notification.updatedAt.getTime() - 10000), // В пределах 10 секунд
            lte: new Date(notification.updatedAt.getTime() + 10000)
          }
        },
        include: {
          trader: true
        }
      });
      
      if (matchedTransaction) {
        console.log(`  ✅ Matched with transaction ${matchedTransaction.id}`);
        console.log(`  - Amount: ${matchedTransaction.amount} RUB`);
        console.log(`  - Profit: ${matchedTransaction.traderProfit || 0} USDT`);
      }
    }
    
    console.log("");
  }

  // Проверяем необработанные уведомления
  const unprocessedCount = await db.notification.count({
    where: {
      isProcessed: false,
      type: "AppNotification"
    }
  });

  console.log(`\nUnprocessed notifications: ${unprocessedCount}`);

  // Проверяем активные транзакции
  const activeTransactions = await db.transaction.count({
    where: {
      status: "IN_PROGRESS",
      type: "IN"
    }
  });

  console.log(`Active IN_PROGRESS transactions: ${activeTransactions}`);

  // Проверяем настройки сервиса
  const serviceConfig = await db.serviceConfig.findUnique({
    where: { serviceKey: "notification_auto_processor" }
  });

  if (serviceConfig) {
    const config = serviceConfig.config as any;
    console.log("\nService configuration:");
    console.log(`- Enabled: ${serviceConfig.isEnabled}`);
    console.log(`- Amount tolerance: ±${config.amountTolerance} RUB`);
    console.log(`- Time window: ${Math.abs(config.minTimeDiffMs)/1000}s before to ${config.maxTimeDiffMs/1000}s after`);
  }
}

checkNotificationProcessing()
  .then(() => {
    console.log("\n✅ Check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });