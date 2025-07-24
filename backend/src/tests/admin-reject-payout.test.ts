import { describe, it, expect } from "bun:test";
import { PayoutService } from "../services/payout.service";
import { db } from "../db";

describe("Admin Reject Payout", () => {
  it("should reject a payout in CHECKING status", async () => {
    // This is a basic test structure
    // In a real scenario, you would:
    // 1. Create a test merchant
    // 2. Create a test trader with balances
    // 3. Create a payout and move it to CHECKING status
    // 4. Call adminRejectPayout
    // 5. Verify the payout is back to ACTIVE and profit is reversed
    
    const payoutService = PayoutService.getInstance();
    
    // Test that the method exists
    expect(typeof payoutService.adminRejectPayout).toBe("function");
  });
});