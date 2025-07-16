import { db } from "../db";

async function checkMethods() {
  try {
    const allMethods = await db.method.findMany();
    console.log(`Total methods in database: ${allMethods.length}`);
    
    console.log("\nAll methods:");
    for (const method of allMethods) {
      console.log(`- ${method.name} (${method.code}): enabled=${method.isEnabled}, id=${method.id}`);
    }

    // Check if the specific method exists
    const specificMethod = await db.method.findUnique({
      where: { id: "cmcxotrc10014qv01rgd4zlzo" }
    });
    
    if (specificMethod) {
      console.log("\nSpecific method found:");
      console.log(specificMethod);
    } else {
      console.log("\nSpecific method NOT found with ID: cmcxotrc10014qv01rgd4zlzo");
    }

  } catch (error) {
    console.error("Error checking methods:", error);
  } finally {
    await db.$disconnect();
  }
}

checkMethods();