#!/usr/bin/env bun

// Тестовый скрипт для проверки исправлений отправки колбэков

const API_URL = 'http://localhost:3000/api';
const ADMIN_KEY = '3d3b2e3efa297cae2bc6b19f3f8448ed2b2c7fd43af823a2a3a0585edfbb67d1';

async function testAdminCallback() {
  console.log('🔍 Тестируем отправку колбэка из админки...\n');
  
  // Сначала получим первую транзакцию с callbackUri
  const listResponse = await fetch(`${API_URL}/admin/transactions/list?limit=10`, {
    headers: {
      'x-admin-key': ADMIN_KEY
    }
  });
  
  const listData = await listResponse.json();
  const transactionWithCallback = listData.data?.find((t: any) => 
    t.callbackUri && t.callbackUri !== 'none' && t.callbackUri !== ''
  );
  
  if (!transactionWithCallback) {
    console.log('❌ Не найдено транзакций с callbackUri');
    return;
  }
  
  console.log(`📋 Используем транзакцию: ${transactionWithCallback.id}`);
  console.log(`   Сумма: ${transactionWithCallback.amount}`);
  console.log(`   Callback URL: ${transactionWithCallback.callbackUri}\n`);
  
  // Отправляем стандартный колбэк
  console.log('📤 Отправляем стандартный колбэк...');
  const callbackResponse = await fetch(
    `${API_URL}/admin/transactions/${transactionWithCallback.id}/callback`,
    {
      method: 'POST',
      headers: {
        'x-admin-key': ADMIN_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'standard',
        status: 'TEST_STATUS'
      })
    }
  );
  
  const callbackResult = await callbackResponse.json();
  
  console.log('\n📨 Результат отправки колбэка:');
  console.log('   URL:', callbackResult.url);
  console.log('   Payload:', JSON.stringify(callbackResult.payload, null, 2));
  
  // Проверяем наличие поля amount
  if (callbackResult.payload?.amount !== undefined) {
    console.log('   ✅ Поле amount присутствует:', callbackResult.payload.amount);
  } else {
    console.log('   ❌ Поле amount отсутствует!');
  }
  
  // Проверяем сохранение в историю
  if (callbackResult.callbackHistoryEntry) {
    console.log('\n✅ Колбэк сохранен в историю:');
    console.log('   ID записи:', callbackResult.callbackHistoryEntry.id);
    console.log('   Создан:', callbackResult.callbackHistoryEntry.createdAt);
  } else {
    console.log('\n❌ Колбэк не сохранен в историю');
  }
  
  // Проверяем историю колбэков
  console.log('\n📜 Проверяем историю колбэков...');
  const historyResponse = await fetch(
    `${API_URL}/admin/transactions/${transactionWithCallback.id}/callbacks`,
    {
      headers: {
        'x-admin-key': ADMIN_KEY
      }
    }
  );
  
  const historyData = await historyResponse.json();
  const recentCallbacks = historyData.callbackHistory?.slice(0, 3) || [];
  
  console.log(`   Найдено записей в истории: ${historyData.callbackHistory?.length || 0}`);
  
  if (recentCallbacks.length > 0) {
    console.log('\n   Последние колбэки:');
    recentCallbacks.forEach((cb: any, index: number) => {
      console.log(`   ${index + 1}. ${cb.createdAt}`);
      console.log(`      URL: ${cb.url}`);
      console.log(`      Status: ${cb.statusCode || 'N/A'}`);
      console.log(`      Payload amount: ${cb.payload?.amount || 'отсутствует'}`);
    });
  }
}

// Запускаем тест
testAdminCallback().catch(console.error);