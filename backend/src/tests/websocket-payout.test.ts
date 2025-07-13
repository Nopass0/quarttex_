import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createTestMerchant, createTestTrader, cleanupTestData, createTestAdmin } from "./utils/test-helpers";
import { PayoutService } from "../services/payout.service";
import { db } from "../db";

const payoutService = PayoutService.getInstance();

describe("WebSocket Payout Tests", () => {
  let merchant: any;
  let trader: any;
  let admin: any;
  let merchantToken: string;
  let traderToken: string;
  let adminToken: string;
  
  beforeAll(async () => {
    await cleanupTestData();
    merchant = await createTestMerchant();
    trader = await createTestTrader();
    admin = await createTestAdmin();
    
    merchantToken = merchant.token;
    traderToken = trader.token || "test-trader-token";
    adminToken = "test-admin-token";
  });
  
  afterAll(async () => {
    await cleanupTestData();
  });
  
  describe("WebSocket Connection", () => {
    test("merchant should connect with valid token", async () => {
      const ws = new WebSocket(`ws://localhost:3000/api/ws/payouts?token=${merchantToken}&type=merchant`);
      
      await new Promise((resolve) => {
        ws.onopen = () => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          ws.close();
          resolve(null);
        };
      });
    });
    
    test("should reject invalid token", async () => {
      const ws = new WebSocket(`ws://localhost:3000/api/ws/payouts?token=invalid-token&type=merchant`);
      
      await new Promise((resolve) => {
        ws.onclose = (event) => {
          expect(event.code).toBe(1008); // Policy Violation
          resolve(null);
        };
      });
    });
  });
  
  describe("Payout Updates", () => {
    test("merchant should receive payout creation update", async () => {
      const ws = new WebSocket(`ws://localhost:3000/api/ws/payouts?token=${merchantToken}&type=merchant`);
      
      await new Promise((resolve) => {
        ws.onopen = async () => {
          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            expect(data.type).toBe("payout.created");
            expect(data.payout.amount).toBe(5000);
            ws.close();
            resolve(null);
          };
          
          // Create payout after WebSocket is connected
          await payoutService.createPayout({
            merchantId: merchant.id,
            amount: 5000,
            wallet: "41001234567890",
            bank: "SBER",
            isCard: true,
            merchantRate: 100,
          });
        };
      });
    });
    
    test("trader should receive payout acceptance update", async () => {
      // Create payout first
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 7000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      // Give trader balance
      await db.user.update({
        where: { id: trader.id },
        data: { payoutBalance: 10000 },
      });
      
      const ws = new WebSocket(`ws://localhost:3000/api/ws/payouts?token=${traderToken}&type=trader`);
      
      await new Promise((resolve) => {
        ws.onopen = async () => {
          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "payout.active") {
              expect(data.payout.status).toBe("ACTIVE");
              expect(data.payout.traderId).toBe(trader.id);
              ws.close();
              resolve(null);
            }
          };
          
          // Accept payout after WebSocket is connected
          await payoutService.acceptPayout(payout.id, trader.id);
        };
      });
    });
    
    test("admin should receive rate adjustment update", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 10000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
        direction: "OUT",
        rateDelta: 2,
        feePercent: 1,
      });
      
      const ws = new WebSocket(`ws://localhost:3000/api/ws/payouts?token=${adminToken}&type=admin`);
      
      await new Promise((resolve) => {
        ws.onopen = async () => {
          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "payout.rate_adjusted") {
              expect(data.payout.rateDelta).toBe(5);
              expect(data.payout.feePercent).toBe(2);
              expect(data.adjustment).toBeDefined();
              ws.close();
              resolve(null);
            }
          };
          
          // Adjust rate after WebSocket is connected
          await payoutService.adjustPayoutRate(payout.id, "admin-123", 5, 2);
        };
      });
    });
  });
  
  describe("Load Test", () => {
    test("should handle multiple concurrent connections", async () => {
      const connections = 10;
      const websockets: WebSocket[] = [];
      
      // Create multiple connections
      for (let i = 0; i < connections; i++) {
        const ws = new WebSocket(`ws://localhost:3000/api/ws/payouts?token=${merchantToken}&type=merchant`);
        websockets.push(ws);
      }
      
      // Wait for all to connect
      await Promise.all(
        websockets.map(
          (ws) =>
            new Promise((resolve) => {
              ws.onopen = () => resolve(null);
            })
        )
      );
      
      // All should be connected
      expect(websockets.every((ws) => ws.readyState === WebSocket.OPEN)).toBe(true);
      
      // Create payout and verify all receive update
      let receivedCount = 0;
      const messagePromises = websockets.map(
        (ws) =>
          new Promise((resolve) => {
            ws.onmessage = (event) => {
              const data = JSON.parse(event.data);
              if (data.type === "payout.created") {
                receivedCount++;
                resolve(null);
              }
            };
          })
      );
      
      await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 15000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      // Wait for all to receive
      await Promise.race([
        Promise.all(messagePromises),
        new Promise((resolve) => setTimeout(resolve, 5000)), // 5s timeout
      ]);
      
      expect(receivedCount).toBe(connections);
      
      // Close all connections
      websockets.forEach((ws) => ws.close());
    });
    
    test("should handle rapid message broadcasting", async () => {
      const ws = new WebSocket(`ws://localhost:3000/api/ws/payouts?token=${merchantToken}&type=merchant`);
      const messages: any[] = [];
      
      await new Promise((resolve) => {
        ws.onopen = async () => {
          ws.onmessage = (event) => {
            messages.push(JSON.parse(event.data));
          };
          
          // Create multiple payouts rapidly
          const payoutPromises = [];
          for (let i = 0; i < 20; i++) {
            payoutPromises.push(
              payoutService.createPayout({
                merchantId: merchant.id,
                amount: 1000 + i * 100,
                wallet: "41001234567890",
                bank: "SBER",
                isCard: true,
                merchantRate: 100,
              })
            );
          }
          
          await Promise.all(payoutPromises);
          
          // Wait a bit for all messages
          setTimeout(() => {
            expect(messages.length).toBe(20);
            expect(messages.every((m) => m.type === "payout.created")).toBe(true);
            ws.close();
            resolve(null);
          }, 1000);
        };
      });
    });
  });
});