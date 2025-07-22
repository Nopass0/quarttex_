import { db } from "./backend/src/db";

async function checkDevices() {
  const devices = await db.device.findMany({
    select: {
      id: true,
      name: true,
      token: true,
      isOnline: true,
      isWorking: true,
      firstConnectionAt: true,
      user: {
        select: {
          email: true,
        }
      }
    }
  });
  
  console.log("=== All Devices ===");
  devices.forEach(device => {
    console.log({
      id: device.id,
      name: device.name,
      token: device.token?.substring(0, 10) + "...",
      isOnline: device.isOnline,
      isWorking: device.isWorking,
      firstConnectionAt: device.firstConnectionAt,
      userEmail: device.user.email
    });
  });
  
  console.log("\n=== Devices without firstConnectionAt ===");
  const devicesWithoutFirst = devices.filter(d => !d.firstConnectionAt);
  console.log(`Found ${devicesWithoutFirst.length} devices without firstConnectionAt`);
  devicesWithoutFirst.forEach(device => {
    console.log(`- ${device.name} (${device.id})`);
  });
  
  process.exit(0);
}

checkDevices().catch(console.error);