import { db } from '@/db'

async function checkMerchantMethods() {
  const testMerchant = await db.merchant.findFirst({
    where: { name: 'test' }
  })
  
  if (!testMerchant) {
    console.log('Test merchant not found')
    return
  }
  
  const merchantMethods = await db.merchantMethod.findMany({
    where: {
      merchantId: testMerchant.id,
      isEnabled: true
    },
    include: {
      method: true
    }
  })
  
  console.log('Test merchant active methods:')
  merchantMethods.forEach(mm => {
    console.log(`\nMethod: ${mm.method.name} (${mm.method.code})`)
    console.log(`  ID: ${mm.method.id}`)
    console.log(`  Type: ${mm.method.type}`)
    console.log(`  Currency: ${mm.method.currency}`)
    console.log(`  Enabled globally: ${mm.method.isEnabled}`)
  })
  
  await db.$disconnect()
}

checkMerchantMethods().catch(console.error)