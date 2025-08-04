import { BaseService } from "./BaseService";
import { db } from "@/db";
import { Status, TransactionType, NotificationType } from "@prisma/client";
import { roundDown2 } from "@/utils/rounding";
import { BANK_PATTERNS, getBankTypeFromPattern, type BankPattern } from "./bank-patterns";
import { sendTransactionCallbacks } from "@/utils/notify";

interface ParsedNotification {
  amount?: number;
  balance?: number;
  card?: string;
  senderName?: string;
  bankType?: string;
}

export class NotificationMatcherService extends BaseService {
  // Auto-start this service when the application starts
  public autoStart = true;
  
  private bankPatterns: BankPattern[] = BANK_PATTERNS;
  
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
    const { Device, message, packageName } = notification;
    
    if (!Device?.user) {
      await this.markNotificationProcessed(notification.id);
      return;
    }

    // Parse notification content
    const parsed = this.parseNotificationContent(message, packageName);
    
    // Debug log for SBP
    if (message.includes("SBP")) {
      console.log(`[NotificationMatcherService] Processing SBP notification:`, {
        id: notification.id,
        message: message,
        parsed: parsed
      });
    }
    
    if (!parsed.amount || parsed.amount <= 0) {
      await this.markNotificationProcessed(notification.id);
      return;
    }

    // Find matching transaction
    const matchingTransaction = await this.findMatchingTransaction(
      Device.user.id,
      parsed.amount,
      parsed.bankType
    );

