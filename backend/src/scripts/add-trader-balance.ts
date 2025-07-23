import { db } from "../db";

async function main() {
  const traderEmail = process.argv[2] || "trader@test.com";
  const amountRub = parseFloat(process.argv[3] || "100000");
  
  console.log(`Adding ${amountRub} RUB to trader ${traderEmail}`);
  
  const trader = await db.user.findUnique({
    where: { email: traderEmail },
  });
  
  if (!trader) {
    console.error("Trader not found");
    process.exit(1);
  }
  
  console.log("Current balances:", {
    balanceRub: trader.balanceRub,
    frozenRub: trader.frozenRub,
    balanceUsdt: trader.balanceUsdt,
    frozenUsdt: trader.frozenUsdt,
  });
  
  const updated = await db.user.update({
    where: { id: trader.id },
    data: { balanceRub: trader.balanceRub + amountRub },
  });
  
  console.log("Updated balances:", {
    balanceRub: updated.balanceRub,
    frozenRub: updated.frozenRub,
    balanceUsdt: updated.balanceUsdt,
    frozenUsdt: updated.frozenUsdt,
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());