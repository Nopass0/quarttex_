import { Elysia } from "elysia";
import { db } from "@/db";

// Map to track WebSocket connections
const connections = new Map<string, { ws: WebSocket, userId: string, subscribedDevices: Set<string> }>();

// Broadcast device status to all connected clients
export async function broadcastDeviceStatus(deviceId: string, status: {
  isOnline: boolean;
  batteryLevel?: number;
  networkSpeed?: number;
}) {
  const message = JSON.stringify({
    type: "device-status",
    deviceId,
    isOnline: status.isOnline,
    batteryLevel: status.batteryLevel,
    networkSpeed: status.networkSpeed,
    timestamp: new Date().toISOString()
  });

  // Find device owner
  const device = await db.device.findUnique({
    where: { id: deviceId },
    include: { user: true }
  });

  if (!device) return;

  // Send to all connections that are subscribed to this device or belong to the device owner
  for (const [connId, conn] of connections) {
    if (conn.userId === device.userId || conn.subscribedDevices.has(deviceId)) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(message);
      }
    }
  }
}

// Broadcast bank details status changes
export async function broadcastBankDetailsStatus(deviceId: string, status: {
  disabled: boolean;
  count: number;
}) {
  const message = JSON.stringify({
    type: status.disabled ? "bank-details-disabled" : "bank-details-enabled",
    deviceId,
    [status.disabled ? "disabledCount" : "enabledCount"]: status.count,
    timestamp: new Date().toISOString()
  });

  // Find device owner
  const device = await db.device.findUnique({
    where: { id: deviceId },
    include: { user: true }
  });

  if (!device) return;

  // Send to all connections that belong to the device owner
  for (const [connId, conn] of connections) {
    if (conn.userId === device.userId) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(message);
      }
    }
  }
}

export const deviceStatusRoutes = new Elysia()
  .ws("/device-status", {
    async open(ws) {
      const connId = Math.random().toString(36).substring(7);
      console.log(`[DeviceStatus] WebSocket connection opened: ${connId}`);
      
      // Store connection temporarily without user ID
      connections.set(connId, { ws, userId: "", subscribedDevices: new Set() });

      // Send connection ID to client
      ws.send(JSON.stringify({ 
        type: "connected",
        connectionId: connId
      }));
    },

    async message(ws, message) {
      try {
        const data = JSON.parse(message.toString());
        const connId = Array.from(connections.entries())
          .find(([_, conn]) => conn.ws === ws)?.[0];

        if (!connId) return;

        const conn = connections.get(connId)!;

        switch (data.type) {
          case "auth":
            // Authenticate the connection using session token
            try {
              const token = data.token;
              
              // Find session by token
              const session = await db.session.findUnique({
                where: { token },
                include: { user: true }
              });

              if (session && session.user && new Date() < session.expiredAt) {
                conn.userId = session.user.id;
                console.log(`[DeviceStatus] Connection ${connId} authenticated as user ${session.user.id}`);
                
                // Send auth success
                ws.send(JSON.stringify({ 
                  type: "auth-success",
                  userId: session.user.id
                }));

                // Send initial status for all user's devices
                const devices = await db.device.findMany({
                  where: { userId: session.user.id }
                });

                for (const device of devices) {
                  ws.send(JSON.stringify({
                    type: "device-status",
                    deviceId: device.id,
                    isOnline: device.isOnline,
                    batteryLevel: device.energy,
                    networkSpeed: device.ethernetSpeed,
                    timestamp: new Date().toISOString()
                  }));
                }
              } else {
                throw new Error("Invalid or expired session");
              }
            } catch (error) {
              console.error(`[DeviceStatus] Auth error:`, error);
              ws.send(JSON.stringify({ 
                type: "auth-error",
                message: "Invalid or expired token"
              }));
            }
            break;

          case "subscribe-device":
            // Subscribe to specific device updates
            if (data.deviceId) {
              conn.subscribedDevices.add(data.deviceId);
              console.log(`[DeviceStatus] Connection ${connId} subscribed to device ${data.deviceId}`);
              
              // Send current device status
              const device = await db.device.findUnique({
                where: { id: data.deviceId }
              });

              if (device) {
                ws.send(JSON.stringify({
                  type: "device-status",
                  deviceId: device.id,
                  isOnline: device.isOnline,
                  batteryLevel: device.energy,
                  networkSpeed: device.ethernetSpeed,
                  timestamp: new Date().toISOString()
                }));
              }
            }
            break;

          case "unsubscribe-device":
            // Unsubscribe from device updates
            if (data.deviceId) {
              conn.subscribedDevices.delete(data.deviceId);
              console.log(`[DeviceStatus] Connection ${connId} unsubscribed from device ${data.deviceId}`);
            }
            break;
        }
      } catch (error) {
        console.error(`[DeviceStatus] Error processing message:`, error);
      }
    },

    async close(ws) {
      // Find and remove connection
      const connId = Array.from(connections.entries())
        .find(([_, conn]) => conn.ws === ws)?.[0];
      
      if (connId) {
        connections.delete(connId);
        console.log(`[DeviceStatus] WebSocket connection closed: ${connId}`);
      }
    }
  });