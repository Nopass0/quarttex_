import { BaseService } from "./BaseService";
import { db } from "@/db";
import { Status, TransactionType, NotificationType } from "@prisma/client";
import { HttpClient } from "@/utils/httpClient";
import { BankRegexFactory } from "@/bank-parsers";
import type { ProcessorConfig, ProcessorStats } from "@/types/processor";
import { ProcessorConfigSchema } from "@/types/processor";

interface CallbackPayload {
  transactionId: string;
  orderId: string;
  status: string;
  amount: number;
  timestamp: string;
}

interface CallbackTask {
  transaction: any;
  payload: CallbackPayload;
  attempts: number;
}

export class NotificationAutoProcessorService extends BaseService {
  private config: ProcessorConfig;
  private stats: ProcessorStats;
  private bankFactory: BankRegexFactory;
  private httpClient: HttpClient;
  private callbackQueue: CallbackTask[] = [];
  private activeCallbacks = 0;
  private watchdogTimer?: NodeJS.Timeout;

  constructor() {
    super({
      displayName: "Notification Auto-Processor Service",
      description: "Automatically processes bank notifications and matches them with transactions",
      enabled: true, // Always enabled
      autoStart: true,
      tags: ["notifications", "automation", "critical"],
    });

    this.config = ProcessorConfigSchema.parse({});
    this.stats = {
      totalProcessed: 0,
      successfulMatches: 0,
      failedMatches: 0,
      callbacksSent: 0,
      callbacksFailed: 0,
      devicesMarkedOffline: 0,
      averageProcessingTime: 0,
    };

    this.bankFactory = new BankRegexFactory();
    this.httpClient = new HttpClient({
      timeout: this.config.callbackTimeout,
      retries: this.config.callbackRetries,
      retryDelay: this.config.callbackRetryDelay,
    });

    this.interval = this.config.pollIntervalSec * 1000;
  }

  protected async onStart(): Promise<void> {
    await this.loadConfig();
    await this.logInfo("Notification Auto-Processor Service starting", {
      config: this.config,
      supportedBanks: this.bankFactory.getBankNames(),
    });

    // Start device watchdog
    if (this.config.enableDeviceWatchdog) {
      this.startWatchdog();
    }
  }

  protected async onStop(): Promise<void> {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = undefined;
    }

    await this.logInfo("Notification Auto-Processor Service stopped", {
      stats: this.stats,
    });
  }

  protected async tick(): Promise<void> {
    if (!this.config.enabled) return;

    const startTime = Date.now();
    this.stats.lastRunTime = new Date();

    try {
      // Process notifications
      const notifications = await this.fetchUnprocessedNotifications();
      
      if (notifications.length > 0) {
        await this.logDebug(`Processing ${notifications.length} notifications`);
        
        for (const notification of notifications) {
          await this.processNotification(notification);
        }
      }

      // Process callback queue
      await this.processCallbackQueue();

      // Update average processing time
      const processingTime = Date.now() - startTime;
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * 0.9) + (processingTime * 0.1);

    } catch (error) {
      await this.logError("Error in notification processing tick", { error });
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const serviceConfig = await db.serviceConfig.findUnique({
        where: { serviceKey: "notification_auto_processor" },
      });

      if (serviceConfig && serviceConfig.isEnabled) {
        this.config = ProcessorConfigSchema.parse(serviceConfig.config);
        this.interval = this.config.pollIntervalSec * 1000;
      }
    } catch (error) {
      await this.logError("Failed to load config", { error });
    }
  }

  private async fetchUnprocessedNotifications(): Promise<any[]> {
    return db.notification.findMany({
      where: {
        type: NotificationType.AppNotification,
        isProcessed: false,
        deviceId: { not: null },
      },
      include: {
        Device: {
          include: {
            bankDetails: {
              where: {
                isArchived: false,
              },
            },
            user: true,
          },
        },
      },
      take: this.config.batchSize,
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  private async processNotification(notification: any): Promise<void> {
    const startTime = Date.now();

    try {
      this.stats.totalProcessed++;

      // Check if device has bank details
      if (!notification.Device?.bankDetails || notification.Device.bankDetails.length === 0) {
        await this.markNotificationProcessed(notification.id, "NO_BANK_DETAILS");
        return;
      }

      const metadata = notification.metadata as any;
      const packageName = metadata?.packageName;

      // Parse notification message
      const parseResult = this.bankFactory.parseMessage(notification.message, packageName);
      
      if (!parseResult) {
        await this.markNotificationProcessed(notification.id, "PARSE_FAILED");
        this.stats.failedMatches++;
        return;
      }

      const { parser, transaction: parsedTx } = parseResult;

      await this.logDebug("Parsed notification", {
        notificationId: notification.id,
        bank: parser.bankName,
        amount: parsedTx.amount,
        senderName: parsedTx.senderName,
      });

      // Find matching transaction
      const matchedTransaction = await this.findMatchingTransaction(
        notification,
        parsedTx,
        parser.bankName
      );

      if (!matchedTransaction) {
        await this.markNotificationProcessed(notification.id, "NO_MATCHING_TXN");
        this.stats.failedMatches++;
        return;
      }

      // Update transaction status
      await this.updateTransactionStatus(matchedTransaction, notification.id);
      this.stats.successfulMatches++;

      // Queue callback
      this.queueCallback(matchedTransaction);

      const processingTime = Date.now() - startTime;
      await this.logInfo("Successfully matched notification", {
        notificationId: notification.id,
        transactionId: matchedTransaction.id,
        amount: parsedTx.amount,
        processingTimeMs: processingTime,
      });

    } catch (error) {
      await this.logError("Error processing notification", {
        notificationId: notification.id,
        error,
      });
      await this.markNotificationProcessed(notification.id, "ERROR");
      this.stats.failedMatches++;
    }
  }

  private async findMatchingTransaction(
    notification: any,
    parsedTx: any,
    bankName: string
  ): Promise<any> {
    const { amount } = parsedTx;
    const notificationTime = new Date(notification.createdAt);

    // Get all eligible bank details for this device
    const eligibleBankDetails = notification.Device.bankDetails.filter((bd: any) => {
      // Match bank type
      const bankType = this.mapBankNameToType(bankName);
      return bd.bankType === bankType;
    });

    if (eligibleBankDetails.length === 0) {
      return null;
    }

    const bankDetailIds = eligibleBankDetails.map((bd: any) => bd.id);

    // Search for matching transaction
    const transactions = await db.transaction.findMany({
      where: {
        bankDetailId: { in: bankDetailIds },
        type: TransactionType.IN,
        status: Status.IN_PROGRESS,
        amount: {
          gte: amount - this.config.amountTolerance,
          lte: amount + this.config.amountTolerance,
        },
        traderId: notification.Device.userId,
        createdAt: {
          gte: new Date(notificationTime.getTime() - this.config.minTimeDiffMs),
          lte: notificationTime,
        },
      },
      include: {
        merchant: true,
        method: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (transactions.length === 0) {
      return null;
    }

    // Return the most recent matching transaction
    return transactions[0];
  }

  private mapBankNameToType(bankName: string): string {
    const mapping: Record<string, string> = {
      "Тинькофф": "TBANK",
      "Сбербанк": "SBERBANK",
      "ВТБ": "VTB",
      "Альфа-Банк": "ALFABANK",
      "Газпромбанк": "GAZPROMBANK",
      "Озон Банк": "OZONBANK",
      // Add more mappings as needed
    };

    return mapping[bankName] || bankName.toUpperCase().replace(/[\s-]/g, "");
  }

  private async updateTransactionStatus(transaction: any, notificationId: string): Promise<void> {
    await db.$transaction([
      // Update transaction
      db.transaction.update({
        where: { id: transaction.id },
        data: {
          status: Status.READY,
          acceptedAt: new Date(),
        },
      }),
      // Mark notification as processed
      db.notification.update({
        where: { id: notificationId },
        data: {
          isProcessed: true,
          updatedAt: new Date(),
        },
      }),
    ]);
  }

  private async markNotificationProcessed(notificationId: string, reason: string): Promise<void> {
    // Get current notification to preserve existing metadata
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });
    
    if (!notification) return;
    
    const currentMetadata = (notification.metadata as any) || {};
    
    await db.notification.update({
      where: { id: notificationId },
      data: {
        isProcessed: true,
        metadata: {
          ...currentMetadata,
          processedReason: reason,
          processedAt: new Date().toISOString(),
        },
      },
    });
  }

  private queueCallback(transaction: any): void {
    const payload: CallbackPayload = {
      transactionId: transaction.id,
      orderId: transaction.orderId,
      status: "success",
      amount: transaction.amount,
      timestamp: new Date().toISOString(),
    };

    this.callbackQueue.push({
      transaction,
      payload,
      attempts: 0,
    });
  }

  private async processCallbackQueue(): Promise<void> {
    while (
      this.callbackQueue.length > 0 && 
      this.activeCallbacks < this.config.callbackConcurrency
    ) {
      const task = this.callbackQueue.shift();
      if (!task) break;

      this.activeCallbacks++;
      this.sendCallback(task).finally(() => {
        this.activeCallbacks--;
      });
    }
  }

  private async sendCallback(task: CallbackTask): Promise<void> {
    const { transaction, payload } = task;

    if (!transaction.callbackUri) {
      return;
    }

    try {
      task.attempts++;

      await this.httpClient.post(transaction.callbackUri, payload, {
        headers: {
          "X-Merchant-Token": transaction.merchant.token,
          "X-Transaction-Id": transaction.id,
        },
      });

      this.stats.callbacksSent++;

      await this.logInfo("Callback sent successfully", {
        transactionId: transaction.id,
        callbackUri: transaction.callbackUri,
        attempts: task.attempts,
      });

    } catch (error) {
      this.stats.callbacksFailed++;

      await this.logError("Callback failed", {
        transactionId: transaction.id,
        callbackUri: transaction.callbackUri,
        attempts: task.attempts,
        error,
      });

      // Retry if attempts remaining
      if (task.attempts < this.config.callbackRetries) {
        // Re-queue with exponential backoff
        setTimeout(() => {
          this.callbackQueue.push(task);
        }, this.config.callbackRetryDelay * Math.pow(2, task.attempts - 1));
      }
    }
  }

  private startWatchdog(): void {
    this.watchdogTimer = setInterval(async () => {
      await this.updateDeviceStatuses();
    }, this.config.watchdogIntervalSec * 1000);
  }

  private async updateDeviceStatuses(): Promise<void> {
    try {
      const threshold = new Date(
        Date.now() - this.config.deviceOfflineThresholdSec * 1000
      );

      const result = await db.device.updateMany({
        where: {
          isOnline: true,
          lastActiveAt: {
            lt: threshold,
          },
        },
        data: {
          isOnline: false,
        },
      });

      if (result.count > 0) {
        this.stats.devicesMarkedOffline += result.count;
        
        await this.logInfo("Devices marked offline", {
          count: result.count,
          threshold: threshold.toISOString(),
        });
      }
    } catch (error) {
      await this.logError("Error updating device statuses", { error });
    }
  }

  protected getPublicFields(): Record<string, any> {
    return {
      enabled: this.config.enabled,
      stats: this.stats,
      config: this.config,
      supportedBanks: this.bankFactory.getBankNames(),
      callbackQueueSize: this.callbackQueue.length,
      activeCallbacks: this.activeCallbacks,
    };
  }

  protected async updatePublicFields(fields: Record<string, any>): Promise<void> {
    if (fields.config) {
      this.config = ProcessorConfigSchema.parse(fields.config);
      this.interval = this.config.pollIntervalSec * 1000;
      
      // Save to database
      await db.serviceConfig.upsert({
        where: { serviceKey: "notification_auto_processor" },
        create: {
          serviceKey: "notification_auto_processor",
          config: fields.config,
          isEnabled: true,
        },
        update: {
          config: fields.config,
        },
      });
    }

    await this.updatePublicFieldsInDb(this.getPublicFields());
  }
}

export default NotificationAutoProcessorService;