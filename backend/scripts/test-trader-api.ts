import axios from 'axios'
import { createHash } from 'crypto'

const API_URL = 'http://localhost:3000/api'

async function getTraderToken(email: string, password: string): Promise<string | null> {
  try {
    const response = await axios.post(`${API_URL}/user/auth`, {
      email,
      password
    })
    return response.data.token
  } catch (error: any) {
    console.error('Login failed:', error.response?.data || error.message)
    return null
  }
}

async function testTraderAPI() {
  // Получаем токен
  const token = await getTraderToken('trader@test.com', 'd2483abb1fd002ae')
  
  if (!token) {
    console.error('Failed to get trader token')
    return
  }

  console.log('✓ Получен токен трейдера')

  // Тестируем профиль
  try {
    const profileResponse = await axios.get(`${API_URL}/trader/profile`, {
      headers: { 'x-trader-token': token }
    })
    console.log('\n=== ПРОФИЛЬ ТРЕЙДЕРА ===')
    console.log('Имя:', profileResponse.data.name)
    console.log('Email:', profileResponse.data.email)
    console.log('Баланс USDT:', profileResponse.data.balanceUsdt)
    console.log('Заморожено USDT:', profileResponse.data.frozenUsdt)
    console.log('Trust Balance:', profileResponse.data.trustBalance)
  } catch (error: any) {
    console.error('Profile error:', error.response?.data || error.message)
  }

  // Тестируем транзакции
  try {
    const txResponse = await axios.get(`${API_URL}/trader/transactions`, {
      headers: { 'x-trader-token': token }
    })
    console.log('\n=== ТРАНЗАКЦИИ ===')
    console.log('Всего транзакций:', txResponse.data.pagination?.total || 0)
    console.log('Получено транзакций:', txResponse.data.data?.length || 0)
    
    if (txResponse.data.data && txResponse.data.data.length > 0) {
      console.log('\nПервые 5 транзакций:')
      txResponse.data.data.slice(0, 5).forEach((tx: any) => {
        console.log(`\nID: ${tx.id}`)
        console.log(`  Сумма: ${tx.amount} RUB`)
        console.log(`  Статус: ${tx.status}`)
        console.log(`  Мерчант: ${tx.merchant?.name || 'N/A'}`)
        console.log(`  Клиент: ${tx.clientName}`)
        console.log(`  Создана: ${tx.createdAt}`)
      })
    }
  } catch (error: any) {
    console.error('Transactions error:', error.response?.data || error.message)
  }
}

testTraderAPI()