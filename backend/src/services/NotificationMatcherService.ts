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
    // Акбарс Банк
    {
      packageName: "ru.akbars.mobile",
      bankName: "AKBARS",
      regex: /(?:Пополнение|Перевод|Зачисление).*?(?:Сумма:|на сумму)\s*([\d\s]+[.,]?\d{0,2})\s*(?:RUR|₽|руб)/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.akbars",
      bankName: "AKBARS",
      regex: /Поступление\s+([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб)/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // Тинькофф / T-Bank
    {
      packageName: "com.idamob.tinkoff.android",
      bankName: "TBANK",
      regex: /(?:Пополнение|Перевод|Поступление)\s+(?:на\s+)?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.tinkoff",
      bankName: "TBANK",
      regex: /Вам перевели\s+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.tinkoff.sme",
      bankName: "TBANK",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*₽.*?(?:от|Перевод)/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // Сбербанк
    {
      packageName: "ru.sberbankmobile",
      bankName: "SBERBANK",
      regex: /(?:зачислен перевод по СБП|Пополнение.*?на|Перевод от|Поступление|Зачисление)\s+([\d\s]+[.,]?\d{0,2})\s*(?:₽|р|руб)/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "com.sberbank",
      bankName: "SBERBANK",
      regex: /СБЕР.*?\+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.sberbank.android",
      bankName: "SBERBANK",
      regex: /Вам перевели\s+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // ВТБ
    {
      packageName: "ru.vtb24.mobilebanking.android",
      bankName: "VTB",
      regex: /(?:Поступление|Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.vtb24",
      bankName: "VTB",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*₽.*?(?:перевод|пополнение)/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.vtb",
      bankName: "VTB",
      regex: /Зачислено\s+([\d\s]+[.,]?\d{0,2})\s*RUB/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // Альфа-Банк
    {
      packageName: "ru.alfabank.mobile.android",
      bankName: "ALFABANK",
      regex: /(?:Пополнение счета|Перевод от|Поступление)\s+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.alfabank",
      bankName: "ALFABANK",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*₽.*?(?:Перевод|от)/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // Газпромбанк
    {
      packageName: "ru.gazprombank.android.mobilebank.app",
      bankName: "GAZPROMBANK",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.gazprombank.android",
      bankName: "GAZPROMBANK",
      regex: /Поступил перевод\s+([\d\s]+[.,]?\d{0,2})\s*руб/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.gazprombank",
      bankName: "GAZPROMBANK",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*RUB/i,
      extractAmount: (match) => this.parseAmount(match[1])
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
    // Райффайзенбанк
    {
      packageName: "ru.raiffeisen.mobile.new",
      bankName: "RAIFFEISEN",
      regex: /(?:Пополнение|Перевод от|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.raiffeisen",
      bankName: "RAIFFEISEN",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*RUB.*?перевод/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.raiffeisenbank",
      bankName: "RAIFFEISEN",
      regex: /Поступление\s+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // Почта Банк
    {
      packageName: "ru.pochta.bank",
      bankName: "POCHTABANK",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.pochtabank",
      bankName: "POCHTABANK",
      regex: /Вам поступил перевод\s+([\d\s]+[.,]?\d{0,2})\s*руб/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // Уралсиб
    {
      packageName: "ru.uralsib.mobile",
      bankName: "URALSIB",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.uralsib.mb",
      bankName: "URALSIB",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*RUB/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // МКБ (Московский Кредитный Банк)
    {
      packageName: "ru.mkb.mobile",
      bankName: "MKB",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.mkb",
      bankName: "MKB",
      regex: /Поступление\s+([\d\s]+[.,]?\d{0,2})\s*руб/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // МТС Банк
    {
      packageName: "ru.mtsbank.mobile",
      bankName: "MTSBANK",
      regex: /(?:Пополнение|Перевод|Поступление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.mtsbank.android",
      bankName: "MTSBANK",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*₽.*?перевод/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // Промсвязьбанк / ПСБ
    {
      packageName: "ru.psbank.mobile",
      bankName: "PROMSVYAZBANK",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.psbank",
      bankName: "PROMSVYAZBANK",
      regex: /ПСБ.*?\+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.promsvyazbank",
      bankName: "PROMSVYAZBANK",
      regex: /Поступление\s+([\d\s]+[.,]?\d{0,2})\s*RUB/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // Ozon Банк
    {
      packageName: "ru.ozon.app.android",
      bankName: "OZONBANK",
      regex: /(?:Пополнение|Перевод от|Поступление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.ozonbank",
      bankName: "OZONBANK",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*₽.*?(?:перевод|от)/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.ozon.bank",
      bankName: "OZONBANK",
      regex: /Ozon.*?Банк.*?\+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
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
    // Росбанк
    {
      packageName: "ru.rosbank.android",
      bankName: "ROSBANK",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.rosbank",
      bankName: "ROSBANK",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*RUB/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "com.rbs",
      bankName: "ROSBANK",
      regex: /Поступление\s+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    // Русский Стандарт
    {
      packageName: "ru.rs.mobilebank",
      bankName: "RUSSIANSTANDARD",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.russianstandard",
      bankName: "RUSSIANSTANDARD",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    
    // ОТП Банк
    {
      packageName: "ru.otpbank",
      bankName: "OTPBANK",
      regex: /(?:Пополнение|Перевод от|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.otpbank.mobile",
      bankName: "OTPBANK",
      regex: /OTP.*?\+([\d\s]+[.,]?\d{0,2})\s*RUB/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    
    // Россельхозбанк
    {
      packageName: "ru.rshb",
      bankName: "ROSSELKHOZBANK",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.rosselkhozbank.rshb",
      bankName: "ROSSELKHOZBANK",
      regex: /РСХБ.*?\+([\d\s]+[.,]?\d{0,2})\s*руб/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.rshb.mbank",
      bankName: "ROSSELKHOZBANK",
      regex: /Поступление\s+([\d\s]+[.,]?\d{0,2})\s*RUB/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    
    // Банк Санкт-Петербург (БСПБ)
    {
      packageName: "com.bssys.bspb",
      bankName: "SPBBANK",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.bspb",
      bankName: "SPBBANK",
      regex: /БСПБ.*?\+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    
    // Авангард
    {
      packageName: "ru.avangard",
      bankName: "AVANGARD",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    
    // РНКБ
    {
      packageName: "com.fakemobile.rnkb",
      bankName: "RNKB",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.rnkb",
      bankName: "RNKB",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*RUB/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    
    // Зенит
    {
      packageName: "ru.zenit",
      bankName: "ZENIT",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    
    // УБРиР
    {
      packageName: "com.ubrir.mobile",
      bankName: "UBRIR",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.ubrir",
      bankName: "UBRIR",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*руб/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    
    // Синара Банк
    {
      packageName: "ru.siab.android",
      bankName: "SINARA",
      regex: /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.sinara",
      bankName: "SINARA",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*RUB/i,
      extractAmount: (match) => this.parseAmount(match[1])
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

      // Проверяем что это входящая транзакция
      const messageText = notification.message.toLowerCase();
      const isIncomingTransaction = 
        messageText.includes('пополнение') || 
        messageText.includes('перевод') ||
        messageText.includes('зачислен') ||
        messageText.includes('поступление') ||
        messageText.includes('получен');
        
      if (!isIncomingTransaction) {
        console.log(`[NotificationMatcherService] Skipping - not an incoming transaction`);
        return;
      }

      const amount = matcher.extractAmount(match);
      console.log(`[NotificationMatcherService] Found transaction amount: ${amount} RUB`);

      // Получаем все ID реквизитов с этого устройства
      const deviceBankDetailIds = notification.Device.bankDetails.map((bd: any) => bd.id);
      
      // Ищем подходящую транзакцию по реквизитам устройства
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
        console.log(`[NotificationMatcherService] No matching transaction found for amount ${amount} RUB on device ${notification.Device.id} (bankDetails: ${deviceBankDetailIds.join(', ')})`);
        return;
      }

      console.log(`[NotificationMatcherService] Found matching transaction: ${transaction.id} for amount ${amount} RUB`);
      
      // Обновляем статус транзакции и обрабатываем начисления в транзакции
      await db.$transaction(async (prisma) => {
        // Обновляем статус транзакции на READY и связываем с уведомлением
        const updatedTransaction = await prisma.transaction.update({
          where: { id: transaction.id },
          data: { 
            status: Status.READY,
            acceptedAt: new Date(),
            matchedNotificationId: notification.id
          }
        });
        
        console.log(`[NotificationMatcherService] ✅ Transaction ${transaction.id} marked as READY and linked to notification ${notification.id}`);

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

        // Отмечаем уведомление как прочитанное и обработанное
        await prisma.notification.update({
          where: { id: notification.id },
          data: { 
            isRead: true,
            isProcessed: true,
            matchedTransactions: {
              connect: { id: transaction.id }
            }
          }
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