import { Transaction } from "@prisma/client";

export interface CallbackPayload {
  id: string;
  amount: number; 
  status: string;
}

export class CallbackService {
  static async sendCallback(transaction: Transaction, status?: string): Promise<void> {
    const callbackUrl = transaction.callbackUri;
    
    if (!callbackUrl || callbackUrl === "none" || callbackUrl === "") {
      console.log(`[CallbackService] No callback URL for transaction ${transaction.id}`);
      return;
    }

    const payload: CallbackPayload = {
      id: transaction.id,
      amount: transaction.amount,
      status: status || transaction.status
    };

    try {
      console.log(`[CallbackService] Sending callback to ${callbackUrl} for transaction ${transaction.id}`);
      console.log(`[CallbackService] Payload:`, payload);

      const response = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Chase/1.0"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`[CallbackService] Callback failed with status ${response.status}`);
        console.error(`[CallbackService] Response:`, await response.text());
      } else {
        console.log(`[CallbackService] Callback sent successfully to ${callbackUrl}`);
        const responseData = await response.text();
        if (responseData) {
          console.log(`[CallbackService] Response:`, responseData);
        }
      }
    } catch (error) {
      console.error(`[CallbackService] Error sending callback:`, error);
    }
  }

  static async sendTestCallback(transactionId: string, amount: number, status: string, callbackUrl: string): Promise<void> {
    const payload: CallbackPayload = {
      id: transactionId,
      amount: amount,
      status: status
    };

    try {
      console.log(`[CallbackService] Sending TEST callback to ${callbackUrl}`);
      console.log(`[CallbackService] Payload:`, payload);

      const response = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Chase/1.0 (Test)"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`[CallbackService] TEST callback failed with status ${response.status}`);
        console.error(`[CallbackService] Response:`, await response.text());
      } else {
        console.log(`[CallbackService] TEST callback sent successfully`);
        const responseData = await response.text();
        if (responseData) {
          console.log(`[CallbackService] Response:`, responseData);
        }
      }
    } catch (error) {
      console.error(`[CallbackService] Error sending TEST callback:`, error);
    }
  }
}