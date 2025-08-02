import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET() {
  try {
    const merchants = await prisma.merchant.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(merchants)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const apiKey = `emulator_${crypto.randomBytes(16).toString('hex')}`
    const apiSecret = crypto.randomBytes(32).toString('hex')
    
    const merchant = await prisma.merchant.create({
      data: {
        name: body.name,
        apiKey,
        apiSecret,
        liquidity: body.liquidity || 0.7,
        minAmount: body.minAmount || 100,
        maxAmount: body.maxAmount || 100000
      }
    })
    return NextResponse.json(merchant)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}