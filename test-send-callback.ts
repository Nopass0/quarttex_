import { db as prisma } from './backend/src/db';
import { CallbackService } from './backend/src/services/CallbackService';

async function testSendCallback() {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: 'cmdtatcp800wjikg6mju5n5yp' }
    });

    if (!transaction) {
      console.log('Транзакция не найдена');
      return;
    }

    console.log('Отправляем колбэк для транзакции:', transaction.id);
    await CallbackService.sendCallback(transaction, 'COMPLETED');
    console.log('Колбэк отправлен!');

  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSendCallback();