import axios from 'axios'

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
  if (statusUrl) {
    try {
      console.log(`[Callback] Sending to ${statusUrl}:`, payload);
      const res = await axios.post(statusUrl, payload);
      results.push({ url: statusUrl, status: res.status, data: res.data });
    } catch (e: any) {
      console.error(`[Callback] Error sending to ${statusUrl}:`, e?.message);
      results.push({ url: statusUrl, error: e?.message ?? 'request failed' });
    }
  }
  
  // Всегда отправляем на callbackUri если он есть
  if (trx.callbackUri && trx.callbackUri !== 'none' && trx.callbackUri !== '') {
    try {
      console.log(`[Callback] Sending to callback ${trx.callbackUri}:`, payload);
      const res = await axios.post(trx.callbackUri, payload);
      results.push({ url: trx.callbackUri, status: res.status, data: res.data });
    } catch (e: any) {
      console.error(`[Callback] Error sending to callback ${trx.callbackUri}:`, e?.message);
      results.push({ url: trx.callbackUri, error: e?.message ?? 'request failed' });
    }
  }
  
  return results.length > 0 ? results : undefined;
}
