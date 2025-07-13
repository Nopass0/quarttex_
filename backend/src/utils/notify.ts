import axios from 'axios'

export async function notifyByStatus(trx: { id: string; status: string; successUri: string; failUri: string }) {
  const url = trx.status === 'READY' ? trx.successUri
            : trx.status === 'CANCELED' ? trx.failUri
            : undefined
  if (!url) return undefined
  try {
    const res = await axios.post(url, { id: trx.id, status: trx.status })
    return { status: res.status, data: res.data }
  } catch (e: any) {
    return { error: e?.message ?? 'request failed' }
  }
}
