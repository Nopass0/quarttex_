import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { action, deviceIds } = await request.json()
    
    switch (action) {
      case 'connect':
        await prisma.device.updateMany({
          where: deviceIds ? { id: { in: deviceIds } } : {},
          data: { isConnected: true }
        })
        break
      
      case 'disconnect':
        await prisma.device.updateMany({
          where: deviceIds ? { id: { in: deviceIds } } : {},
          data: { isConnected: false }
        })
        break
        
      case 'activate':
        await prisma.device.updateMany({
          where: deviceIds ? { id: { in: deviceIds } } : {},
          data: { isActive: true }
        })
        break
        
      case 'deactivate':
        await prisma.device.updateMany({
          where: deviceIds ? { id: { in: deviceIds } } : {},
          data: { isActive: false }
        })
        break
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}