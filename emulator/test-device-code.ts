import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestBankDetail() {
  try {
    // Create test user
    const user = await prisma.user.create({
      data: {
        login: `test_trader_${Date.now()}`,
        name: 'Test Trader for Emulator',
        password: '$2b$10$YourHashedPasswordHere', // This would be hashed in real app
        role: 'TRADER',
      },
    });

    // Create trader
    const trader = await prisma.trader.create({
      data: {
        userId: user.id,
        isActive: true,
      },
    });

    // Create bank detail
    const bankDetail = await prisma.bankDetail.create({
      data: {
        traderId: trader.id,
        bank: 'Сбербанк',
        phone: '+79001234567',
        cardNumber: '4111111111111111',
        enabled: true,
      },
    });

    console.log('\n=== Test Device Code Created ===');
    console.log(`Device Code: ${bankDetail.id}`);
    console.log('Bank: Сбербанк');
    console.log('Status: Ready to connect');
    console.log('\nUse this code in the emulator to connect the device.\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createTestBankDetail();