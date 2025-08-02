import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiClient } from '@/lib/api-client'

let intervalId: NodeJS.Timeout | null = null

async function generateTransaction(merchant: any) {
  const activeDevices = await prisma.device.findMany({
    where: {
      isConnected: true,
      isActive: true
    }
  })
  
  if (activeDevices.length === 0) return
  
  const amount = Math.floor(
    Math.random() * (merchant.maxAmount - merchant.minAmount) + merchant.minAmount
  )
  
  const externalId = `EMU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Create transaction in local DB
  const transaction = await prisma.transaction.create({
    data: {
      merchantId: merchant.id,
      externalId,
      amount,
      currency: 'RUB',
      status: 'pending'
    }
  })
  
  // Call merchant API to create transaction
  const response = await ApiClient.merchantRequest(
    '/transactions/create',
    {
      method: 'POST',
      merchantApiKey: merchant.apiKey,
      transactionId: transaction.id,
      body: JSON.stringify({
        orderId: externalId,
        amount: amount,
        currency: 'RUB',
        successUri: 'https://example.com/success',
        failUri: 'https://example.com/fail',
        callbackUri: `http://localhost:3005/api/callback/${transaction.id}`,
        type: 'IN',
        userIp: '127.0.0.1',
        userId: 'test_user',
        clientName: 'Test Client'
      })
    }
  )
  
  if (response.success) {
    // Simulate liquidity-based processing
    const shouldProcess = Math.random() < merchant.liquidity
    
    if (shouldProcess && activeDevices.length > 0) {
      // Select random device
      const device = activeDevices[Math.floor(Math.random() * activeDevices.length)]
      
      // Process with delay
      setTimeout(async () => {
        // Create notification
        await processNotification(transaction.id, device.id)
      }, Math.random() * 3000 + 1000) // 1-4 seconds delay
    }
  }
}

async function processNotification(transactionId: string, deviceId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId }
  })
  
  if (!transaction) return
  
  const device = await prisma.device.findUnique({
    where: { id: deviceId }
  })
  
  if (!device || !device.token) return
  
  // Get random bank for notification
  const banks = ['sberbank', 'tinkoff', 'alfabank', 'vtb']
  const bank = banks[Math.floor(Math.random() * banks.length)]
  const bankNames: Record<string, string> = {
    'sberbank': 'Сбербанк',
    'tinkoff': 'Тинькофф',
    'alfabank': 'Альфа-Банк',
    'vtb': 'ВТБ'
  }
  
  const cardLast4 = Math.floor(1000 + Math.random() * 9000).toString()
  
  // Create notification request
  const notification = {
    packageName: `com.${bank}.app`,
    appName: bankNames[bank],
    title: `${bankNames[bank]} Online`,
    content: `Пополнение +${transaction.amount.toFixed(2)} ₽\nКарта *${cardLast4}`,
    timestamp: Date.now(),
    priority: 2,
    category: 'transaction'
  }
  
  // Send notification via API
  try {
    const response = await fetch('http://localhost:3005/api/device/notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${device.token}`
      },
      body: JSON.stringify(notification)
    })
    
    if (response.ok) {
      console.log(`Notification sent to device ${device.name}: ${notification.content}`)
    }
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
  
  // Update transaction
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      deviceId,
      status: 'processing'
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { action, merchantId } = await request.json()
    
    if (action === 'start') {
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId }
      })
      
      if (!merchant) {
        return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
      }
      
      if (intervalId) {
        clearInterval(intervalId)
      }
      
      intervalId = setInterval(async () => {
        try {
          await generateTransaction(merchant)
        } catch (error) {
          console.error('Traffic generation error:', error)
        }
      }, 5000) // Generate transaction every 5 seconds
      
    } else if (action === 'stop') {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}