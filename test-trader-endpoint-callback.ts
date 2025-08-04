#!/usr/bin/env bun

// Тест отправки колбэка через эндпоинт трейдера

import { db } from './backend/src/db';

const API_URL = 'http://localhost:3000/api';
const ADMIN_KEY = '3d3b2e3efa297cae2bc6b19f3f8448ed2b2c7fd43af823a2a3a0585edfbb67d1';

async function testTraderEndpointCallback() {
  console.log('🔍 Тестируем отправку колбэка через эндпоинт трейдера...\n');
  
  // Создаем тестовую транзакцию через админку
  console.log('📝 Создаем тестовую транзакцию...');
  
  // Находим метод
  const methods = await fetch(`${API_URL}/admin/methods`, {
    headers: { 'x-admin-key': ADMIN_KEY }
  });
  const methodsData = await methods.json();
  const method = methodsData[0];
  
  if (!method) {
    console.log('❌ Не найдено методов');
    return;
  }
  
  // Находим трейдера
  const trader = await db.user.findFirst({
    where: {
      deposit: { gte: 100 }
    }
  });
  
  if (!trader) {
    console.log('❌ Не найден трейдер');
    return;
  }
  
  // Находим мерчанта
  const merchant = await db.merchant.findFirst({
    where: { name: 'test' }
  });
  
  if (!merchant) {
    console.log('❌ Не найден тестовый мерчант');
    return;
  }
  
  // Создаем транзакцию напрямую в БД
  const transaction = await db.transaction.create({
    data: {
      merchantId: merchant.id,
      methodId: method.id,
      traderId: trader.id,
      amount: 2000,
      assetOrBank: 'test-card',
      orderId: `TEST_TRADER_${Date.now()}`,
      currency: 'RUB',
      userId: 'test_user',
      userIp: '127.0.0.1',
      callbackUri: 'https://httpbin.org/post', // Используем httpbin для тестирования
      successUri: '',
      failUri: '',
      type: 'IN',
      status: 'IN_PROGRESS',
      expired_at: new Date(Date.now() + 3600000),
      commission: 0,
      clientName: 'Test Client',
      rate: 95,
      isMock: true
    }
  });
  
  console.log(`✅ Создана транзакция: ${transaction.id}`);
  console.log(`   Трейдер: ${transaction.traderId}`);
  console.log(`   Статус: ${transaction.status}`);
  console.log(`   Сумма: ${transaction.amount}\n`);
  
  console.log(`📤 Имитируем подтверждение транзакции трейдером ${trader.email}...\n`);
  
  // Создаем токен для трейдера (временный хак для теста)
  const session = await db.session.create({
    data: {
      userId: trader.id,
      token: `test-token-${Date.now()}`,
      expiredAt: new Date(Date.now() + 3600000),
      ip: '127.0.0.1'
    }
  });
  
  // Проверяем количество колбэков до изменения статуса
  const historyBefore = await db.callbackHistory.count({
    where: { transactionId: transaction.id }
  });
  console.log(`📊 Колбэков в истории до изменения: ${historyBefore}`);
  
  // Меняем статус транзакции через эндпоинт трейдера
  const statusResponse = await fetch(
    `${API_URL}/trader/transactions/${transaction.id}/status`,
    {
      method: 'PATCH',  // Используем PATCH, не PUT
      headers: {
        'x-trader-token': session.token,  // Используем правильный заголовок
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'READY'
      })
    }
  );
  
  if (!statusResponse.ok) {
    console.log('❌ Не удалось изменить статус:', await statusResponse.text());
    
    // Удаляем сессию
    await db.session.delete({ where: { id: session.id } });
    return;
  }
  
  const statusData = await statusResponse.json();
  console.log(`✅ Статус изменен: ${statusData.transaction.status}`);
  
  if (statusData.hook) {
    console.log('✅ Hook (notifyByStatus) вернул результат:', statusData.hook);
  } else {
    console.log('⚠️ Hook (notifyByStatus) не вернул результат');
  }
  
  // Небольшая задержка для завершения асинхронных операций
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Проверяем количество колбэков после изменения статуса
  const historyAfter = await db.callbackHistory.count({
    where: { transactionId: transaction.id }
  });
  console.log(`\n📊 Колбэков в истории после изменения: ${historyAfter}`);
  console.log(`   Добавлено новых колбэков: ${historyAfter - historyBefore}`);
  
  // Получаем последние колбэки
  const recentCallbacks = await db.callbackHistory.findMany({
    where: { transactionId: transaction.id },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  
  if (recentCallbacks.length > 0) {
    console.log('\n📜 Последние колбэки:');
    recentCallbacks.forEach((cb, index) => {
      const payload = cb.payload as any;
      console.log(`\n   ${index + 1}. ${cb.createdAt.toISOString()}`);
      console.log(`      URL: ${cb.url}`);
      console.log(`      Status Code: ${cb.statusCode || 'N/A'}`);
      console.log(`      Payload:`, {
        id: payload.id,
        amount: payload.amount,
        status: payload.status
      });
    });
  } else {
    console.log('\n❌ Колбэки не найдены в истории');
  }
  
  // Удаляем тестовую сессию
  await db.session.delete({ where: { id: session.id } });
}

// Запускаем тест
testTraderEndpointCallback()
  .catch(console.error)
  .finally(() => process.exit(0));