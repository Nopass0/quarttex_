import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(devices)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const device = await prisma.device.create({
      data: {
        name: body.name,
        deviceKey: body.deviceKey
      }
    })
    return NextResponse.json(device)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}