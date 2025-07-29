import { db } from "../backend/src/db";

async function debugTransactions() {
  try {
    // Найдем устройство
    const device = await db.device.findFirst({
      where: {
        id: "cmdn0i91l06o7ikcqim2zflxm"
      },
      include: {
        bankDetails: true,
        user: true
      }
    });

    console.log("\n=== Device Info ===");
    console.log("Device ID:", device?.id);
    console.log("User ID:", device?.userId);
    console.log("Bank Details:", device?.bankDetails.map(bd => ({
      id: bd.id,
      bank: bd.bankType,
      userId: bd.userId
    })));

    // Найдем все транзакции для этого трейдера
    const transactions = await db.transaction.findMany({
      where: {
        traderId: device?.userId,
        type: "IN",
        status: {
          in: ["CREATED", "IN_PROGRESS"]
        }
      },
      include: {
        requisites: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log("\n=== Active Transactions ===");
    transactions.forEach(tx => {
      console.log({
        id: tx.id,
        amount: tx.amount,
        status: tx.status,
        type: tx.type,
        bankDetailId: tx.bankDetailId,
        traderId: tx.traderId,
        createdAt: tx.createdAt
      });
    });

    // Проверим есть ли транзакция на 5982
    const targetTx = await db.transaction.findFirst({
      where: {
        amount: 5982,
        type: "IN"
      }
    });

    console.log("\n=== Transaction 5982 ===");
    console.log(targetTx ? {
      id: targetTx.id,
      amount: targetTx.amount,
      status: targetTx.status,
      traderId: targetTx.traderId,
      bankDetailId: targetTx.bankDetailId
    } : "Not found");

    // Проверим к какому устройству привязан bankDetail транзакции
    if (targetTx) {
      const txBankDetail = await db.bankDetail.findUnique({
        where: { id: targetTx.bankDetailId! },
        include: { device: true }
      });
      
      console.log("\n=== Transaction BankDetail ===");
      console.log({
        bankDetailId: txBankDetail?.id,
        deviceId: txBankDetail?.deviceId,
        device: txBankDetail?.device,
        userId: txBankDetail?.userId,
        bankType: txBankDetail?.bankType
      });

      // Найдем все реквизиты этого трейдера
      console.log("\n=== All Trader BankDetails ===");
      const allBankDetails = await db.bankDetail.findMany({
        where: {
          userId: device?.userId
        },
        include: {
          device: true
        }
      });

      allBankDetails.forEach(bd => {
        console.log({
          id: bd.id,
          bank: bd.bankType,
          deviceId: bd.deviceId,
          hasDevice: !!bd.device
        });
      });
    }

    await db.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await db.$disconnect();
  }
}

debugTransactions();