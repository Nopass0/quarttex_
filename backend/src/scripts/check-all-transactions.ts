import { db } from "../db";

async function checkAllTransactions() {
  console.log("=== Проверка всех транзакций ===\n");

  // Получаем все транзакции
  const allTransactions = await db.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      trader: {
        select: {
          id: true,
          email: true,
          numericId: true
        }
      },
      requisites: {
        select: {
          id: true,
          cardNumber: true,
          userId: true
        }
      },
      merchant: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  console.log(`Всего найдено транзакций: ${allTransactions.length}\n`);

  for (const tx of allTransactions) {
    console.log(`Транзакция ${tx.id}:`);
    console.log(`  Создана: ${tx.createdAt.toISOString()}`);
    console.log(`  Мерчант: ${tx.merchant.name}`);
    console.log(`  Сумма: ${tx.amount} RUB`);
    console.log(`  Статус: ${tx.status}`);
    console.log(`  Трейдер: ${tx.trader?.email || 'НЕ НАЗНАЧЕН'} (ID: ${tx.traderId || 'НЕТ'})`);
    console.log(`  Реквизит: ${tx.requisites?.cardNumber || 'НЕ УКАЗАН'} (ID: ${tx.bankDetailId || 'НЕТ'})`);
    console.log(`  Принята: ${tx.acceptedAt ? tx.acceptedAt.toISOString() : 'НЕТ'}`);
    console.log("");
  }

  // Проверяем распределение по трейдерам
  console.log("\n=== Распределение по трейдерам ===");
  
  const traderStats = await db.transaction.groupBy({
    by: ['traderId'],
    _count: true,
    where: {
      traderId: { not: null }
    }
  });

  for (const stat of traderStats) {
    const trader = await db.user.findUnique({
      where: { id: stat.traderId! },
      select: { email: true, numericId: true }
    });
    console.log(`${trader?.email} (ID: ${trader?.numericId}): ${stat._count} транзакций`);
  }

  // Проверяем распределение по реквизитам
  console.log("\n=== Распределение по реквизитам ===");
  
  const requisiteStats = await db.transaction.groupBy({
    by: ['bankDetailId'],
    _count: true,
    where: {
      bankDetailId: { not: null }
    }
  });

  for (const stat of requisiteStats) {
    const requisite = await db.bankDetail.findUnique({
      where: { id: stat.bankDetailId! },
      select: { 
        cardNumber: true,
        user: {
          select: {
            email: true
          }
        }
      }
    });
    console.log(`${requisite?.cardNumber} (трейдер: ${requisite?.user.email}): ${stat._count} транзакций`);
  }

  await db.$disconnect();
}

checkAllTransactions().catch(console.error);