import { db } from "./backend/src/db";

async function forceDeviceConnected() {
  const deviceId = process.argv[2];
  
  if (!deviceId) {
    console.log("Usage: bun force-device-connected.ts <device-id>");
    console.log("\nAvailable devices:");
    const devices = await db.device.findMany({
      select: { id: true, name: true, firstConnectionAt: true }
    });
    devices.forEach(d => {
      console.log(`- ${d.id} (${d.name}) - firstConnectionAt: ${d.firstConnectionAt}`);
    });
    process.exit(1);
  }
  
  console.log(`Force marking device ${deviceId} as connected...`);
  
  const updated = await db.device.update({
    where: { id: deviceId },
    data: {
      firstConnectionAt: new Date(),
      isOnline: true,
      lastActiveAt: new Date()
    }
  });
  
  console.log("Device updated:", {
    id: updated.id,
    name: updated.name,
    firstConnectionAt: updated.firstConnectionAt,
    isOnline: updated.isOnline
  });
  
  process.exit(0);
}

forceDeviceConnected().catch(console.error);