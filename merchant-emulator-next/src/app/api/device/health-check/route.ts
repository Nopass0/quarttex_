import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-device-token')
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 })
    }
    
    const body = await request.json()
    const { batteryLevel } = body
    
    await prisma.device.updateMany({
      where: { token },
      data: { 
        lastHealthCheck: new Date(),
        batteryLevel: batteryLevel || 100
      }
    })
    
    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}