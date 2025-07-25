import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function createTestSession() {
  try {
    // Find or create test trader
    const trader = await prisma.user.findUnique({
      where: { email: 'trader@test.com' }
    })
    
    if (!trader) {
      console.log('No trader found')
      return
    }
    
    console.log('Found trader:', trader.email, trader.id)
    
    // Create session token
    const token = randomBytes(32).toString('hex')
    
    const session = await prisma.session.create({
      data: {
        token,
        ip: 'test',
        userId: trader.id,
        expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 дней
      }
    })
    
    console.log('Created session token:', token)
    
    // Test the profile endpoint
    const response = await fetch('http://localhost:3000/api/trader/profile', {
      headers: {
        'x-trader-token': token,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    console.log('Profile response:', data)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestSession()