import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-device-token')
    
    if (token) {
      await prisma.device.updateMany({
        where: { token },
        data: { lastPing: new Date() }
      })
    }
    
    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}