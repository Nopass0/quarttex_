import { Elysia, t } from "elysia";
import { db } from "@/db";

export const deviceHealthRoutes = new Elysia({ prefix: "/device" })
  // Health check endpoint that only requires device token
  .post(
    "/health-check",
    async ({ body, headers }) => {
      const deviceToken = headers['x-device-token'];
      
      if (!deviceToken) {
        return new Response(JSON.stringify({ error: "Device token required" }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const device = await db.device.findFirst({
        where: { token: deviceToken }
      });
      
      if (!device) {
        return new Response(JSON.stringify({ error: "Invalid device token" }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Update device status
      await db.device.update({
        where: { id: device.id },
        data: {
          updatedAt: new Date(),
          isOnline: true,
          energy: body.batteryLevel,
          ethernetSpeed: body.networkSpeed,
          lastActiveAt: new Date()
        }
      });
      
      // Create health check log notification
      await db.notification.create({
        data: {
          type: 'HEALTH_CHECK',
          title: 'Health Check',
          message: `Device health check: battery ${body.batteryLevel}%, network ${body.networkSpeed} Mbps`,
          deviceId: device.id,
          metadata: {
            batteryLevel: body.batteryLevel,
            networkSpeed: body.networkSpeed,
            timestamp: new Date().toISOString()
          },
          isRead: true // Auto-mark as read since it's just a log
        }
      });
      
      console.log(`[Device Health] Health check received from device ${device.name} (${device.id})`);
      
      return { 
        success: true,
        message: "Health check received",
        device: {
          id: device.id,
          name: device.name,
          isOnline: true
        }
      };
    },
    {
      body: t.Object({
        batteryLevel: t.Number({ minimum: 0, maximum: 100 }),
        networkSpeed: t.Number({ minimum: 0 })
      }),
      detail: {
        tags: ["device"],
        summary: "Device health check",
        description: "Updates device status and metrics. Requires x-device-token header."
      }
    }
  );