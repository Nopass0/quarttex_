import { db } from "../db";
import { NotificationType, Status, TransactionType, BankType, MethodType } from "@prisma/client";

async function createTestDevice() {
  // Find a test trader
  const trader = await db.user.findFirst({
    where: { email: "trader@test.com" }
  });

  if (!trader) {
    console.error("❌ Test trader not found");
    return;
  }

  // Create a test device
  const device = await db.device.create({
    data: {
      name: "Test Device for Notifications",
      userId: trader.id,
      token: `test-device-${Date.now()}`,
      emulated: true,
      isOnline: true,
      isWorking: true,
      pushEnabled: true,
      firstConnectionAt: new Date()
    }
  });

  console.log(`✅ Created test device: ${device.id}`);

  // Create bank details for the device
  const bankDetails = [
    {
      cardNumber: "4276380012345678",
      recipientName: "IVAN IVANOV",
      bankType: BankType.SBERBANK,
      methodType: MethodType.c2c,
      minAmount: 100,
      maxAmount: 100000,
      dailyLimit: 500000,
      monthlyLimit: 5000000,
      userId: trader.id,
      deviceId: device.id
    },
    {
      cardNumber: "5536913812345678",
      recipientName: "IVAN IVANOV",
      bankType: BankType.TBANK,
      methodType: MethodType.c2c,
      minAmount: 100,
      maxAmount: 100000,
      dailyLimit: 500000,
      monthlyLimit: 5000000,
      userId: trader.id,
      deviceId: device.id
    },
    {
      cardNumber: "4272380012345678",
      recipientName: "IVAN IVANOV",
      bankType: BankType.VTB,
      methodType: MethodType.c2c,
      minAmount: 100,
      maxAmount: 100000,
      dailyLimit: 500000,
      monthlyLimit: 5000000,
      userId: trader.id,
      deviceId: device.id
    }
  ];

  for (const bd of bankDetails) {
    const created = await db.bankDetail.create({ data: bd });
    console.log(`✅ Created bank detail: ${created.bankType} - ${created.cardNumber}`);
  }

  return { device, trader };
}

async function createTestTransactions(traderId: string, bankDetailIds: string[]) {
  // Find test merchant
  const merchant = await db.merchant.findFirst({
    where: { name: "Test Merchant" }
  });

  if (!merchant) {
    console.error("❌ Test merchant not found");
    return [];
  }

  const transactions = [];
  const amounts = [1000, 2500, 5000, 10000, 15000, 25000];
  
  for (let i = 0; i < amounts.length; i++) {
    const bankDetailId = bankDetailIds[i % bankDetailIds.length];
    
    const transaction = await db.transaction.create({
      data: {
        orderId: `TEST-${Date.now()}-${i}`,
        merchantId: merchant.id,
        traderId: traderId,
        userId: traderId,
        bankDetailId: bankDetailId,
        amount: amounts[i],
        status: Status.CREATED,
        type: TransactionType.IN,
        assetOrBank: "RUB",
        createdAt: new Date(Date.now() - (i * 60000)), // Different times
        callbackUri: "https://webhook.site/test-callback",
        successUri: "https://test.com/success",
        failUri: "https://test.com/fail",
        expired_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        commission: 0,
        commissionPaidBy: "merchant"
      },
      include: {
        bankDetail: true
      }
    });
    
    transactions.push(transaction);
    console.log(`✅ Created transaction #${i + 1}: ${transaction.amount} RUB for ${transaction.bankDetail.bankType}`);
  }

  return transactions;
}

async function sendTestNotifications(deviceId: string, transactions: any[]) {
  const notifications = [
    // Exact matches
    {
      packageName: "ru.sberbankmobile",
      message: "Пополнение счета на 1000 ₽ от Иван И.",
      amount: 1000,
      bank: "SBERBANK"
    },
    {
      packageName: "com.idamob.tinkoff.android",
      message: "Перевод на 2500 ₽ от Петров П.П.",
      amount: 2500,
      bank: "TBANK"
    },
    {
      packageName: "ru.vtb24.mobilebanking.android",
      message: "Поступление: 5000 ₽. Остаток: 125000 ₽",
      amount: 5000,
      bank: "VTB"
    },
    // Near matches (±1 ruble)
    {
      packageName: "ru.sberbankmobile",
      message: "Пополнение карты *1234 на сумму 9999 ₽",
      amount: 9999,
      bank: "SBERBANK"
    },
    // Non-matching amounts
    {
      packageName: "com.idamob.tinkoff.android",
      message: "Перевод на 7777 ₽ успешно выполнен",
      amount: 7777,
      bank: "TBANK"
    },
    // Exact match for larger amount
    {
      packageName: "ru.sberbankmobile",
      message: "Зачисление 15000 ₽ на счет *5678",
      amount: 15000,
      bank: "SBERBANK"
    }
  ];

  for (const notif of notifications) {
    const notification = await db.notification.create({
      data: {
        deviceId: deviceId,
        type: NotificationType.AppNotification,
        application: notif.packageName,
        title: "Банковское уведомление",
        message: notif.message,
        timestamp: new Date(),
        isRead: false,
        metadata: {
          packageName: notif.packageName,
          expectedAmount: notif.amount,
          expectedBank: notif.bank
        }
      }
    });
    
    console.log(`📱 Sent notification: ${notif.message}`);
    
    // Wait a bit between notifications
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function checkResults(transactions: any[]) {
  console.log("\n🔍 Checking transaction statuses after processing...");
  
  for (const tx of transactions) {
    const updated = await db.transaction.findUnique({
      where: { id: tx.id },
      include: { bankDetail: true }
    });
    
    console.log(`Transaction ${updated!.amount} RUB (${updated!.bankDetail.bankName}): ${updated!.status}`);
  }
}

async function main() {
  console.log("🚀 Starting notification matching test...\n");
  
  // 1. Create test device
  const result = await createTestDevice();
  if (!result) return;
  
  const { device, trader } = result;
  
  // 2. Get bank details
  const bankDetails = await db.bankDetail.findMany({
    where: { deviceId: device.id }
  });
  
  // 3. Create test transactions
  const transactions = await createTestTransactions(
    trader.id, 
    bankDetails.map(bd => bd.id)
  );
  
  console.log(`\n📝 Created ${transactions.length} test transactions`);
  
  // 4. Send test notifications
  console.log("\n📱 Sending test notifications...");
  await sendTestNotifications(device.id, transactions);
  
  // 5. Wait for processing
  console.log("\n⏳ Waiting 10 seconds for NotificationMatcherService to process...");
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // 6. Check results
  await checkResults(transactions);
  
  console.log("\n✅ Test completed!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
  });