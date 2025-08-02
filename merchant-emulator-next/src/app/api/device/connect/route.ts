import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceCode, batteryLevel, networkInfo, deviceModel, androidVersion, appVersion } = body
    
    // Find device by code
    const device = await prisma.device.findUnique({
      where: { deviceKey: deviceCode }
    })
    
    if (!device) {
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Устройство не найдено',
          token: null
        },
        { status: 404 }
      )
    }
    
    // Generate token for device
    const token = `device_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Update device with connection info
    await prisma.device.update({
      where: { id: device.id },
      data: {
        token,
        isConnected: true,
        batteryLevel: batteryLevel || 100,
        networkInfo: networkInfo || 'Wi-Fi',
        deviceModel: deviceModel || 'Xiaomi Redmi Note 10',
        androidVersion: androidVersion || '13',
        appVersion: appVersion || '1.0.0',
        lastPing: new Date()
      }
    })
    
    return NextResponse.json({
      status: 'success',
      message: 'Устройство успешно подключено',
      token
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: 'error',
        message: error.message,
        token: null
      },
      { status: 500 }
    )
  }
}