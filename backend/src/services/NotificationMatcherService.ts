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
  // Auto-start this service when the application starts
  public autoStart = true;
  
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
      packageName: "com.idamob.tinkoff.android",
      bankName: "TBANK",
      regex: /Пополнение,\s*счет\s*RUB\.\s*([\d\s]+[.,]?\d{0,2})\s*(?:₽|RUB)/i,
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
      packageName: "ru.vtb24.mobilebanking.android",
      bankName: "VTB",
      regex: /Перевод\s+от.*?Сумма:\s*([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.vtb24.mobilebanking.android",
      bankName: "VTB",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.vtb24",
      bankName: "VTB",
      regex: /\+([\d\s]+[.,]?\d{0,2})\s*₽.*?(?:перевод|пополнение)/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.vtb24",
      bankName: "VTB",
      regex: /Сумма:\s*([\d\s]+[.,]?\d{0,2})\s*₽/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.vtb",
      bankName: "VTB",
      regex: /Зачислено\s+([\d\s]+[.,]?\d{0,2})\s*RUB/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.vtb",
      bankName: "VTB",
      regex: /ВТБ.*?(?:Пополнение|Поступление|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|RUB)/i,
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
    // Хоум Кредит
    {
      packageName: "ru.homecredit.smartbank",
      bankName: "HOMECREDIT",
      regex: /(?:Пополнение|Перевод|Поступление|Зачисление|Вам\s+перевели)\s+(?:на\s+)?([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|р)/i,
      extractAmount: (match) => this.parseAmount(match[1])
    },
    {
      packageName: "ru.homecredit",
      bankName: "HOMECREDIT",
      regex: /Вам\s+(?:перевели|поступил(?:о)?)\s+([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|р)/i,
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
    {
      packageName: "ru.otpbank",
      bankName: "OTPBANK",
      regex: /Вам\s+(?:перевели|поступил(?:о)?)\s+([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|RUB)/i,
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
  
  // Универсальные парсеры для любых приложений
  private universalMatchers: RegExp[] = [
    // Формат: Поступление 100р Счет*5715
    /Поступление\s+([\d\s]+[.,]?\d{0,2})\s*(?:р|₽|руб|RUB)/i,
    // Формат: +1234.56 ₽ или +1234 ₽
    /\+([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|RUB|р)/i,
    // Формат: Пополнение 1234.56 ₽
    /(?:Пополнение|Перевод|Зачисление|Поступление|Получен)\s+([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|RUB|р)/i,
    // Формат: на сумму 1234.56 ₽
    /(?:на\s+сумму|Сумма:?)\s*([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|RUB|р)/i,
    // Формат: 1234.56 ₽ зачислено
    /([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|RUB|р)\s*(?:зачислен|поступил|получен)/i,
    // Формат для SMS: Пополнение счета 1234.56р
    /(?:Пополнение|Перевод).*?(?:счет|карт).*?([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|RUB|р)/i,
    // Формат: Вам перевели 1234 руб
    /(?:Вам|Вы)\s+(?:перевели|получили)\s+([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|RUB|р)/i
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
      const startTime = Date.now();
      let processedCount = 0;

      const newNotifications = await db.notification.findMany({
        where: {
          OR: [
            {
              type: NotificationType.AppNotification,
              isProcessed: false,
              deviceId: { not: null }
            },
            {
              // Также обрабатываем SMS уведомления
              metadata: {
                path: ['category'],
                equals: 'sms'
              },
              isProcessed: false,
              deviceId: { not: null }
            }
          ]
        },
        include: {
          Device: {
            include: {
              bankDetails: {
                select: {
                  id: true,
                  methodType: true,
                  bankType: true,
                  cardNumber: true,
                  recipientName: true,
                  phoneNumber: true,
                  minAmount: true,
                  maxAmount: true,
                  totalAmountLimit: true,
                  currentTotalAmount: true,
                  operationLimit: true,
                  sumLimit: true,
                  intervalMinutes: true,
                  isArchived: true,
                  isActive: true,
                  createdAt: true,
                  updatedAt: true,
                  deviceId: true,
                  userId: true,
                },
              },
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

      processedCount = newNotifications.length;

      const duration = Date.now() - startTime;
      console.log(`[NotificationMatcherService] Processed ${processedCount} notifications in ${duration}ms`);
      await this.logInfo("NotificationMatcher tick completed", { processedCount, durationMs: duration });
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

      let amount: number | null = null;
      let matchingBankDetail = null;

      // Пытаемся найти специфичный матчер для банка
      if (matchersForPackage.length > 0) {
        // Определяем какой matcher использовать
        let matcher = matchersForPackage[0];
        
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
        console.log(`[NotificationMatcherService] Testing bank-specific regex: ${matcher.regex} against message: "${notification.message}"`);
        const match = matcher.regex.exec(notification.message);
        if (match) {
          amount = matcher.extractAmount(match);
          console.log(`[NotificationMatcherService] Bank-specific matcher found amount: ${amount}`);
        }
      }

      // Если специфичный матчер не сработал, пробуем универсальные
      if (amount === null) {
        console.log(`[NotificationMatcherService] Trying universal matchers for package ${packageName}`);
        
        for (const universalRegex of this.universalMatchers) {
          const match = universalRegex.exec(notification.message);
          if (match) {
            amount = this.parseAmount(match[1]);
            console.log(`[NotificationMatcherService] Universal matcher found amount: ${amount} using regex: ${universalRegex}`);
            break;
          }
        }
      }

      if (amount === null) {
        console.log(`[NotificationMatcherService] No amount found in notification: ${notification.message}`);
        return;
      }

      // Если не было найдено соответствие банка, используем первый доступный реквизит
      if (!matchingBankDetail && notification.Device.bankDetails.length > 0) {
        matchingBankDetail = notification.Device.bankDetails[0];
        console.log(`[NotificationMatcherService] Using first available bank detail: ${matchingBankDetail.bankType}`);
      }

      // Проверяем что это входящая транзакция
      const messageText = notification.message.toLowerCase();
      const isIncomingTransaction = 
        messageText.includes('пополнение') || 
        messageText.includes('перевод') ||
        messageText.includes('зачислен') ||
        messageText.includes('поступление') ||
        messageText.includes('получен') ||
        messageText.includes('поступил') ||
        messageText.includes('+') ||
        messageText.includes('от ');
        
      if (!isIncomingTransaction) {
        console.log(`[NotificationMatcherService] Skipping - not an incoming transaction: ${notification.message}`);
        return;
      }

      console.log(`[NotificationMatcherService] Found transaction amount: ${amount} RUB`);

      // Получаем все ID реквизитов с этого устройства
      const deviceBankDetailIds = notification.Device.bankDetails.map((bd: any) => bd.id);
      
      console.log(`[NotificationMatcherService] Searching for transaction: amount=${amount}, deviceId=${notification.deviceId}, deviceBankDetailIds=${deviceBankDetailIds.join(',')}, traderId=${notification.Device.userId}`);
      
      // Ищем транзакцию ТОЛЬКО по реквизитам этого устройства
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
          requisites: true,
          bankDetail: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!transaction) {
        console.log(`[NotificationMatcherService] ❌ No matching transaction found for amount ${amount} RUB on device ${notification.deviceId}`);
        console.log(`[NotificationMatcherService] Debug info:`);
        console.log(`  - Device ID: ${notification.Device.id}`);
        console.log(`  - Device User ID: ${notification.Device.userId}`);
        console.log(`  - Bank Details on this device: ${deviceBankDetailIds.join(', ')}`);
        console.log(`  - Package name: ${packageName}`);
        console.log(`  - Message: ${notification.message}`);
        
        // Логируем активные транзакции с реквизитами этого устройства
        const activeTransactionsOnDevice = await db.transaction.findMany({
          where: {
            bankDetailId: { in: deviceBankDetailIds },
            type: TransactionType.IN,
            status: {
              in: [Status.CREATED, Status.IN_PROGRESS]
            }
          },
          include: {
            trader: true,
            bankDetail: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        console.log(`[NotificationMatcherService] Active transactions on this device:`);
        if (activeTransactionsOnDevice.length === 0) {
          console.log(`  - No active transactions found for bank details: ${deviceBankDetailIds.join(', ')}`);
        } else {
          activeTransactionsOnDevice.forEach(t => {
            console.log(`  - Transaction ${t.id}: amount=${t.amount}, traderId=${t.traderId}, traderEmail=${t.trader?.email}, bankDetailId=${t.bankDetailId}, status=${t.status}`);
          });
        }
        
        return;
      }

      console.log(`[NotificationMatcherService] ✅ Found matching transaction: ${transaction.id} for amount ${amount} RUB`);
      console.log(`  - Transaction trader: ${transaction.traderId}`);
      console.log(`  - Transaction bankDetail: ${transaction.bankDetailId}`);
      console.log(`  - Transaction status: ${transaction.status}`);
      
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
        amount: transaction.amount,
      });
      
      if (hook) {
        console.log(`[NotificationMatcherService] Webhook notification sent for transaction ${transaction.id}`);
      }
    } catch (error) {
      console.error(`[NotificationMatcherService] Error sending webhook for transaction ${transaction.id}:`, error);
    }
  }

  protected interval = parseInt(process.env.NOTIFICATION_MATCHER_INTERVAL ?? "100", 10); // Проверяем каждые 100мс для быстрого сопоставления
}

// Export as default for auto-discovery
export default NotificationMatcherService;
