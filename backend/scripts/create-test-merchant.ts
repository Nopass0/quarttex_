import { db } from "../src/db";
import bcrypt from "bcrypt";

async function main() {
  try {
    // Check if merchant exists
    let merchant = await db.user.findFirst({
      where: { email: "merchant@test.com" }
    });

    if (!merchant) {
      // Create merchant
      const hashedPassword = await bcrypt.hash("password123", 10);
      merchant = await db.user.create({
        data: {
          email: "merchant@test.com",
          password: hashedPassword,
          name: "Test Merchant",
          balanceUsdt: 10000,
          balanceRub: 1000000,
        }
      });
      console.log("✅ Created merchant:", merchant.email);
    } else {
      console.log("✅ Merchant already exists:", merchant.email);
    }

    // Now run the payout creation
    console.log("Now creating test payouts...");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();