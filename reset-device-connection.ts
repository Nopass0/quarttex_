import { db } from "./backend/src/db";

async function resetDeviceConnection() {
  const deviceId = "cmdddzxwp00e8ikgzcntjxeit"; // Device "123"
  
  console.log(`Resetting device ${deviceId} connection status...`);
  
  const updated = await db.device.update({
    where: { id: deviceId },
    data: {
      firstConnectionAt: null,
      isOnline: false,
      isWorking: false,
      lastActiveAt: null
    }
  });
  
  console.log("Device reset:", {
    id: updated.id,
    name: updated.name,
    firstConnectionAt: updated.firstConnectionAt,
    isOnline: updated.isOnline,
    isWorking: updated.isWorking
  });
  
  process.exit(0);
}

resetDeviceConnection().catch(console.error);