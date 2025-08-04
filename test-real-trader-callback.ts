#!/usr/bin/env bun

// Финальный тест отправки колбэка при подтверждении сделки трейдером

import { db } from './backend/src/db';

const API_URL = 'http://localhost:3000/api';

async function testRealTraderCallback() {
  console.log('🔍 Финальный тест отправки колбэка при подтверждении сделки трейдером\n');
  
  // Находим реальную транзакцию в статусе IN_PROGRESS
  let transaction = await db.transaction.findFirst({
    where: {
      status: 'IN_PROGRESS',
      type: 'IN',
      traderId: { not: null },
      callbackUri: { 
        notIn: ['', 'none']
      }
    },
    include: {
      trader: true
    }
  });
  
  if (!transaction) {
    console.log('📝 Создаем новую транзакцию для теста...\n');
    
    const trader = await db.user.findFirst({
      where: { deposit: { gte: 100 } }
    });
    
    const merchant = await db.merchant.findFirst({
      where: { name: 'test' }
    });
    
    const method = await db.method.findFirst();
    
    if (!trader || !merchant || !method) {
      console.log('❌ Не удалось создать тестовые данные');
      return;
    }
    
    transaction = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        methodId: method.id,
        traderId: trader.id,
        amount: 3500,
        assetOrBank: '4111111111111111',
        orderId: `REAL_TEST_${Date.now()}`,
        currency: 'RUB',
        userId: 'test_user',
        userIp: '192.168.1.100',
        callbackUri: 'https://webhook.site/your-unique-url', // Замените на ваш URL от webhook.site
        successUri: 'https://webhook.site/your-unique-url/success',
        failUri: '',
        type: 'IN',
        status: 'IN_PROGRESS',
        expired_at: new Date(Date.now() + 1800000), // 30 минут
        commission: 0,
        clientName: 'Иван Иванов',
        rate: 96.5,
        isMock: false
      },
      include: {
        trader: true
      }
    });
    
    console.log('✅ Создана реальная транзакция\n');
  }
  
  console.log('📋 Детали транзакции:');
  console.log(`   ID: ${transaction.id}`);
  console.log(`   Сумма: ${transaction.amount} RUB`);
  console.log(`   Трейдер: ${transaction.trader?.email}`);
  console.log(`   Callback URL: ${transaction.callbackUri}`);
  console.log(`   Success URL: ${transaction.successUri || 'не указан'}`);
  console.log(`   Статус: ${transaction.status}\n`);
  
  // Создаем сессию для трейдера
  const existingSession = await db.session.findFirst({
    where: {
      userId: transaction.traderId!,
      expiredAt: { gt: new Date() }
    }
  });
  
  const session = existingSession || await db.session.create({
    data: {
      userId: transaction.traderId!,
      token: `trader-token-${Date.now()}`,
      expiredAt: new Date(Date.now() + 3600000),
      ip: '192.168.1.100'
    }
  });
  
  console.log('🔐 Токен трейдера:', session.token);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Проверяем начальное количество колбэков
  const initialCallbacks = await db.callbackHistory.count({
    where: { transactionId: transaction.id }
  });
  
  console.log(`📊 Колбэков в истории ДО подтверждения: ${initialCallbacks}\n`);
  
  // Имитируем подтверждение транзакции трейдером
  console.log('🚀 Трейдер подтверждает платеж (меняет статус на READY)...\n');
  
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
  
  if (!response.ok) {
    const error = await response.text();
    console.log('❌ Ошибка при подтверждении:', error);
    return;
  }
  
  const result = await response.json();
  
  console.log('✅ Транзакция подтверждена!');
  console.log(`   Новый статус: ${result.transaction.status}`);
  
  // Ждем немного для завершения асинхронных операций
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Проверяем колбэки после подтверждения
  const finalCallbacks = await db.callbackHistory.count({
    where: { transactionId: transaction.id }
  });
  
  console.log(`\n📊 Колбэков в истории ПОСЛЕ подтверждения: ${finalCallbacks}`);
  console.log(`   Добавлено новых колбэков: ${finalCallbacks - initialCallbacks}\n`);
  
  // Показываем последние колбэки
  const recentCallbacks = await db.callbackHistory.findMany({
    where: { transactionId: transaction.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  if (recentCallbacks.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📜 История колбэков:\n');
    
    recentCallbacks.forEach((cb, index) => {
      const payload = cb.payload as any;
      console.log(`${index + 1}. ${cb.createdAt.toISOString()}`);
      console.log(`   URL: ${cb.url}`);
      console.log(`   Статус HTTP: ${cb.statusCode || 'Ошибка'}`);
      console.log(`   Отправленные данные:`);
      console.log(`     - ID транзакции: ${payload.id}`);
      console.log(`     - Сумма: ${payload.amount} RUB`);
      console.log(`     - Статус: ${payload.status}`);
      
      if (cb.error) {
        console.log(`   ⚠️ Ошибка: ${cb.error}`);
      } else if (cb.statusCode === 200) {
        console.log(`   ✅ Успешно доставлен`);
      }
      console.log('');
    });
  } else {
    console.log('❌ Колбэки не найдены в истории');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ Тест завершен!');
  
  if (finalCallbacks > initialCallbacks) {
    console.log('✅ Колбэк успешно отправлен и сохранен в историю при подтверждении сделки трейдером');
  } else {
    console.log('❌ Колбэк НЕ был отправлен при подтверждении сделки');
  }
}

// Запускаем тест
testRealTraderCallback()
  .catch(console.error)
  .finally(() => process.exit(0));