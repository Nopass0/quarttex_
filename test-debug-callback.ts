#!/usr/bin/env bun

// Отладочный тест для поиска проблемы с колбэками

import { db } from './backend/src/db';

const API_URL = 'http://localhost:3000/api';

async function testDebugCallback() {
  console.log('🔍 Отладочный тест колбэков\n');
  
  // Создаем тестовую транзакцию
  const trader = await db.user.findFirst({
    where: { deposit: { gte: 100 } }
  });
  
  const merchant = await db.merchant.findFirst({
    where: { name: 'test' }
  });
  
  const method = await db.method.findFirst();
  
  if (!trader || !merchant || !method) {
    console.log('❌ Не найдены необходимые данные');
    return;
  }
  
  const transaction = await db.transaction.create({
    data: {
      merchantId: merchant.id,
      methodId: method.id,
      traderId: trader.id,
      amount: 5000,
      assetOrBank: 'test-card',
      orderId: `DEBUG_${Date.now()}`,
      currency: 'RUB',
      userId: 'test_user',
      userIp: '127.0.0.1',
      callbackUri: 'https://httpbin.org/post',
      successUri: 'https://httpbin.org/post',
      failUri: '',
      type: 'IN',
      status: 'IN_PROGRESS',
      expired_at: new Date(Date.now() + 3600000),
      commission: 0,
      clientName: 'Debug Test',
      rate: 95,
      isMock: true
    }
  });
  
  console.log(`✅ Создана транзакция: ${transaction.id}`);
  console.log(`   Трейдер: ${trader.email}`);
  console.log(`   Callback URL: ${transaction.callbackUri}\n`);
  
  // Создаем сессию
  const session = await db.session.create({
    data: {
      userId: trader.id,
      token: `debug-token-${Date.now()}`,
      expiredAt: new Date(Date.now() + 3600000),
      ip: '127.0.0.1'
    }
  });
  
  console.log('📤 Отправляем запрос на изменение статуса...\n');
  console.log('Заголовки:', {
    'x-trader-token': session.token,
    'Content-Type': 'application/json'
  });
  console.log('URL:', `${API_URL}/trader/transactions/${transaction.id}/status`);
  console.log('Body:', { status: 'READY' });
  console.log('\n');
  
  const response = await fetch(
    `${API_URL}/trader/transactions/${transaction.id}/status`,
    {
      method: 'PATCH',
      headers: {
        'x-trader-token': session.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'READY'
      })
    }
  );
  
  console.log(`📊 Ответ сервера: ${response.status} ${response.statusText}`);
  
  const responseText = await response.text();
  console.log('Тело ответа:', responseText);
  
  if (response.ok) {
    const data = JSON.parse(responseText);
    console.log('\n✅ Статус изменен успешно');
    console.log('Hook отправлен:', data.hook ? 'ДА' : 'НЕТ');
    
    if (data.hook) {
      console.log('Детали hook:', JSON.stringify(data.hook, null, 2));
    }
  } else {
    console.log('\n❌ Ошибка при изменении статуса');
  }
  
  // Проверяем историю колбэков
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const callbacks = await db.callbackHistory.findMany({
    where: { transactionId: transaction.id },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`\n📜 Найдено колбэков в истории: ${callbacks.length}`);
  
  callbacks.forEach((cb, i) => {
    console.log(`\n${i + 1}. ${cb.createdAt.toISOString()}`);
    console.log(`   URL: ${cb.url}`);
    console.log(`   Status: ${cb.statusCode || 'ERROR'}`);
    console.log(`   Payload:`, cb.payload);
  });
  
  // Удаляем сессию
  await db.session.delete({ where: { id: session.id } });
  
  console.log('\n🔍 Проверьте логи сервера для деталей!');
}

testDebugCallback()
  .catch(console.error)
  .finally(() => process.exit(0));