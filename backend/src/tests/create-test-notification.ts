import { db } from "@/db";
import { NotificationType, Status, TransactionType } from "@prisma/client";

async function createTestNotification() {
  console.log("=== Creating test notification for transaction matching ===\n");

  // 1. Найти активную IN_PROGRESS транзакцию с устройством
  const transaction = await db.transaction.findFirst({
    where: {
      status: Status.IN_PROGRESS,
      type: TransactionType.IN,
      traderId: { not: null },
      requisites: {
        deviceId: { not: null }
      }
    },
    orderBy: { createdAt: "desc" },
    include: {
      trader: true,
      requisites: {
        include: {
          device: true,
          user: true
        }
      },
      merchant: true,
      method: true
    }
  });

  if (!transaction) {
    console.log("No active IN_PROGRESS transactions with devices found.");
    
    // Попробуем найти любую IN_PROGRESS транзакцию
    const anyTransaction = await db.transaction.findFirst({
      where: {
        status: Status.IN_PROGRESS,
        type: TransactionType.IN,
        traderId: { not: null }
      },
      orderBy: { createdAt: "desc" },
      include: {
        trader: true,
        requisites: true,
        merchant: true,
        method: true
      }
    });

    if (anyTransaction) {
      console.log("\nFound IN_PROGRESS transaction without device:");
      console.log(`- ID: ${anyTransaction.id}`);
      console.log(`- Amount: ${anyTransaction.amount} RUB`);
      console.log(`- Card: ${anyTransaction.requisites?.cardNumber || anyTransaction.assetOrBank}`);
      console.log(`- Trader: ${anyTransaction.trader?.name}`);
      console.log("\nThis transaction doesn't have a device, so notification matching won't work.");
    } else {
      console.log("No IN_PROGRESS transactions found at all.");
    }
    
    return;
  }

  console.log("Found active transaction:");
  console.log(`- Transaction ID: ${transaction.id}`);
  console.log(`- Numeric ID: ${transaction.numericId}`);
  console.log(`- Amount: ${transaction.amount} RUB`);
  console.log(`- Status: ${transaction.status}`);
  console.log(`- Created: ${transaction.createdAt}`);
  
  console.log("\nRequisites info:");
  console.log(`- Card: ${transaction.requisites?.cardNumber}`);
  console.log(`- Bank: ${transaction.requisites?.bankType}`);
  console.log(`- Recipient: ${transaction.requisites?.recipientName}`);
  
  console.log("\nDevice info:");
  console.log(`- Device ID: ${transaction.requisites?.device?.id}`);
  console.log(`- Device Name: ${transaction.requisites?.device?.name}`);
  console.log(`- Is Online: ${transaction.requisites?.device?.isOnline}`);

  if (!transaction.requisites?.device) {
    console.log("\n⚠️ Transaction has requisites but no device!");
    return;
  }

  // 2. Генерируем текст уведомления в зависимости от банка
  let notificationText = "";
  const amount = transaction.amount.toLocaleString('ru-RU');
  const cardLast4 = transaction.requisites.cardNumber.slice(-4);
  
  switch (transaction.requisites.bankType) {
    case "SBERBANK":
      // Формат Сбербанка - должен соответствовать паттерну парсера
      // Используем формат: "СБЕРБАНК. Перевод 15000р от ИВАН И. Баланс: 25000р"
      const balance = Math.floor(Math.random() * 50000 + 10000);
      notificationText = `СБЕРБАНК. Перевод ${amount}р от ИВАН И. Баланс: ${balance.toLocaleString('ru-RU')}р`;
      break;
      
    case "TBANK":
    case "TINKOFF":
      // Формат Тинькофф
      notificationText = `Пополнение. Счет RUB. ${amount} ₽. ${transaction.requisites.recipientName}. Доступно ${(Math.random() * 100000).toFixed(2)} ₽`;
      break;
      
    case "VTB":
      // Формат ВТБ
      notificationText = `ВТБ: Зачисление ${amount} RUB. Карта *${cardLast4}. Доступно: ${(Math.random() * 100000).toFixed(2)} RUB`;
      break;
      
    case "ALFABANK":
      // Формат Альфа-Банка
      notificationText = `Альфа-Банк: +${amount} ₽ от ИВАН ИВАНОВ на *${cardLast4}`;
      break;
      
    default:
      // Общий формат
      notificationText = `${transaction.requisites.bankType}: Поступление ${amount} руб. на карту *${cardLast4}`;
  }

  console.log("\nGenerated notification text:");
  console.log(`"${notificationText}"`);

  // 3. Создаем уведомление
  const notification = await db.notification.create({
    data: {
      type: NotificationType.AppNotification,
      message: notificationText,
      deviceId: transaction.requisites.device.id,
      isProcessed: false,
      metadata: {
        packageName: getPackageNameForBank(transaction.requisites.bankType),
        timestamp: new Date().toISOString(),
        testNotification: true,
        transactionId: transaction.id,
        amount: transaction.amount
      }
    }
  });

  console.log("\n✅ Test notification created:");
  console.log(`- Notification ID: ${notification.id}`);
  console.log(`- Device ID: ${notification.deviceId}`);
  console.log(`- Created at: ${notification.createdAt}`);

  // 4. Проверяем статус сервиса
  const serviceConfig = await db.serviceConfig.findUnique({
    where: { serviceKey: "notification_auto_processor" }
  });

  if (serviceConfig?.isEnabled) {
    console.log("\n✅ NotificationAutoProcessorService is enabled");
    console.log("The service should process this notification within the next polling interval.");
    
    // Ждем немного и проверяем результат
    console.log("\nWaiting 5 seconds for processing...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Проверяем, обработано ли уведомление
    const updatedNotification = await db.notification.findUnique({
      where: { id: notification.id }
    });
    
    const updatedTransaction = await db.transaction.findUnique({
      where: { id: transaction.id },
      include: { trader: true }
    });
    
    console.log("\nProcessing results:");
    console.log(`- Notification processed: ${updatedNotification?.isProcessed ? '✅' : '❌'}`);
    console.log(`- Transaction status: ${updatedTransaction?.status}`);
    
    if (updatedTransaction?.status === Status.READY) {
      console.log(`- Transaction completed! ✅`);
      console.log(`- Trader profit: ${updatedTransaction.traderProfit || 0} USDT`);
      console.log(`- Trader frozen balance: ${updatedTransaction.trader?.frozenUsdt} USDT`);
    }
  } else {
    console.log("\n⚠️ NotificationAutoProcessorService is disabled");
    console.log("Enable it to test automatic transaction matching.");
  }

  return notification;
}

function getPackageNameForBank(bankType: string): string {
  const packageNames: Record<string, string> = {
    SBERBANK: "ru.sberbankmobile",
    TBANK: "com.ideast.tinkoff.mb",
    TINKOFF: "com.ideast.tinkoff.mb", 
    VTB: "ru.vtb24.mobile",
    ALFABANK: "ru.alfabank.mobile.android",
    GAZPROMBANK: "ru.gazprombank.android",
    OZONBANK: "ru.ozon.bank.android",
    RAIFFEISEN: "ru.raiffeisen.mobile",
    ROSBANK: "ru.rosbank.android",
    OTKRITIE: "ru.otkritie.mobile",
    SOVCOMBANK: "ru.sovcombank.mobile",
    CITIBANK: "ru.citibank.mobile",
    UNICREDIT: "ru.unicreditbank.mobile",
    RUSSIANSTANDARD: "ru.rsb.mobile"
  };
  
  return packageNames[bankType] || "unknown.bank.app";
}

// Запускаем
createTestNotification()
  .then(() => {
    console.log("\n✅ Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });