import { BaseService } from "./BaseService";
import axios from "axios";
import { Status } from "@prisma/client";
import { db } from '../db';

export class CallbackService extends BaseService {
  protected interval = 5000; // 5 seconds
  protected displayName = 'Callback Service';
  protected description = 'Sends webhook callbacks to merchants for completed transactions';
  
  constructor() {
    super();
  }

  protected async tick() {
    await this.processCallbacks();
  }

  private async processCallbacks() {
    try {
      // Находим завершенные транзакции без отправленного колбэка
      const transactions = await db.transaction.findMany({
        where: {
          status: {
            in: [Status.READY, Status.EXPIRED, Status.CANCELED]
          },
          callbackSent: false,
          callbackUri: {
            not: ""
          }
        },
        include: {
          merchant: true,
          method: true
        },
        take: 10 // Обрабатываем по 10 транзакций за раз
      });

      for (const transaction of transactions) {
        await this.sendCallback(transaction);
      }
    } catch (error) {
      await this.logError("Error processing callbacks", { error });
    }
  }

  private async sendCallback(transaction: any) {
    try {
      const callbackData = {
        id: transaction.id,
        orderId: transaction.orderId,
        amount: transaction.amount,
        status: transaction.status,
        type: transaction.type,
        currency: transaction.currency,
        rate: transaction.rate,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
        method: {
          id: transaction.method.id,
          code: transaction.method.code,
          name: transaction.method.name,
          type: transaction.method.type
        },
        // Добавляем хеш для проверки подлинности
        timestamp: Date.now(),
        merchantId: transaction.merchantId
      };

      await this.logInfo(`Sending callback for transaction ${transaction.id} to ${transaction.callbackUri}`);

      // Отправляем POST запрос
      const response = await axios.post(transaction.callbackUri, callbackData, {
        timeout: 10000, // 10 секунд таймаут
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': transaction.merchantId,
          'X-Transaction-Id': transaction.id
        }
      });

      if (response.status >= 200 && response.status < 300) {
        // Помечаем колбэк как отправленный
        await db.transaction.update({
          where: { id: transaction.id },
          data: { callbackSent: true }
        });
        
        await this.logInfo(`Callback sent successfully for transaction ${transaction.id}`);
      } else {
        await this.logError(`Callback failed for transaction ${transaction.id}. Status: ${response.status}`);
      }
    } catch (error: any) {
      await this.logError(`Error sending callback for transaction ${transaction.id}`, { error: error.message });
      
      // Если ошибка связана с недоступностью URL, помечаем как отправленный чтобы не спамить
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        await db.transaction.update({
          where: { id: transaction.id },
          data: { 
            callbackSent: true,
            error: `Callback failed: ${error.message}`
          }
        });
      }
    }
  }
}

export default CallbackService;

// Регистрируем сервис
import { ServiceRegistry } from "./ServiceRegistry";
ServiceRegistry.register("CallbackService", CallbackService);