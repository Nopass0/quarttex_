import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

let intervalId: NodeJS.Timeout | null = null

export async function POST() {
  try {
    // Start health check interval
    if (intervalId) {
      clearInterval(intervalId)
    }
    
    intervalId = setInterval(async () => {
      try {
        const connectedDevices = await prisma.device.findMany({
          where: { 
            isConnected: true,
            token: { not: null }
          }
        })
        
        for (const device of connectedDevices) {
          if (!device.token) continue
          
          // Send ping to device
          try {
            await fetch('http://localhost:3005/api/device/ping', {
              method: 'GET',
              headers: {
                'x-device-token': device.token
              }
            })
          } catch (error) {
            console.error(`Failed to ping device ${device.name}:`, error)
          }
        }
      } catch (error) {
        console.error('Health check error:', error)
      }
    }, 20) // 20ms interval
    
    return NextResponse.json({ success: true, message: 'Health check started' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  return NextResponse.json({ success: true, message: 'Health check stopped' })
}