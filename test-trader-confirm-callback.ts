#!/usr/bin/env bun

// Тестовый скрипт для проверки отправки колбэка при подтверждении сделки трейдером

import { db } from './backend/src/db';

const API_URL = 'http://localhost:3000/api';
const ADMIN_KEY = '3d3b2e3efa297cae2bc6b19f3f8448ed2b2c7fd43af823a2a3a0585edfbb67d1';

async function testTraderConfirmCallback() {
  console.log('🔍 Тестируем отправку колбэка при подтверждении сделки трейдером...\n');
  
  // Находим трейдера с активной транзакцией
  const transaction = await db.transaction.findFirst({
    where: {
      status: 'IN_PROGRESS',
      type: 'IN',
      traderId: { not: null },
      callbackUri: { not: 'none' }
    },
    include: {
      trader: true
    }
  });
  
  if (!transaction || !transaction.trader) {
    console.log('❌ Не найдено подходящих транзакций для теста');
    console.log('   Создаем тестовую транзакцию...\n');
    
    // Создаем тестовую транзакцию
    const testMerchant = await db.merchant.findFirst({ where: { name: 'test' } });
    const testMethod = await db.method.findFirst({ where: { type: 'c2c' } });
    const testTrader = await db.user.findFirst({ 
      where: { 
        deposit: { gte: 1000 }
      } 
    });
    
    if (!testMerchant || !testMethod || !testTrader) {
      console.log('❌ Не удалось создать тестовую транзакцию - отсутствуют необходимые данные');
      return;
    }
    
    const newTransaction = await db.transaction.create({
      data: {
        merchantId: testMerchant.id,
        methodId: testMethod.id,
        traderId: testTrader.id,
        amount: 1000,
        assetOrBank: '1234567890123456',
        orderId: `TEST_${Date.now()}`,
        currency: 'RUB',
        userId: 'test_user',
        userIp: '127.0.0.1',
        callbackUri: 'https://webhook.site/unique-id', // Замените на ваш webhook URL
        successUri: '',
        failUri: '',
        type: 'IN',
        status: 'IN_PROGRESS',
        expired_at: new Date(Date.now() + 3600000),
        commission: 0,
        clientName: 'Test Client',
        rate: 95,
        isMock: true
      },
      include: {
        trader: true
      }
    });
    
    console.log(`✅ Создана тестовая транзакция: ${newTransaction.id}\n`);
    
    // Логинимся как трейдер
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testTrader.email,
        password: 'password' // Используйте реальный пароль трейдера
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Не удалось войти как трейдер');
      console.log('   Используем прямой вызов API...\n');
      
      // Прямой вызов функции notifyByStatus
      const { notifyByStatus } = await import('./backend/src/utils/notify');
      
      console.log('📤 Отправляем колбэк напрямую...');
      const result = await notifyByStatus({
        id: newTransaction.id,
        status: 'READY',
        successUri: newTransaction.successUri,
        failUri: newTransaction.failUri,
        callbackUri: newTransaction.callbackUri || undefined,
        amount: newTransaction.amount
      });
      
      console.log('\n✅ Колбэк отправлен:', result);
      
      // Проверяем историю
      const history = await db.callbackHistory.findMany({
        where: { transactionId: newTransaction.id },
        orderBy: { createdAt: 'desc' },
        take: 1
      });
      
      if (history.length > 0) {
        console.log('\n✅ Колбэк сохранен в историю:');
        console.log('   Payload:', history[0].payload);
        console.log('   Amount в payload:', (history[0].payload as any)?.amount || 'отсутствует');
      }
      
      return;
    }
    
    const loginData = await loginResponse.json();
    const traderToken = loginData.token;
    
    // Подтверждаем транзакцию как трейдер
    console.log('📤 Подтверждаем транзакцию как трейдер...');
    const confirmResponse = await fetch(
      `${API_URL}/trader/transactions/${newTransaction.id}/status`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${traderToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'READY'
        })
      }
    );
    
    const confirmResult = await confirmResponse.json();
    console.log('\n📨 Результат подтверждения:', confirmResult.success ? 'Успешно' : 'Ошибка');
    
    if (confirmResult.hook) {
      console.log('✅ Колбэк был отправлен');
    } else {
      console.log('❌ Колбэк не был отправлен');
    }
    
    // Проверяем историю колбэков
    const historyResponse = await fetch(
      `${API_URL}/admin/transactions/${newTransaction.id}/callbacks`,
      {
        headers: {
          'x-admin-key': ADMIN_KEY
        }
      }
    );
    
    const historyData = await historyResponse.json();
    const lastCallback = historyData.callbackHistory?.[0];
    
    if (lastCallback) {
      console.log('\n✅ Последний колбэк в истории:');
      console.log('   Время:', lastCallback.createdAt);
      console.log('   URL:', lastCallback.url);
      console.log('   Payload amount:', lastCallback.payload?.amount || 'отсутствует');
      console.log('   Payload status:', lastCallback.payload?.status || 'отсутствует');
    }
    
    return;
  }
  
  console.log(`📋 Используем транзакцию: ${transaction.id}`);
  console.log(`   Трейдер: ${transaction.trader.email}`);
  console.log(`   Сумма: ${transaction.amount}`);
  console.log(`   Callback URL: ${transaction.callbackUri}\n`);
  
  // Здесь должен быть код для подтверждения транзакции трейдером
  // Но так как у нас нет токена трейдера, используем прямой вызов
  
  const { notifyByStatus } = await import('./backend/src/utils/notify');
  
  console.log('📤 Имитируем подтверждение транзакции трейдером...');
  const result = await notifyByStatus({
    id: transaction.id,
    status: 'READY',
    successUri: transaction.successUri,
    failUri: transaction.failUri,
    callbackUri: transaction.callbackUri || undefined,
    amount: transaction.amount
  });
  
  console.log('\n✅ Колбэк отправлен:', result ? 'Да' : 'Нет');
  
  // Проверяем историю
  const history = await db.callbackHistory.findMany({
    where: { transactionId: transaction.id },
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  
  if (history.length > 0) {
    console.log('\n✅ Последний колбэк в истории:');
    console.log('   Payload:', history[0].payload);
    console.log('   Amount в payload:', (history[0].payload as any)?.amount || 'отсутствует');
    console.log('   Status в payload:', (history[0].payload as any)?.status || 'отсутствует');
  }
}

// Запускаем тест
testTraderConfirmCallback()
  .catch(console.error)
  .finally(() => process.exit(0));