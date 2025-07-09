import { db } from '../src/db';
import { PayoutService } from '../src/services/payout.service';

console.log('🚀 Создание тестовых выплат...\n');

async function createTestPayouts() {
  try {
    // Находим мерчанта
    const merchant = await db.merchant.findUnique({
      where: { token: 'test-payout-merchant' }
    });

    if (!merchant) {
      console.log('❌ Мерчант не найден');
      return;
    }

    const payoutService = PayoutService.getInstance();
    
    // Создаем 5 тестовых выплат
    const testPayouts = [
      {
        amount: 1500,
        wallet: '+79001234567',
        bank: 'Сбербанк СБП',
        isCard: false,
      },
      {
        amount: 3000,
        wallet: '2202 **** **** 1234',
        bank: 'Сбербанк',
        isCard: true,
      },
      {
        amount: 2500,
        wallet: '+79007654321',
        bank: 'Тинькофф СБП',
        isCard: false,
      },
      {
        amount: 4000,
        wallet: '5536 **** **** 5678',
        bank: 'Тинькофф',
        isCard: true,
      },
      {
        amount: 1000,
        wallet: '+79005555555',
        bank: 'ВТБ СБП',
        isCard: false,
      },
    ];

    console.log('📝 Создание выплат:');
    
    for (let i = 0; i < testPayouts.length; i++) {
      const payoutData = testPayouts[i];
      const rate = 95 + Math.random() * 10; // курс от 95 до 105
      
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: payoutData.amount,
        wallet: payoutData.wallet,
        bank: payoutData.bank,
        isCard: payoutData.isCard,
        rate,
        processingTime: 15,
        webhookUrl: 'http://localhost:3000/webhook/test',
        metadata: {
          testPayout: true,
          createdBy: 'create-test-payouts',
          batchId: Date.now(),
        }
      });

      console.log(`✅ Выплата #${payout.numericId}: ${payout.amount}₽ - ${payout.wallet} (${payout.bank})`);
    }

    // Показываем итоговую статистику
    const totalPayouts = await db.payout.count();
    const activePayouts = await db.payout.count({ where: { status: 'CREATED' } });
    
    console.log(`\n📊 Статистика:`);
    console.log(`Всего выплат: ${totalPayouts}`);
    console.log(`Активных выплат: ${activePayouts}`);

    // Показываем баланс трейдера
    const trader = await db.user.findUnique({
      where: { email: 'payout-trader@test.com' }
    });

    if (trader) {
      console.log(`\n👤 Трейдер (${trader.email}):`);
      console.log(`Баланс выплат: ${trader.payoutBalance}₽`);
      console.log(`Замороженный баланс: ${trader.frozenPayoutBalance}₽`);
    }

    console.log('\n🎉 Тестовые выплаты созданы успешно!');
    console.log('\n📋 Данные для входа:');
    console.log('Email трейдера: payout-trader@test.com');
    console.log('Пароль: payout123');
    
  } catch (error) {
    console.error('❌ Ошибка при создании выплат:', error);
  }
}

createTestPayouts()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));