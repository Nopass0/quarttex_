import { prisma } from '@/lib/prisma'
import { ApiClient } from '@/lib/api-client'
import { NotificationService } from './notification.service'

export class TrafficGeneratorService {
  private static instance: TrafficGeneratorService
  private intervalId: NodeJS.Timeout | null = null
  private notificationService = NotificationService.getInstance()
  
  static getInstance(): TrafficGeneratorService {
    if (!TrafficGeneratorService.instance) {
      TrafficGeneratorService.instance = new TrafficGeneratorService()
    }
    return TrafficGeneratorService.instance
  }
  
  async start(merchantId: string) {
    if (this.intervalId) return
    
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    })
    
    if (!merchant) return
    
    this.intervalId = setInterval(async () => {
      try {
        await this.generateTransaction(merchant)
      } catch (error) {
        console.error('Traffic generation error:', error)
      }
    }, 5000) // Generate transaction every 5 seconds
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
  
  async generateTransaction(merchant: any) {
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
      '/merchant/transactions',
      {
        method: 'POST',
        merchantApiKey: merchant.apiKey,
        transactionId: transaction.id,
        body: JSON.stringify({
          externalId,
          amount,
          currency: 'RUB',
          callbackUrl: `http://localhost:3005/api/callback/${transaction.id}`
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
          await this.notificationService.processTransaction(transaction.id, device.id)
        }, Math.random() * 3000 + 1000) // 1-4 seconds delay
      }
    }
  }
  
  async generateSingleTransaction(merchantId: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    })
    
    if (!merchant) throw new Error('Merchant not found')
    
    await this.generateTransaction(merchant)
  }
}