#!/usr/bin/env bun

// Прямой тест отправки колбэка через CallbackService

import { db } from './backend/src/db';
import { CallbackService } from './backend/src/services/CallbackService';

async function testDirectCallback() {
  console.log('🔍 Тестируем прямую отправку колбэка через CallbackService...\n');
  
  // Находим любую транзакцию с callbackUri
  const transaction = await db.transaction.findFirst({
    where: {
      callbackUri: { 
        not: 'none',
        notIn: ['', 'none']
      }
    }
  });
  
  if (!transaction) {
    console.log('❌ Не найдено транзакций с callbackUri');
    
    // Создаем тестовую транзакцию
    const testMerchant = await db.merchant.findFirst({ where: { name: 'test' } });
    const testMethod = await db.method.findFirst();
    
    if (!testMerchant || !testMethod) {
      console.log('❌ Не удалось создать тестовую транзакцию');
      return;
    }
    
    const newTransaction = await db.transaction.create({
      data: {
        merchantId: testMerchant.id,
        methodId: testMethod.id,
        amount: 5000,
        assetOrBank: 'test-asset',
        orderId: `TEST_CALLBACK_${Date.now()}`,
        currency: 'RUB',
        userId: 'test_user',
        userIp: '127.0.0.1',
        callbackUri: 'https://webhook.site/test-callback', // Тестовый URL
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
    
    console.log(`✅ Создана тестовая транзакция: ${newTransaction.id}\n`);
    
    // Отправляем колбэк
    console.log('📤 Отправляем колбэк через CallbackService...');
    await CallbackService.sendCallback(newTransaction, 'READY');
    
    // Проверяем историю
    const history = await db.callbackHistory.findFirst({
      where: { transactionId: newTransaction.id },
      orderBy: { createdAt: 'desc' }
    });
    
    if (history) {
      console.log('\n✅ Колбэк сохранен в историю:');
      console.log('   URL:', history.url);
      console.log('   Payload:', JSON.stringify(history.payload, null, 2));
      
      const payload = history.payload as any;
      console.log('\n📋 Проверка полей:');
      console.log('   ID:', payload.id || '❌ отсутствует');
      console.log('   Amount:', payload.amount !== undefined ? `✅ ${payload.amount}` : '❌ отсутствует');
      console.log('   Status:', payload.status || '❌ отсутствует');
    } else {
      console.log('\n❌ Колбэк не найден в истории');
    }
    
    return;
  }
  
  console.log(`📋 Используем транзакцию: ${transaction.id}`);
  console.log(`   Сумма: ${transaction.amount}`);
  console.log(`   Callback URL: ${transaction.callbackUri}\n`);
  
  // Отправляем колбэк
  console.log('📤 Отправляем колбэк через CallbackService...');
  await CallbackService.sendCallback(transaction, 'READY');
  
  // Проверяем последнюю запись в истории
  const history = await db.callbackHistory.findFirst({
    where: { transactionId: transaction.id },
    orderBy: { createdAt: 'desc' }
  });
  
  if (history) {
    console.log('\n✅ Последний колбэк в истории:');
    console.log('   Время:', history.createdAt.toISOString());
    console.log('   URL:', history.url);
    console.log('   Status Code:', history.statusCode || 'N/A');
    console.log('   Payload:', JSON.stringify(history.payload, null, 2));
    
    const payload = history.payload as any;
    console.log('\n📋 Проверка полей:');
    console.log('   ID:', payload.id || '❌ отсутствует');
    console.log('   Amount:', payload.amount !== undefined ? `✅ ${payload.amount}` : '❌ отсутствует');
    console.log('   Status:', payload.status || '❌ отсутствует');
  } else {
    console.log('\n❌ История колбэков не найдена');
  }
}

// Запускаем тест
testDirectCallback()
  .catch(console.error)
  .finally(() => process.exit(0));