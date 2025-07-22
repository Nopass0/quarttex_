import { db } from "./backend/src/db";

async function testDeviceConnection() {
  // Get a device to test with
  const device = await db.device.findFirst({
    where: {
      token: { not: null }
    }
  });
  
  if (!device) {
    console.log("No devices found");
    return;
  }
  
  console.log("Testing device:", {
    id: device.id,
    name: device.name,
    token: device.token?.substring(0, 10) + "...",
    firstConnectionAt: device.firstConnectionAt,
    isOnline: device.isOnline
  });
  
  // Simulate device connection by setting firstConnectionAt
  console.log("\nSimulating device connection...");
  const updated = await db.device.update({
    where: { id: device.id },
    data: {
      firstConnectionAt: new Date(),
      isOnline: true,
      lastActiveAt: new Date()
    }
  });
  
  console.log("\nDevice after connection:", {
    id: updated.id,
    name: updated.name,
    firstConnectionAt: updated.firstConnectionAt,
    isOnline: updated.isOnline
  });
  
  // Now fetch device again as API would
  const deviceAfter = await db.device.findUnique({
    where: { id: device.id }
  });
  
  console.log("\nDevice fetched again:", {
    id: deviceAfter?.id,
    name: deviceAfter?.name,
    firstConnectionAt: deviceAfter?.firstConnectionAt,
    isOnline: deviceAfter?.isOnline
  });
  
  process.exit(0);
}

testDeviceConnection().catch(console.error);