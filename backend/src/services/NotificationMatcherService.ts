import { BaseService } from "./BaseService";
import { db } from "@/db";
import { Status, TransactionType, NotificationType } from "@prisma/client";
import { roundDown2 } from "@/utils/rounding";

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
      regex: /(Пополнение|Перевод|Поступление|Зачисление)\s+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[2])
    },
    {
      packageName: "ru.sberbank.android",
      bankName: "SBERBANK",
      regex: /(Пополнение|Перевод|Зачисление|Поступление)[^\d]+([\d\s]+[.,]?\d{0,2})\s*[₽р]/i,
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

      const metadata = notification.metadata as any;
      const packageName = metadata?.packageName || notification.application;
      
      console.log(`[NotificationMatcherService] Processing notification from device ${notification.Device.id} with ${notification.Device.bankDetails.length} bank details`);
      console.log(`[NotificationMatcherService] Bank details on device: ${notification.Device.bankDetails.map((bd: any) => `${bd.bankType}:${bd.id}`).join(', ')}`);
      
      // Находим подходящий matcher для пакета приложения
      const matchersForPackage = this.bankMatchers.filter(m => 
        m.packageName === packageName
      );

      if (matchersForPackage.length === 0) {
        console.log(`[NotificationMatcherService] No matchers found for package ${packageName}`);
        return;
      }

      // Определяем какой matcher использовать
      let matcher = matchersForPackage[0];
      let matchingBankDetail = null;
      
      // Ищем реквизит с соответствующим банком
      for (const bd of notification.Device.bankDetails) {
        const foundMatcher = matchersForPackage.find(m => m.bankName === bd.bankType);
        if (foundMatcher) {
          matcher = foundMatcher;
          matchingBankDetail = bd;
          break;
        }
      }
      
      if (!matchingBankDetail) {
        // Используем первый реквизит если точное совпадение не найдено
        matchingBankDetail = notification.Device.bankDetails[0];
        console.log(`[NotificationMatcherService] No exact bank match, using first bank detail: ${matchingBankDetail.bankType}`);
      } else {
        console.log(`[NotificationMatcherService] Found matching bank detail: ${matchingBankDetail.bankType}`);
      }

      // Извлекаем сумму из уведомления
      console.log(`[NotificationMatcherService] Testing regex: ${matcher.regex} against message: "${notification.message}"`);
      const match = matcher.regex.exec(notification.message);
      if (!match) {
        console.log(`[NotificationMatcherService] No amount match in notification: ${notification.message}`);
        return;
      }

      const transactionType = match[1];
      if (!transactionType.toLowerCase().includes('пополнение') && 
          !transactionType.toLowerCase().includes('перевод') &&
          !transactionType.toLowerCase().includes('зачисление') &&
          !transactionType.toLowerCase().includes('поступление')) {
        console.log(`[NotificationMatcherService] Skipping transaction type: ${transactionType}`);
        return;
      }

      const amount = matcher.extractAmount(match);
      console.log(`[NotificationMatcherService] Found transaction: ${transactionType} ${amount} RUB`);

      // Получаем все ID реквизитов с этого устройства
      const deviceBankDetailIds = notification.Device.bankDetails.map((bd: any) => bd.id);
      
      // Ищем подходящую транзакцию по всем реквизитам устройства
      // Сначала ищем точное совпадение
      let transaction = await db.transaction.findFirst({
        where: {
          bankDetailId: { in: deviceBankDetailIds },
          amount: amount,
          type: TransactionType.IN,
          status: {
            in: [Status.CREATED, Status.IN_PROGRESS]
          },
          traderId: notification.Device.userId
        },
        include: {
          merchant: true,
          requisites: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Если не нашли точное совпадение, ищем с небольшой погрешностью (±1 рубль)
      if (!transaction) {
        transaction = await db.transaction.findFirst({
          where: {
            bankDetailId: { in: deviceBankDetailIds },
            amount: {
              gte: amount - 1,
              lte: amount + 1
            },
            type: TransactionType.IN,
            status: {
              in: [Status.CREATED, Status.IN_PROGRESS]
            },
            traderId: notification.Device.userId
          },
          include: {
            merchant: true,
            requisites: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }

      if (!transaction) {
        console.log(`[NotificationMatcherService] No matching transaction found for amount ${amount} RUB on device ${notification.Device.id}`);
        return;
      }

      console.log(`[NotificationMatcherService] Found matching transaction: ${transaction.id} for amount ${amount} RUB`);
      
      // Обновляем статус транзакции и обрабатываем начисления в транзакции
      await db.$transaction(async (prisma) => {
        // Обновляем статус транзакции на READY
        const updatedTransaction = await prisma.transaction.update({
          where: { id: transaction.id },
          data: { 
            status: Status.READY,
            acceptedAt: new Date()
          }
        });
        
        console.log(`[NotificationMatcherService] ✅ Transaction ${transaction.id} marked as READY`);

        // Начисляем мерчанту
        const method = await prisma.method.findUnique({
          where: { id: transaction.methodId },
        });
        
        if (method && transaction.rate) {
          const netAmount = transaction.amount - (transaction.amount * method.commissionPayin) / 100;
          const increment = netAmount / transaction.rate;
          await prisma.merchant.update({
            where: { id: transaction.merchantId },
            data: { balanceUsdt: { increment } },
          });
          console.log(`[NotificationMatcherService] Credited ${increment} USDT to merchant ${transaction.merchantId}`);
        }

        // Обрабатываем заморозку трейдера и начисляем прибыль
        if (transaction.frozenUsdtAmount && transaction.calculatedCommission) {
          const totalFrozen = transaction.frozenUsdtAmount + transaction.calculatedCommission;
          
          // Размораживаем средства
          await prisma.user.update({
            where: { id: transaction.traderId },
            data: {
              frozenUsdt: { decrement: totalFrozen }
            }
          });

          // Списываем замороженную сумму с траст баланса
          await prisma.user.update({
            where: { id: transaction.traderId },
            data: {
              trustBalance: { decrement: totalFrozen }
            }
          });

          // Начисляем прибыль трейдеру (комиссия)
          const profit = roundDown2(transaction.calculatedCommission);
          if (profit > 0) {
            await prisma.user.update({
              where: { id: transaction.traderId },
              data: {
                profitFromDeals: { increment: profit }
              }
            });
            console.log(`[NotificationMatcherService] Credited ${profit} USDT profit to trader ${transaction.traderId}`);
          }
        }

        // Отмечаем уведомление как прочитанное
        await prisma.notification.update({
          where: { id: notification.id },
          data: { isRead: true }
        });
      });

      console.log(`[NotificationMatcherService] Transaction ${transaction.id} automatically marked as READY with all balance updates`);

      // Отправляем webhook уведомление
      await this.sendWebhookNotification(transaction);

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

  private async sendWebhookNotification(transaction: any): Promise<void> {
    try {
      // Используем стандартную систему уведомлений
      const { notifyByStatus } = await import("@/utils/notify");
      
      const hook = await notifyByStatus({
        id: transaction.id,
        status: Status.READY,
        successUri: transaction.successUri,
        failUri: transaction.failUri,
        callbackUri: transaction.callbackUri,
      });
      
      if (hook) {
        console.log(`[NotificationMatcherService] Webhook notification sent for transaction ${transaction.id}`);
      }
    } catch (error) {
      console.error(`[NotificationMatcherService] Error sending webhook for transaction ${transaction.id}:`, error);
    }
  }

  protected interval = 5000; // Проверяем каждые 5 секунд
}