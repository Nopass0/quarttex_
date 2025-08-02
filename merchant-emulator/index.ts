import axios from 'axios';

interface Config {
  apiUrl: string;
  merchantToken: string;
  minAmount: number;
  maxAmount: number;
  delayBetweenRequests: number; // мс
  totalRequests?: number; // общее количество запросов (опционально)
}

interface TransactionResponse {
  id: string;
  numericId: number;
  amount: number;
  status: string;
  error?: string;
}

class MerchantEmulator {
  private config: Config;
  private requestCount = 0;
  private successCount = 0;
  private failedCount = 0;
  private errors: Map<string, number> = new Map();

  constructor(config: Config) {
    this.config = config;
  }

  private getRandomAmount(): number {
    const { minAmount, maxAmount } = this.config;
    return Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
  }

  private getRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private methodId: string | null = null;

  private async getMethodId(): Promise<string> {
    if (this.methodId) return this.methodId;

    try {
      console.log('🔍 Получение списка методов...');
      const response = await axios.get(`${this.config.apiUrl}/api/merchant/methods`, {
        headers: {
          'x-merchant-api-key': this.config.merchantToken
        }
      });

      const methods = response.data;
      const c2cMethod = methods.find((m: any) => m.type === 'c2c' || m.code === 'c2c');
      
      if (!c2cMethod) {
        throw new Error('Метод c2c не найден');
      }

      this.methodId = c2cMethod.id;
      console.log(`✅ Найден метод c2c: ${c2cMethod.name} (ID: ${this.methodId})`);
      return this.methodId;
    } catch (error: any) {
      console.error('❌ Не удалось получить методы:', error.response?.data || error.message);
      throw error;
    }
  }

  private async createTransaction(): Promise<void> {
    const methodId = await this.getMethodId();
    const orderId = `TEST_${Date.now()}_${this.getRandomString(8)}`;
    const amount = this.getRandomAmount();
    const userId = `user_${this.getRandomString(10)}`;

    const requestData = {
      methodId,
      amount,
      orderId,
      userId,
      callbackUri: 'https://example.com/callback',
      successUri: 'https://example.com/success',
      failUri: 'https://example.com/fail',
      type: 'IN',
      isMock: false
    };

    try {
      console.log(`[${new Date().toLocaleTimeString()}] Создание транзакции: ${orderId}, сумма: ${amount} ₽`);
      
      const response = await axios.post<TransactionResponse>(
        `${this.config.apiUrl}/api/merchant/createTransaction`,
        requestData,
        {
          headers: {
            'x-merchant-api-key': this.config.merchantToken,
            'Content-Type': 'application/json'
          }
        }
      );

      this.successCount++;
      console.log(`✅ Успешно создана транзакция ${response.data.numericId} (${response.data.id})`);
      console.log(`   Статус: ${response.data.status}, Сумма: ${response.data.amount} ₽`);
    } catch (error: any) {
      this.failedCount++;
      const errorMessage = error.response?.data?.error || error.message;
      
      // Учитываем статистику по ошибкам
      const currentCount = this.errors.get(errorMessage) || 0;
      this.errors.set(errorMessage, currentCount + 1);

      console.error(`❌ Ошибка: ${errorMessage}`);
      
      if (error.response?.status === 409 && errorMessage.includes('NO_REQUISITE')) {
        console.log('   💡 Достигнут лимит реквизитов или нет подходящих реквизитов');
      }
    }

    this.requestCount++;
  }

  private printStatistics(): void {
    console.log('\n📊 Статистика:');
    console.log(`   Всего запросов: ${this.requestCount}`);
    console.log(`   Успешных: ${this.successCount} (${((this.successCount / this.requestCount) * 100).toFixed(1)}%)`);
    console.log(`   Неудачных: ${this.failedCount} (${((this.failedCount / this.requestCount) * 100).toFixed(1)}%)`);
    
    if (this.errors.size > 0) {
      console.log('\n   Распределение ошибок:');
      for (const [error, count] of this.errors.entries()) {
        console.log(`   - ${error}: ${count} раз`);
      }
    }
  }

  async start(): Promise<void> {
    console.log('🚀 Запуск эмулятора мерчанта');
    console.log(`📋 Конфигурация:`);
    console.log(`   API URL: ${this.config.apiUrl}`);
    console.log(`   Диапазон сумм: ${this.config.minAmount} - ${this.config.maxAmount} ₽`);
    console.log(`   Задержка между запросами: ${this.config.delayBetweenRequests} мс`);
    console.log(`   Всего запросов: ${this.config.totalRequests || 'бесконечно'}`);
    console.log('');

    // Обработчик для graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n⏹️  Остановка эмулятора...');
      this.printStatistics();
      process.exit(0);
    });

    while (true) {
      await this.createTransaction();
      
      // Проверяем, достигли ли мы лимита запросов
      if (this.config.totalRequests && this.requestCount >= this.config.totalRequests) {
        console.log('\n✅ Достигнут лимит запросов');
        break;
      }

      // Задержка перед следующим запросом
      await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenRequests));
    }

    this.printStatistics();
  }
}

// Чтение конфигурации из переменных окружения или аргументов командной строки
const config: Config = {
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  merchantToken: process.env.MERCHANT_TOKEN || '',
  minAmount: parseInt(process.env.MIN_AMOUNT || '1000'),
  maxAmount: parseInt(process.env.MAX_AMOUNT || '50000'),
  delayBetweenRequests: parseInt(process.env.DELAY || '1000'),
  totalRequests: process.env.TOTAL_REQUESTS ? parseInt(process.env.TOTAL_REQUESTS) : undefined
};

// Проверка обязательных параметров
if (!config.merchantToken) {
  console.error('❌ Ошибка: Не указан токен мерчанта!');
  console.log('Использование:');
  console.log('  MERCHANT_TOKEN=your_token bun run index.ts');
  console.log('');
  console.log('Опциональные параметры:');
  console.log('  API_URL=http://localhost:3001  # URL API (по умолчанию: http://localhost:3001)');
  console.log('  MIN_AMOUNT=1000                # Минимальная сумма (по умолчанию: 1000)');
  console.log('  MAX_AMOUNT=50000               # Максимальная сумма (по умолчанию: 50000)');
  console.log('  DELAY=1000                     # Задержка между запросами в мс (по умолчанию: 1000)');
  console.log('  TOTAL_REQUESTS=100             # Общее количество запросов (по умолчанию: бесконечно)');
  process.exit(1);
}

// Запуск эмулятора
const emulator = new MerchantEmulator(config);
emulator.start().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});