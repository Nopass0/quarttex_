import axios from 'axios'

export async function notifyByStatus(trx: { 
  id: string; 
  status: string; 
  successUri: string; 
  failUri: string;
  callbackUri?: string;
}) {
  const results = [];
  
  // Определяем URL для success/fail
  const statusUrl = trx.status === 'READY' ? trx.successUri
                  : trx.status === 'CANCELED' ? trx.failUri
                  : undefined;
  
  // Отправляем на success/fail URL если есть
  if (statusUrl) {
    try {
      const res = await axios.post(statusUrl, { id: trx.id, status: trx.status });
      results.push({ url: statusUrl, status: res.status, data: res.data });
    } catch (e: any) {
      results.push({ url: statusUrl, error: e?.message ?? 'request failed' });
    }
  }
  
  // Всегда отправляем на callbackUri если он есть
  if (trx.callbackUri) {
    try {
      const res = await axios.post(trx.callbackUri, { id: trx.id, status: trx.status });
      results.push({ url: trx.callbackUri, status: res.status, data: res.data });
    } catch (e: any) {
      results.push({ url: trx.callbackUri, error: e?.message ?? 'request failed' });
    }
  }
  
  return results.length > 0 ? results : undefined;
}
