import axios from 'axios'
import { db } from '@/db'

// Helper function to send callback and save to history
async function sendCallbackWithHistory(url: string, payload: any, transactionId: string) {
  let result: any = { url };
  
  try {
    console.log(`[Callback] Sending to ${url}:`, payload);
    const res = await axios.post(url, payload);
    result = { ...result, status: res.status, data: res.data };
    
    // Save successful callback to history
    try {
      await db.callbackHistory.create({
        data: {
          transactionId,
          url,
          payload,
          response: typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
          statusCode: res.status
        }
      });
      console.log(`[Callback] Saved successful callback to history: ${url}`);
    } catch (dbError: any) {
      console.error(`[Callback] Failed to save callback history:`, dbError.message);
    }
  } catch (e: any) {
    console.error(`[Callback] Error sending to ${url}:`, e?.message);
    result = { ...result, error: e?.message ?? 'request failed' };
    
    // Save failed callback to history
    try {
      await db.callbackHistory.create({
        data: {
          transactionId,
          url,
          payload,
          error: e?.message ?? 'request failed',
          statusCode: e.response?.status || null
        }
      });
      console.log(`[Callback] Saved failed callback to history: ${url}`);
    } catch (dbError: any) {
      console.error(`[Callback] Failed to save error callback history:`, dbError.message);
    }
  }
  
  return result;
}

export async function notifyByStatus(trx: { 
  id: string; 
  status: string; 
  successUri: string; 
  failUri: string;
  callbackUri?: string;
  amount?: number;
}) {
  const results = [];
  
  // Определяем URL для success/fail
  const statusUrl = trx.status === 'READY' ? trx.successUri
                  : trx.status === 'CANCELED' ? trx.failUri
                  : undefined;
  
  // Формируем payload с id, amount и status
  const payload = {
    id: trx.id,
    amount: trx.amount || 0,
    status: trx.status
  };
  
  // Отправляем на success/fail URL если есть
  if (statusUrl && statusUrl !== 'none' && statusUrl !== '') {
    const result = await sendCallbackWithHistory(statusUrl, payload, trx.id);
    results.push(result);
  }
  
  // Всегда отправляем на callbackUri если он есть
  if (trx.callbackUri && trx.callbackUri !== 'none' && trx.callbackUri !== '') {
    const result = await sendCallbackWithHistory(trx.callbackUri, payload, trx.id);
    results.push(result);
  }
  
  return results.length > 0 ? results : undefined;
}
