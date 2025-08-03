import { BaseService } from "./BaseService";
import { db } from "@/db";
import { Status, TransactionType, NotificationType } from "@prisma/client";
import { roundDown2 } from "@/utils/rounding";
import { BANK_PATTERNS, getBankTypeFromPattern, type BankPattern } from "./bank-patterns";

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
      await this.completeTransaction(matchingTransaction.id, notification.id, parsed);
    } else {
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
    
    // First try to match by package name
    if (packageName) {
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
    
    // If bank type is detected, try to match it
    if (bankType) {
      const requisites = await db.bankDetail.findMany({
        where: {
          traderId,
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
    await db.$transaction(async (tx) => {
      // Update transaction status and link to notification
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: Status.READY,
          matchedNotificationId: notificationId
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
  }

  private async markNotificationProcessed(notificationId: string): Promise<void> {
    await db.notification.update({
      where: { id: notificationId },
      data: { isProcessed: true }
    });
  }
}