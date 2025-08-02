import { prisma } from '@/lib/prisma'

export class DeviceHealthService {
  private static instance: DeviceHealthService
  private intervalId: NodeJS.Timeout | null = null
  
  static getInstance(): DeviceHealthService {
    if (!DeviceHealthService.instance) {
      DeviceHealthService.instance = new DeviceHealthService()
    }
    return DeviceHealthService.instance
  }
  
  start() {
    if (this.intervalId) return
    
    this.intervalId = setInterval(async () => {
      try {
        const connectedDevices = await prisma.device.findMany({
          where: { isConnected: true }
        })
        
        const now = new Date()
        
        for (const device of connectedDevices) {
          await prisma.device.update({
            where: { id: device.id },
            data: {
              lastPing: now,
              lastHealthCheck: now
            }
          })
        }
      } catch (error) {
        console.error('Health check error:', error)
      }
    }, 20) // 20ms interval
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}