    if (matchingTransaction) {
      console.log(`[NotificationMatcherService] Found matching transaction:`, {
        notificationId: notification.id,
        transactionId: matchingTransaction.id,
        amount: parsed.amount,
        bankType: parsed.bankType
      });
      await this.completeTransaction(matchingTransaction.id, notification.id, parsed);
    } else {
      if (message.includes("SBP")) {
        console.log(`[NotificationMatcherService] No match found for SBP notification ${notification.id}`);
      }
      // Mark notification as processed even if no match found
      await db.notification.update({
        where: { id: notification.id },
        data: {
          isProcessed: true
        }
      });
    }
  }

  private parseNotificationContent(content: string, packageName: string): ParsedNotification {
    const result: ParsedNotification = {};
    
    // Try to find matching bank pattern
    let matchedPattern: BankPattern | undefined;
    
    // FIRST check for SBP - it takes priority over package name
    // because SBP transactions can come through any bank app
    if (content.includes("SBP") || content.includes("СБП")) {
      matchedPattern = this.bankPatterns.find(pattern => pattern.name === "СБП");
    }
    
    // If not SBP, try to match by package name
    if (!matchedPattern && packageName) {
      matchedPattern = this.bankPatterns.find(pattern => 
        pattern.packageNames?.includes(packageName)
      );
    }
    
    // If no match by package name, try to detect bank by content
    if (!matchedPattern) {
      for (const pattern of this.bankPatterns) {
        // Check if any alias appears in the content
        const hasAlias = pattern.aliases.some(alias => 
          content.toLowerCase().includes(alias.toLowerCase())
        );
        
        if (hasAlias) {
          matchedPattern = pattern;
          break;
        }
        
        // Try to match amount pattern to detect bank
        for (const amountRegex of pattern.patterns.amount) {
          if (amountRegex.test(content)) {
            matchedPattern = pattern;
            break;
          }
        }
        
        if (matchedPattern) break;
      }
    }
    
    // Use generic patterns if no specific bank matched
    if (!matchedPattern) {
      matchedPattern = this.bankPatterns.find(p => p.name === "GenericSMS");
    }
    
    if (!matchedPattern) {
      return result;
    }
    
    // Extract amount
    for (const amountRegex of matchedPattern.patterns.amount) {
      const match = content.match(amountRegex);
      if (match && match[1]) {
        result.amount = this.parseAmount(match[1]);
        if (result.amount > 0) break;
      }
    }
    
    // Extract balance
    if (matchedPattern.patterns.balance) {
      for (const balanceRegex of matchedPattern.patterns.balance) {
        const match = content.match(balanceRegex);
        if (match && match[1]) {
          result.balance = this.parseAmount(match[1]);
          if (result.balance > 0) break;
        }
      }
    }
    
    // Extract card number
    if (matchedPattern.patterns.card) {
      for (const cardRegex of matchedPattern.patterns.card) {
        const match = content.match(cardRegex);
        if (match && match[1]) {
          result.card = match[1];
          break;
        }
      }
    }
    
    // Extract sender name
    if (matchedPattern.patterns.sender_name) {
      for (const senderRegex of matchedPattern.patterns.sender_name) {
        const match = content.match(senderRegex);
        if (match && match[1]) {
          result.senderName = match[1];
          break;
        }
      }
    }
    
    // Set bank type
    if (matchedPattern.name !== "GenericSMS") {
      result.bankType = getBankTypeFromPattern(matchedPattern.name);
      // Debug log for SBP
      if (matchedPattern.name === "СБП") {
        console.log(`[NotificationMatcherService] SBP detected: pattern=${matchedPattern.name}, bankType=${result.bankType}`);
      }
    }
    
    return result;
  }

  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    
    // Remove all spaces and replace comma with dot
    const cleaned = amountStr.replace(/\s+/g, '').replace(',', '.');
    const amount = parseFloat(cleaned);
    
    return isNaN(amount) ? 0 : roundDown2(amount);
  }

  private async findMatchingTransaction(
    traderId: string, 
    amount: number,
    bankType?: string
  ): Promise<any> {
    const tolerance = 1; // Allow 1 ruble difference
    
    const where: any = {
      traderId,
      type: TransactionType.IN,
      status: Status.IN_PROGRESS,
      amount: {
        gte: amount - tolerance,
        lte: amount + tolerance
      }
    };
    
    // Debug log for SBP matching
    console.log(`[NotificationMatcherService] findMatchingTransaction: traderId=${traderId}, amount=${amount}, bankType=${bankType}`);
    
    // If bank type is detected, try to match it
    // Special handling for SBP - it can come through any bank
    if (bankType && bankType !== "СБП" && bankType !== "SBP") {
      const requisites = await db.bankDetail.findMany({
        where: {
          userId: traderId,  // bankDetail uses userId, not traderId
          bankType: bankType as any
        },
        select: { id: true }
      });
      
      if (requisites.length > 0) {
        where.bankDetailId = {
          in: requisites.map(r => r.id)
        };
      }
    }
    // For SBP, don't filter by bank type - it can match any bank requisite
    
    return await db.transaction.findFirst({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  private async completeTransaction(
    transactionId: string, 
    notificationId: string,
    parsed: ParsedNotification
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
        amount: parsed.amount,
        bankType: parsed.bankType
      });
    });

    // Send callbacks after successful database update
    console.log(`[NotificationMatcherService] Sending callbacks for transaction ${transactionId}`);
    
    // Send callback to callbackUri
    if (transaction.callbackUri && transaction.callbackUri !== 'none' && transaction.callbackUri !== '') {
      try {
        const callbackPayload = {
          id: transaction.id,
          amount: transaction.amount,
          status: Status.READY
        };
        
        console.log(`[NotificationMatcherService] Sending callback to ${transaction.callbackUri}`);
        const response = await fetch(transaction.callbackUri, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Chase/1.0'
          },
          body: JSON.stringify(callbackPayload)
        });

        const responseText = await response.text();
        
        // Save callback history
        await db.callbackHistory.create({
          data: {
            transactionId: transaction.id,
            url: transaction.callbackUri,
            payload: callbackPayload as any,
            response: responseText,
            statusCode: response.status,
            error: response.ok ? null : `HTTP ${response.status}`
          }
        }).catch(err => console.error('[NotificationMatcherService] Error saving callback history:', err));
        
        if (!response.ok) {
          console.error(`[NotificationMatcherService] Callback failed with status ${response.status}`);
        } else {
          console.log(`[NotificationMatcherService] Callback sent successfully`);
        }
      } catch (error) {
        console.error(`[NotificationMatcherService] Error sending callback:`, error);
        // Save error to callback history
        await db.callbackHistory.create({
          data: {
            transactionId: transaction.id,
            url: transaction.callbackUri,
            payload: { id: transaction.id, amount: transaction.amount, status: Status.READY } as any,
            error: error instanceof Error ? error.message : String(error)
          }
        }).catch(err => console.error('[NotificationMatcherService] Error saving callback error history:', err));
      }
    }

    // Send callback to successUri
    if (transaction.successUri && transaction.successUri !== 'none' && transaction.successUri !== '') {
      try {
        const successPayload = {
          id: transaction.id,
          amount: transaction.amount,
          status: Status.READY
        };
        
        console.log(`[NotificationMatcherService] Sending success callback to ${transaction.successUri}`);
        const response = await fetch(transaction.successUri, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Chase/1.0'
          },
          body: JSON.stringify(successPayload)
        });

        const responseText = await response.text();
        
        // Save callback history
        await db.callbackHistory.create({
          data: {
            transactionId: transaction.id,
            url: transaction.successUri,
            payload: successPayload as any,
            response: responseText,
            statusCode: response.status,
            error: response.ok ? null : `HTTP ${response.status}`
          }
        }).catch(err => console.error('[NotificationMatcherService] Error saving success callback history:', err));
        
        if (!response.ok) {
          console.error(`[NotificationMatcherService] Success callback failed with status ${response.status}`);
        } else {
          console.log(`[NotificationMatcherService] Success callback sent successfully`);
        }
      } catch (error) {
        console.error(`[NotificationMatcherService] Error sending success callback:`, error);
        // Save error to callback history
        await db.callbackHistory.create({
          data: {
            transactionId: transaction.id,
            url: transaction.successUri,
            payload: { id: transaction.id, amount: transaction.amount, status: Status.READY } as any,
            error: error instanceof Error ? error.message : String(error)
          }
        }).catch(err => console.error('[NotificationMatcherService] Error saving success callback error history:', err));
      }
    }
  }

  private async markNotificationProcessed(notificationId: string): Promise<void> {
    await db.notification.update({
      where: { id: notificationId },
      data: { isProcessed: true }
    });
  }
}