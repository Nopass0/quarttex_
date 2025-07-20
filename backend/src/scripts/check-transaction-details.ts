import { db } from "../db"

async function main() {
  // Get the most recent transaction
  const tx = await db.transaction.findFirst({
    where: {
      type: 'IN',
      status: 'IN_PROGRESS'
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      trader: true,
      requisites: {
        include: {
          user: true
        }
      }
    }
  })

  if (!tx) {
    console.log('No IN_PROGRESS transaction found')
    return
  }

  console.log('Transaction details:')
  console.log('ID:', tx.id)
  console.log('Amount:', tx.amount, 'RUB')
  console.log('Rate:', tx.rate)
  console.log('Adjusted Rate:', tx.adjustedRate)
  console.log('KKK Percent:', tx.kkkPercent)
  console.log('Fee In Percent:', tx.feeInPercent)
  console.log('Frozen USDT Amount:', tx.frozenUsdtAmount)
  console.log('Calculated Commission:', tx.calculatedCommission)
  console.log('\nTrader:')
  console.log('ID:', tx.trader?.id)
  console.log('Name:', tx.trader?.name)
  console.log('Trust Balance:', tx.trader?.trustBalance)
  console.log('Frozen USDT:', tx.trader?.frozenUsdt)
  console.log('\nRequisites:')
  console.log('Has requisites:', !!tx.requisites)
  console.log('Requisites user ID:', tx.requisites?.userId)
  console.log('Requisites has user object:', !!tx.requisites?.user)

  // Check if this is the transaction we just created
  if (tx.orderId?.startsWith('TEST_DEBUG_')) {
    console.log('\nThis is our test transaction!')
    
    // Let's trace why freezing might not have happened
    const hasFreezingParams = tx.frozenUsdtAmount !== null && tx.frozenUsdtAmount > 0
    const hasUser = !!tx.requisites?.user
    
    console.log('\nFreezing conditions:')
    console.log('Has freezingParams (frozenUsdtAmount > 0):', hasFreezingParams)
    console.log('Has chosen.user:', hasUser)
    console.log('Should have frozen:', hasFreezingParams && hasUser)
  }

  await db.$disconnect()
}

main().catch(console.error)