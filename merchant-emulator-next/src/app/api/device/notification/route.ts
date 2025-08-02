import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 })
    }
    
    const token = authorization.replace('Bearer ', '')
    const body = await request.json()
    
    // Find device by token
    const device = await prisma.device.findFirst({
      where: { token }
    })
    
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }
    
    // Extract amount from content
    const amountMatch = body.content.match(/\+?([\d,\.]+)\s*₽/)
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0
    
    // Save notification
    await prisma.notification.create({
      data: {
        deviceId: device.id,
        message: body.content,
        amount
      }
    })
    
    console.log(`Notification sent to device ${device.name}: ${body.content}`)
    
    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}