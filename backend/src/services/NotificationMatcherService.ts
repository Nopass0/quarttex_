import { BaseService } from "./BaseService";
import { db } from "@/db";
import { Status, TransactionType } from "@prisma/client";
import { roundDown2 } from "@/utils/rounding";
import { sendTransactionCallbacks } from "@/utils/notify";

export class NotificationMatcherService extends BaseService {
  // Auto-start this service when the application starts
  public autoStart = true;
  
  constructor() {
    super({
      displayName: "NotificationMatcherService",
      description: "Matches bank notifications with transactions",
      interval: 100, // Run every 100ms
      autoStart: true
    });
  }

  async tick(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get unprocessed notifications
      const notifications = await db.notification.findMany({
        where: {
          isProcessed: false
          // We'll check notification content to determine if it's a bank notification
        },
        include: {
          Device: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: 50 // Process up to 50 notifications at a time
      });

      let processedCount = 0;
      
      for (const notification of notifications) {
        try {
          await this.processNotification(notification);
          processedCount++;
        } catch (error) {
          await this.logError('Failed to process notification', {
            notificationId: notification.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      const duration = Date.now() - startTime;
      if (processedCount > 0 || Math.random() < 0.01) { // Log occasionally even when no notifications
        await this.logInfo('NotificationMatcher tick completed', {
          processedCount,
          durationMs: duration
        });
      }
      
      // Log for debugging
      console.log(`[NotificationMatcherService] Processed ${processedCount} notifications in ${duration}ms`);
      
    } catch (error) {
      await this.logError('NotificationMatcher tick failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async processNotification(notification: any): Promise<void> {
    const { Device, message, title } = notification;

    if (!Device?.id) {
      await this.markNotificationProcessed(notification.id);
      return;
    }

    const combinedContent = [title, message].filter(Boolean).join(" ");
    const amounts = this.extractAmounts(combinedContent);

    if (amounts.length === 0) {
      await this.markNotificationProcessed(notification.id);
      return;
    }

    for (const amount of amounts) {
      const matchingTransaction = await this.findMatchingTransaction(Device.id, amount);
      if (matchingTransaction) {
        console.log(`[NotificationMatcherService] Found matching transaction:`, {
          notificationId: notification.id,
          transactionId: matchingTransaction.id,
          amount
        });
        await this.completeTransaction(matchingTransaction.id, notification.id, amount);
        return;
      }
    }

    await db.notification.update({
      where: { id: notification.id },
      data: { isProcessed: true }
    });
  }

  private extractAmounts(content: string): number[] {
    const amounts: number[] = [];
    const regex = /(\d+(?:[\s.,]\d{3})*(?:[.,]\d+)?)/g;
    for (const match of content.matchAll(regex)) {
      const amount = this.parseAmount(match[1]);
      if (amount > 0) amounts.push(amount);
    }
    return [...new Set(amounts)];
  }

  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    
    // Remove all spaces and replace comma with dot
    const cleaned = amountStr.replace(/\s+/g, '').replace(',', '.');
    const amount = parseFloat(cleaned);
    
    return isNaN(amount) ? 0 : roundDown2(amount);
  }

  private async findMatchingTransaction(deviceId: string, amount: number): Promise<any> {
    const tolerance = 1;
    return await db.transaction.findFirst({
      where: {
        type: TransactionType.IN,
        status: Status.IN_PROGRESS,
        amount: {
          gte: amount - tolerance,
          lte: amount + tolerance
        },
        requisites: {
          deviceId
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  private async completeTransaction(
    transactionId: string,
    notificationId: string,
    amount: number
  ): Promise<void> {
    // Get transaction details for callback
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId }
    });
    
    if (!transaction) {
      console.error(`[NotificationMatcherService] Transaction ${transactionId} not found for callback`);
      return;
    }

    await db.$transaction(async (tx) => {
      // Update transaction status and link to notification
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: Status.READY,
          matchedNotificationId: notificationId,
          acceptedAt: new Date() // Set acceptedAt when status becomes READY
        }
      });
      
      // Mark notification as processed
      await tx.notification.update({
        where: { id: notificationId },
        data: {
          isProcessed: true
        }
      });
      
      // Log the match
      await this.logInfo('Transaction matched with notification', {
        transactionId,
        notificationId,
        amount
      });
    });

    // Send callbacks after successful database update
    console.log(`[NotificationMatcherService] Sending callbacks for transaction ${transactionId}`);
    
    // Use unified callback function instead of direct fetch
    try {
      const updatedTransaction = await db.transaction.findUnique({
        where: { id: transactionId }
      });
      
      if (updatedTransaction) {
        await sendTransactionCallbacks(updatedTransaction, Status.READY);
        console.log(`[NotificationMatcherService] Callbacks sent successfully for transaction ${transactionId}`);
      }
    } catch (error) {
      console.error(`[NotificationMatcherService] Error sending callbacks:`, error);
    }
  }

  private async markNotificationProcessed(notificationId: string): Promise<void> {
    await db.notification.update({
      where: { id: notificationId },
      data: { isProcessed: true }
    });
  }
}