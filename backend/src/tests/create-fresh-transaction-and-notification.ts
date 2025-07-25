import { db } from "@/db";
import { Status, TransactionType } from "@prisma/client";
import { calculateTransactionFreezing, freezeTraderBalance } from "@/utils/transaction-freezing";
import { rapiraService } from "@/services/rapira.service";

async function createFreshTransactionAndNotification() {
  console.log("=== Creating fresh transaction and notification for testing ===\n");

  try {
    // 1. Найти подходящий реквизит с устройством
    const bankDetail = await db.bankDetail.findFirst({
      where: {
        isArchived: false,
        deviceId: { not: null },
        device: { 
          isOnline: true,
          isWorking: true 
        },
        user: {
          banned: false,
          trustBalance: { gte: 1000 }
        }
      },
      include: {
        device: true,
        user: true
      }
    });

    if (!bankDetail) {
      console.log("❌ No suitable bank details with device found");
      return;
    }

    console.log("Found bank detail:");
    console.log(`- Card: ${bankDetail.cardNumber}`);
    console.log(`- Bank: ${bankDetail.bankType}`);
    console.log(`- Device: ${bankDetail.device?.name}`);
    console.log(`- Trader: ${bankDetail.user.name}`);

    // 2. Найти тестового мерчанта
    const testMerchant = await db.merchant.findFirst({
      where: { name: "test" }
    });

    if (!testMerchant) {
      console.log("❌ Test merchant not found");
      return;
    }

    // 3. Найти метод
    const method = await db.method.findFirst({
      where: { 
        type: bankDetail.methodType,
        isEnabled: true
      }
    });

    if (!method) {
      console.log("❌ No suitable method found");
      return;
    }

    // 4. Генерируем сумму и создаем транзакцию
    const amount = Math.floor(Math.random() * 5000) + 1000; // От 1000 до 6000
    const orderId = `TEST_NOTIF_${Date.now()}`;

    // Получаем курсы
    const rapiraBaseRate = await rapiraService.getUsdtRubRate();
    const rateSettingRecord = await db.rateSetting.findFirst({ where: { id: 1 } });
    const rapiraKkk = rateSettingRecord?.rapiraKkk || 0;
    const rapiraRateWithKkk = await rapiraService.getRateWithKkk(rapiraKkk);

    console.log(`\nCreating transaction with amount: ${amount} RUB`);

    // Создаем транзакцию с заморозкой
    const transaction = await db.$transaction(async (prisma) => {
      // Рассчитываем параметры заморозки
      const freezingParams = await calculateTransactionFreezing(
        amount,
        rapiraRateWithKkk,
        bankDetail.userId,
        testMerchant.id,
        method.id
      );

      // Замораживаем баланс
      await freezeTraderBalance(prisma, bankDetail.userId, freezingParams);
      console.log(`Frozen ${freezingParams.totalRequired} USDT`);

      // Создаем транзакцию
      return await prisma.transaction.create({
        data: {
          merchantId: testMerchant.id,
          amount,
          assetOrBank: bankDetail.cardNumber,
          orderId,
          methodId: method.id,
          currency: "RUB",
          userId: `test_user_${Date.now()}`,
          userIp: "127.0.0.1",
          callbackUri: "",
          successUri: "",
          failUri: "",
          type: TransactionType.IN,
          expired_at: new Date(Date.now() + 3600000), // 1 час
          commission: 0,
          clientName: "Test Client",
          status: Status.IN_PROGRESS,
          rate: rapiraRateWithKkk,
          merchantRate: rapiraRateWithKkk,
          adjustedRate: rapiraRateWithKkk,
          isMock: true,
          bankDetailId: bankDetail.id,
          traderId: bankDetail.userId,
          frozenUsdtAmount: freezingParams.frozenUsdtAmount,
          calculatedCommission: freezingParams.calculatedCommission,
          kkkPercent: freezingParams.kkkPercent,
          feeInPercent: freezingParams.feeInPercent
        }
      });
    });

    console.log(`\n✅ Transaction created:`);
    console.log(`- ID: ${transaction.id}`);
    console.log(`- Numeric ID: ${transaction.numericId}`);
    console.log(`- Amount: ${transaction.amount} RUB`);
    console.log(`- Status: ${transaction.status}`);

    // 5. Ждем немного и создаем уведомление
    console.log("\nWaiting 2 seconds before creating notification...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Генерируем текст уведомления
    let notificationText = "";
    const amountFormatted = amount.toLocaleString('ru-RU');
    
    switch (bankDetail.bankType) {
      case "SBERBANK":
        const balance = Math.floor(Math.random() * 50000 + 10000);
        notificationText = `СБЕРБАНК. Перевод ${amountFormatted}р от ПЕТР П. Баланс: ${balance.toLocaleString('ru-RU')}р`;
        break;
      case "TBANK":
      case "TINKOFF":
        notificationText = `Пополнение. Счет RUB. ${amountFormatted} ₽. ПЕТРОВ П.П. Доступно ${(Math.random() * 100000).toFixed(2)} ₽`;
        break;
      case "VTB":
        const cardLast4 = bankDetail.cardNumber.slice(-4);
        notificationText = `ВТБ: Зачисление ${amountFormatted} RUB. Карта *${cardLast4}. Доступно: ${(Math.random() * 100000).toFixed(2)} RUB`;
        break;
      default:
        notificationText = `${bankDetail.bankType}: Поступление ${amountFormatted} руб.`;
    }

    console.log(`\nCreating notification: "${notificationText}"`);

    const notification = await db.notification.create({
      data: {
        type: "AppNotification",
        message: notificationText,
        deviceId: bankDetail.deviceId!,
        isProcessed: false,
        metadata: {
          packageName: getPackageNameForBank(bankDetail.bankType),
          timestamp: new Date().toISOString(),
          testNotification: true,
          transactionId: transaction.id,
          amount: transaction.amount
        }
      }
    });

    console.log(`\n✅ Notification created:`);
    console.log(`- ID: ${notification.id}`);
    console.log(`- Device ID: ${notification.deviceId}`);

    // 6. Ждем обработки
    console.log("\nWaiting 10 seconds for processing...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 7. Проверяем результат
    const updatedNotification = await db.notification.findUnique({
      where: { id: notification.id }
    });

    const updatedTransaction = await db.transaction.findUnique({
      where: { id: transaction.id },
      include: { trader: true }
    });

    console.log("\n📊 Results:");
    console.log(`- Notification processed: ${updatedNotification?.isProcessed ? '✅' : '❌'}`);
    
    if (updatedNotification?.isProcessed) {
      const metadata = updatedNotification.metadata as any;
      if (metadata?.processedReason) {
        console.log(`  ⚠️ Process reason: ${metadata.processedReason}`);
      }
    }

    console.log(`- Transaction status: ${updatedTransaction?.status}`);
    
    if (updatedTransaction?.status === Status.READY) {
      console.log(`  ✅ Transaction completed successfully!`);
      console.log(`  - Trader profit: ${updatedTransaction.traderProfit || 0} USDT`);
      console.log(`  - Frozen balance: ${updatedTransaction.trader?.frozenUsdt} USDT`);
      console.log(`  - Trust balance: ${updatedTransaction.trader?.trustBalance} USDT`);
      console.log(`  - Total profit: ${updatedTransaction.trader?.profitFromDeals} USDT`);
    } else {
      console.log(`  ❌ Transaction not completed`);
      console.log(`  - Current frozen: ${updatedTransaction?.frozenUsdtAmount} USDT`);
      console.log(`  - Commission: ${updatedTransaction?.calculatedCommission} USDT`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  }
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

createFreshTransactionAndNotification()
  .then(() => {
    console.log("\n✅ Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });