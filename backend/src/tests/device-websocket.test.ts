import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../index";
import { db } from "@/db";
import WebSocket from "ws";

describe("Device WebSocket firstConnectionAt", () => {
  let deviceToken: string;
  let deviceId: string;
  let traderId: string;
  let server: any;
  
  beforeAll(async () => {
    // Start the server
    server = app.listen(3001);
    console.log("Server started on port 3001");
    
    // Wait for server to be ready
    await new Promise(r => setTimeout(r, 1000));
    
    // Create a trader first
    const trader = await db.user.create({
      data: {
        email: `test-trader-${Date.now()}@test.com`,
        password: "$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNOFWu", // "password123"
        name: "Test Trader",
        balanceUsdt: 0,
        balanceRub: 0,
      }
    });
    traderId = trader.id;
    
    // Create a device without firstConnectionAt
    const device = await db.device.create({
      data: {
        name: "Test Device",
        token: `test-token-${Date.now()}`,
        userId: traderId,
        isOnline: false,
        isWorking: false,
        // firstConnectionAt is null by default
      }
    });
    
    deviceToken = device.token!;
    deviceId = device.id;
    console.log(`Created device ${deviceId} with token ${deviceToken}`);
  });
  
  afterAll(async () => {
    // Cleanup
    await db.device.deleteMany({ where: { userId: traderId } });
    await db.user.delete({ where: { id: traderId } });
    
    // Stop the server
    if (server) {
      server.stop();
      console.log("Server stopped");
    }
  });
  
  it("should set firstConnectionAt on first WebSocket ping", async () => {
    // Verify device doesn't have firstConnectionAt
    const deviceBefore = await db.device.findUnique({ where: { id: deviceId } });
    expect(deviceBefore?.firstConnectionAt).toBeNull();
    
    // Connect to WebSocket with error handling
    const ws = new WebSocket("ws://localhost:3001/ws/device-ping", {
      handshakeTimeout: 5000
    });
    
    await new Promise<void>((resolve, reject) => {
      ws.on("open", async () => {
        console.log("WebSocket connected, sending ping...");
        
        // Send ping message
        ws.send(JSON.stringify({
          type: "ping",
          deviceToken: deviceToken,
          batteryLevel: 85,
          networkSpeed: 100
        }));
        
        // Wait for pong response
        ws.on("message", async (data) => {
          const response = JSON.parse(data.toString());
          console.log("Received response:", response);
          
          if (response.type === "pong") {
            // Wait a bit for database update
            await new Promise(r => setTimeout(r, 100));
            
            // Check if firstConnectionAt was set
            const deviceAfter = await db.device.findUnique({ 
              where: { id: deviceId } 
            });
            
            console.log("Device after ping:", {
              id: deviceAfter?.id,
              firstConnectionAt: deviceAfter?.firstConnectionAt,
              isOnline: deviceAfter?.isOnline
            });
            
            expect(deviceAfter?.firstConnectionAt).not.toBeNull();
            expect(deviceAfter?.isOnline).toBe(true);
            
            ws.close();
            resolve();
          }
        });
      });
      
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      });
    });
  }, 10000); // 10 second timeout
});