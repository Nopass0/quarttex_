import { db } from "../db";

async function testRequisiteRotation() {
  console.log("=== Тестирование ротации реквизитов ===\n");

  // Получаем тестового мерчанта
  const testMerchant = await db.merchant.findFirst({
    where: { name: "Test" }
  });

  if (!testMerchant) {
    console.error("Тестовый мерчант не найден!");
    return;
  }

  // Получаем метод оплаты
  const method = await db.method.findFirst({
    where: { code: "sbp_bank_in" }
  });

  if (!method) {
    console.error("Метод оплаты sbp_bank_in не найден!");
    return;
  }

  // Получаем все активные реквизиты для этого метода
  const requisites = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      methodType: method.type,
      user: {
        banned: false,
        deposit: { gt: 0 },
        teamId: { not: null },
        trafficEnabled: true
      }
    },
    orderBy: { updatedAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          trustBalance: true,
          frozenUsdt: true
        }
      }
    }
  });

  console.log(`Найдено активных реквизитов: ${requisites.length}\n`);
  
  requisites.forEach((r, index) => {
    console.log(`Реквизит ${index + 1}:`);
    console.log(`  ID: ${r.id}`);
    console.log(`  Карта: ${r.cardNumber}`);
    console.log(`  Трейдер: ${r.user.email}`);
    console.log(`  Баланс: ${r.user.trustBalance} USDT`);
    console.log(`  Заморожено: ${r.user.frozenUsdt} USDT`);
    console.log(`  Последнее обновление: ${r.updatedAt.toISOString()}\n`);
  });

  // Проверяем распределение транзакций
  console.log("\n=== Проверка распределения транзакций ===\n");

  for (const requisite of requisites) {
    const transactionCount = await db.transaction.count({
      where: {
        bankDetailId: requisite.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // За последние 24 часа
        }
      }
    });

    const lastTransaction = await db.transaction.findFirst({
      where: { bankDetailId: requisite.id },
      orderBy: { createdAt: "desc" },
      select: { 
        id: true, 
        createdAt: true,
        amount: true,
        status: true
      }
    });

    console.log(`Реквизит ${requisite.cardNumber}:`);
    console.log(`  Транзакций за 24ч: ${transactionCount}`);
    if (lastTransaction) {
      console.log(`  Последняя транзакция: ${lastTransaction.createdAt.toISOString()}`);
      console.log(`  Сумма: ${lastTransaction.amount} RUB`);
      console.log(`  Статус: ${lastTransaction.status}`);
    } else {
      console.log(`  Транзакций нет`);
    }
    console.log("");
  }

  await db.$disconnect();
}

testRequisiteRotation().catch(console.error);