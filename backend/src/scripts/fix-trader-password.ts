import { db } from "../db";
import { createHash } from "crypto";

async function fixTraderPassword() {
  const trader = await db.user.findFirst({
    where: { email: "trader@example.com" }
  });
  
  if (!trader) {
    console.log("Trader not found");
    return;
  }
  
  // Hash the password with SHA256
  const passwordHash = createHash("sha256").update("Trader123!").digest("hex");
  
  await db.user.update({
    where: { id: trader.id },
    data: { password: passwordHash }
  });
  
  console.log("Fixed trader password hash");
}

fixTraderPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });