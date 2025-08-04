import { db as prisma } from './backend/src/db';
import { CallbackService } from './backend/src/services/CallbackService';

async function testCallbackHistory() {
  console.log('🧪 Тестирование функционала истории колбэков...');

  try {
    // 1. Создаем тестовый мерчант и метод
    console.log('1. Создание тестового мерчанта и метода...');
    const merchant = await prisma.merchant.create({
      data: {
        name: 'Тестовый мерчант',
        email: 'test@example.com',
        token: 'test-token-123'
      }
    });

    const method = await prisma.method.create({
      data: {
        name: 'Тестовый метод',
        code: 'TEST_METHOD',
        type: 'CARD',
        currency: 'RUB'
      }
    });

    // 2. Создаем тестовую транзакцию
    console.log('2. Создание тестовой транзакции...');
    const transaction = await prisma.transaction.create({
      data: {
        amount: 1000,
        assetOrBank: 'SBERBANK',
        orderId: 'test-order-123',
        currency: 'RUB',
        userId: 'test-user-123',
        userIp: '127.0.0.1',
        callbackUri: 'https://httpbin.org/post',
        successUri: 'https://httpbin.org/post',
        failUri: 'https://httpbin.org/post',
        expired_at: new Date(Date.now() + 30 * 60 * 1000), // +30 минут
        commission: 5,
        clientName: 'Тестовый клиент',
        status: 'CREATED',
        merchantId: merchant.id,
        methodId: method.id
      }
    });

    console.log(`✅ Транзакция создана: ${transaction.id}`);

    // 3. Отправляем колбэк
    console.log('3. Отправка колбэка...');
    await CallbackService.sendCallback(transaction, 'READY');
    
    // 4. Проверяем историю колбэков в БД
    console.log('4. Проверка истории колбэков...');
    const callbackHistory = await prisma.callbackHistory.findMany({
      where: { transactionId: transaction.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Найдено записей в истории: ${callbackHistory.length}`);
    
    if (callbackHistory.length > 0) {
      const callback = callbackHistory[0];
      console.log('📝 Последний колбэк:');
      console.log(`  - URL: ${callback.url}`);
      console.log(`  - Payload: ${JSON.stringify(callback.payload)}`);
      console.log(`  - Status Code: ${callback.statusCode}`);
      console.log(`  - Response: ${callback.response?.substring(0, 100)}...`);
      console.log(`  - Error: ${callback.error || 'Нет'}`);
      console.log(`  - Время: ${callback.createdAt}`);
    }

    // 5. Тестируем API эндпоинт
    console.log('5. Тестирование API эндпоинта...');
    const response = await fetch(`http://localhost:3000/admin/transactions/${transaction.id}/callbacks`, {
      headers: {
        'X-Admin-Key': '3d3b2e3efa297cae2bc6b19f3f8448ed2b2c7fd43af823a2a3a0585edfbb67d1'
      }
    });

    if (response.ok) {
      const apiData = await response.json();
      console.log(`✅ API вернул ${apiData.callbackHistory.length} записей`);
    } else {
      console.log(`❌ API ошибка: ${response.status}`);
    }

    // 6. Отправляем еще один колбэк для проверки множественных записей
    console.log('6. Отправка второго колбэка...');
    await CallbackService.sendCallback(transaction, 'EXPIRED');
    
    const finalHistory = await prisma.callbackHistory.findMany({
      where: { transactionId: transaction.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Итоговое количество записей: ${finalHistory.length}`);

    // Очистка
    console.log('🧹 Очистка тестовых данных...');
    await prisma.callbackHistory.deleteMany({
      where: { transactionId: transaction.id }
    });
    await prisma.transaction.delete({
      where: { id: transaction.id }
    });
    await prisma.method.delete({
      where: { id: method.id }
    });
    await prisma.merchant.delete({
      where: { id: merchant.id }
    });

    console.log('✅ Тест завершен успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCallbackHistory();