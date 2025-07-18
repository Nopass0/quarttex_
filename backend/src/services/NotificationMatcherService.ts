import { BaseService } from "./BaseService";
import { db } from "@/db";
import { Status, TransactionType, NotificationType } from "@prisma/client";

interface BankMatcher {
  packageName: string;
  bankName: string;
  regex: RegExp;
  extractAmount: (match: RegExpMatchArray) => number;
}

export class NotificationMatcherService extends BaseService {
  private bankMatchers: BankMatcher[] = [
    {
      packageName: "ru.akbars.mobile",
      bankName: "AKBARS",
      regex: /(Пополнение|Перевод).*?Сумма:\s*([\d\s]+[.,]?\d{0,2})\s*(?:RUR|₽)/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "com.idamob.tinkoff.android",
      bankName: "TBANK",
      regex: /(Пополнение|Перевод)\s+на\s+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.sberbankmobile",
      bankName: "SBERBANK",
      regex: /(Пополнение|Перевод)[^\d]+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.sberbank.android",
      bankName: "SBERBANK",
      regex: /(Пополнение|Перевод|Зачисление)[^\d]+([\d\s]+[.,]?\d{0,2})\s*[₽р]/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.vtb24.mobilebanking.android",
      bankName: "VTB",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.alfabank.mobile.android",
      bankName: "ALFABANK",
      regex: /(Пополнение|Перевод)\s+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.gazprombank.android.mobilebank.app",
      bankName: "GAZPROMBANK",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.ftc.faktura.sovkombank",
      bankName: "SOVCOMBANK",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.bspb",
      bankName: "SPBBANK",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.rshb.mbank",
      bankName: "ROSSELKHOZBANK",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "com.openbank",
      bankName: "OTKRITIE",
      regex: /(Перевод|Пополнение).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    // Дополнительные банки
    {
      packageName: "ru.raiffeisen.mobile.new",
      bankName: "RAIFFEISEN",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.pochta.bank",
      bankName: "POCHTABANK",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.uralsib.mobile",
      bankName: "URALSIB",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.mkb.mobile",
      bankName: "MKB",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.mtsbank.mobile",
      bankName: "MTSBANK",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.psbank.mobile",
      bankName: "PROMSVYAZBANK",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.ozon.app.android",
      bankName: "OZONBANK",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "com.citi.citimobile",
      bankName: "CITIBANK",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.unicreditbank.mobile",
      bankName: "UNICREDIT",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.rosbank.android",
      bankName: "ROSBANK",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.rs.mobilebank",
      bankName: "RUSSIANSTANDARD",
      regex: /(Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    }
  ];

  constructor() {
    // BaseService не принимает параметры в конструкторе
    super();
  }

  protected async onStart(): Promise<void> {
    console.log("[NotificationMatcherService] Service initialized");
  }

  protected async tick(): Promise<void> {
    try {
      // Получаем все новые уведомления
      const newNotifications = await db.notification.findMany({
        where: {
          type: NotificationType.AppNotification,
          isRead: false,
          deviceId: { not: null }
        },
        include: {
          Device: {
            include: {
              bankDetails: true
            }
          }
        }
      });

      if (newNotifications.length > 0) {
        console.log(`[NotificationMatcherService] Found ${newNotifications.length} new notifications to process`);
      }

      for (const notification of newNotifications) {
        await this.processNotification(notification);
      }
    } catch (error) {
      console.error("[NotificationMatcherService] Error processing notifications:", error);
    }
  }

  private async processNotification(notification: any): Promise<void> {
    try {
      if (!notification.Device?.bankDetails || notification.Device.bankDetails.length === 0) {
        console.log(`[NotificationMatcherService] No bank details for notification ${notification.id}`);
        return;
      }

      // bankDetails is an array, get the first one
      const bankDetails = notification.Device.bankDetails[0];
      const metadata = notification.metadata as any;
      
      // Находим подходящий matcher для банка
      const matcher = this.bankMatchers.find(m => 
        m.packageName === metadata?.packageName &&
        m.bankName === bankDetails.bankType
      );

      if (!matcher) {
        console.log(`[NotificationMatcherService] No matcher found for ${metadata?.packageName} and ${bankDetails.bankType}`);
        console.log(`[NotificationMatcherService] Available matchers: ${this.bankMatchers.map(m => `${m.packageName}:${m.bankName}`).join(', ')}`);
        return;
      }

      // Извлекаем сумму из уведомления
      const match = matcher.regex.exec(notification.message);
      if (!match) {
        console.log(`[NotificationMatcherService] No amount match in notification: ${notification.message}`);
        return;
      }

      const transactionType = match[1];
      if (!transactionType.toLowerCase().includes('пополнение') && 
          !transactionType.toLowerCase().includes('перевод')) {
        return;
      }

      const amount = matcher.extractAmount(match);
      console.log(`[NotificationMatcherService] Found transaction: ${transactionType} ${amount} RUB from ${bankDetails.bankType}`);

      // Ищем подходящую транзакцию
      // Сначала ищем точное совпадение
      let transaction = await db.transaction.findFirst({
        where: {
          bankDetailId: bankDetails.id,
          amount: amount,
          type: TransactionType.IN,
          status: {
            in: [Status.CREATED, Status.IN_PROGRESS]
          },
          traderId: bankDetails.userId
        },
        include: {
          merchant: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Если не нашли точное совпадение, ищем с небольшой погрешностью (±1 рубль)
      if (!transaction) {
        transaction = await db.transaction.findFirst({
          where: {
            bankDetailId: bankDetails.id,
            amount: {
              gte: amount - 1,
              lte: amount + 1
            },
            type: TransactionType.IN,
            status: {
              in: [Status.CREATED, Status.IN_PROGRESS]
            },
            traderId: bankDetails.userId
          },
          include: {
            merchant: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }

      if (!transaction) {
        console.log(`[NotificationMatcherService] No matching transaction found for amount ${amount} RUB from ${bankDetails.bankType}`);
        return;
      }

      console.log(`[NotificationMatcherService] Found matching transaction: ${transaction.id} for amount ${amount} RUB`);
      
      // Обновляем статус транзакции на READY
      await db.transaction.update({
        where: { id: transaction.id },
        data: { 
          status: Status.READY,
          acceptedAt: new Date()
        }
      });
      
      console.log(`[NotificationMatcherService] ✅ Transaction ${transaction.id} marked as READY`);

      // Отмечаем уведомление как прочитанное
      await db.notification.update({
        where: { id: notification.id },
        data: { isRead: true }
      });

      console.log(`[NotificationMatcherService] Transaction ${transaction.id} automatically marked as READY`);

      // Отправляем callback мерчанту
      await this.sendMerchantCallback(transaction);

    } catch (error) {
      console.error(`[NotificationMatcherService] Error processing notification ${notification.id}:`, error);
    }
  }

  private parseAmount(amountStr: string): number {
    // Удаляем пробелы и заменяем запятую на точку
    const cleanAmount = amountStr
      .replace(/\s/g, '')
      .replace(',', '.');
    
    return parseFloat(cleanAmount);
  }

  private async sendMerchantCallback(transaction: any): Promise<void> {
    try {
      if (!transaction.callbackUri) {
        return;
      }

      const payload = {
        transactionId: transaction.id,
        orderId: transaction.orderId,
        status: 'success',
        amount: transaction.amount,
        timestamp: new Date().toISOString()
      };

      console.log(`[NotificationMatcherService] Sending callback to ${transaction.callbackUri}`, payload);
      
      try {
        const response = await fetch(transaction.callbackUri, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Merchant-Token': transaction.merchant.token
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          console.error(`[NotificationMatcherService] Callback failed with status ${response.status}: ${await response.text()}`);
        } else {
          console.log(`[NotificationMatcherService] Callback sent successfully for transaction ${transaction.id}`);
        }
      } catch (httpError) {
        console.error(`[NotificationMatcherService] HTTP error sending callback:`, httpError);
      }

    } catch (error) {
      console.error(`[NotificationMatcherService] Error sending callback for transaction ${transaction.id}:`, error);
    }
  }

  protected interval = 5000; // Проверяем каждые 5 секунд
}