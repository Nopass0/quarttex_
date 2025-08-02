import { prisma } from '@/lib/prisma'
import { ApiClient } from '@/lib/api-client'

interface NotificationTemplate {
  bankName: string
  pattern: RegExp
  amountExtractor: (match: RegExpMatchArray) => number
}

export class NotificationService {
  private static instance: NotificationService
  
  // Templates based on the main service
  private templates: NotificationTemplate[] = [
    {
      bankName: 'Сбербанк',
      pattern: /Перевод (\d+(?:\.\d{2})?)р\. от (.+)/,
      amountExtractor: (match) => parseFloat(match[1])
    },
    {
      bankName: 'Тинькофф',
      pattern: /Пополнение\. Счет \*\d+\. (\d+(?:\.\d{2})?) ₽/,
      amountExtractor: (match) => parseFloat(match[1])
    },
    {
      bankName: 'Альфа-Банк',
      pattern: /Зачисление (\d+(?:\.\d{2})?) RUB/,
      amountExtractor: (match) => parseFloat(match[1])
    },
    {
      bankName: 'ВТБ',
      pattern: /Поступление (\d+(?:\.\d{2})?) руб/,
      amountExtractor: (match) => parseFloat(match[1])
    }
  ]
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }
  
  async createNotification(deviceId: string, bankName: string, amount: number) {
    const template = this.templates.find(t => t.bankName === bankName)
    if (!template) return null
    
    let message = ''
    switch (bankName) {
      case 'Сбербанк':
        message = `Перевод ${amount}р. от Иван И.`
        break
      case 'Тинькофф':
        message = `Пополнение. Счет *1234. ${amount} ₽`
        break
      case 'Альфа-Банк':
        message = `Зачисление ${amount} RUB`
        break
      case 'ВТБ':
        message = `Поступление ${amount} руб`
        break
    }
    
    const notification = await prisma.notification.create({
      data: {
        deviceId,
        bankName,
        message,
        amount
      }
    })
    
    // Send to device via API
    const device = await prisma.device.findUnique({
      where: { id: deviceId }
    })
    
    if (device) {
      await ApiClient.merchantRequest('/trader/devices/notification', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: device.phone,
          notification: {
            bankName,
            message,
            amount
          }
        })
      })
    }
    
    return notification
  }
  
  async processTransaction(transactionId: string, deviceId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    })
    
    if (!transaction) return
    
    const device = await prisma.device.findUnique({
      where: { id: deviceId }
    })
    
    if (!device) return
    
    // Create notification for the device
    await this.createNotification(deviceId, device.bankName, transaction.amount)
    
    // Update transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        deviceId,
        status: 'processing'
      }
    })
  }
}