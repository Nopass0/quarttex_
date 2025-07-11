import axios from 'axios'
import { useTraderAuth, useAdminAuth } from '@/stores/auth'
import { useMerchantAuth } from '@/stores/merchant-auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

// Debug log
if (typeof window !== 'undefined') {
  console.log('API URL configured as:', API_URL)
}

export const api = axios.create({
  baseURL: API_URL,
})

// Trader API instance with interceptors
export const traderApiInstance = axios.create({
  baseURL: API_URL,
})

traderApiInstance.interceptors.request.use((config) => {
  const token = useTraderAuth.getState().token
  if (token) {
    config.headers['x-trader-token'] = token
  }
  return config
})

traderApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - cannot connect to API server at:', API_URL)
      console.error('Make sure the backend is running on port 3000')
    } else if (error.response) {
      console.error('Trader API error:', error.response.status, error.response.data)
      if (error.response.status === 401 || error.response.status === 403) {
        useTraderAuth.getState().logout()
        if (typeof window !== 'undefined') {
          window.location.href = '/trader/login'
        }
      }
    } else {
      console.error('Trader API request error:', error.message)
    }
    return Promise.reject(error)
  }
)

// Admin API instance with interceptors
export const adminApiInstance = axios.create({
  baseURL: API_URL,
})

adminApiInstance.interceptors.request.use((config) => {
  const token = useAdminAuth.getState().token
  if (token) {
    // Ensure token contains only ASCII characters to prevent encoding errors
    const sanitizedToken = token.replace(/[^\x00-\x7F]/g, "")
    config.headers['x-admin-key'] = sanitizedToken
  }
  return config
})

adminApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      useAdminAuth.getState().logout()
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  }
)

export const traderApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/user/auth', { email, password })
    return response.data
  },
  validateToken: async () => {
    const response = await traderApiInstance.get('/trader/validate')
    return response.data
  },
  getProfile: async () => {
    const response = await traderApiInstance.get('/trader/profile')
    return response.data
  },
  getTransactions: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await traderApiInstance.get('/trader/transactions', { params })
    return response.data.data ? response.data : { transactions: response.data.data || [] }
  },
  getFinanceStats: async () => {
    const response = await traderApiInstance.get('/trader/finance-stats')
    return response.data
  },
  // Bank Details (Requisites) endpoints
  getRequisites: async () => {
    const response = await traderApiInstance.get('/trader/bank-details')
    return response.data
  },
  getArchivedRequisites: async () => {
    const response = await traderApiInstance.get('/trader/bank-details?archived=true')
    return response.data
  },
  createRequisite: async (data: any) => {
    const response = await traderApiInstance.post('/trader/bank-details', data)
    return response.data
  },
  updateRequisite: async (id: string, data: any) => {
    const response = await traderApiInstance.put(`/trader/bank-details/${id}`, data)
    return response.data
  },
  toggleRequisite: async (id: string) => {
    const response = await traderApiInstance.patch(`/trader/bank-details/${id}/toggle`)
    return response.data
  },
  deleteRequisite: async (id: string) => {
    const response = await traderApiInstance.delete(`/trader/bank-details/${id}`)
    return response.data
  },
  restoreRequisite: async (id: string) => {
    const response = await traderApiInstance.post(`/trader/bank-details/${id}/restore`)
    return response.data
  },
  // Devices endpoints
  getDevices: async () => {
    const response = await traderApiInstance.get('/trader/devices')
    return response.data
  },
  getDevice: async (id: string) => {
    const response = await traderApiInstance.get(`/trader/devices/${id}`)
    return response.data
  },
  createDevice: async (data: { name: string }) => {
    const response = await traderApiInstance.post('/trader/devices', data)
    return response.data
  },
  regenerateDeviceToken: async (id: string) => {
    const response = await traderApiInstance.post(`/trader/devices/${id}/regenerate-token`)
    return response.data
  },
  updateDeviceTrust: async (id: string, trusted: boolean) => {
    const response = await traderApiInstance.patch(`/trader/devices/${id}/trust`, { trusted })
    return response.data
  },
  linkDevice: async (deviceId: string, bankDetailId: string) => {
    const response = await traderApiInstance.post('/trader/devices/link', { deviceId, bankDetailId })
    return response.data
  },
  unlinkDevice: async (deviceId: string, bankDetailId: string) => {
    const response = await traderApiInstance.post('/trader/devices/unlink', { deviceId, bankDetailId })
    return response.data
  },
  deleteDevice: async (id: string) => {
    const response = await traderApiInstance.delete(`/trader/devices/${id}`)
    return response.data
  },
  // Device status control
  startDevice: async (id: string) => {
    const response = await traderApiInstance.patch(`/trader/devices/${id}/start`)
    return response.data
  },
  stopDevice: async (id: string) => {
    const response = await traderApiInstance.patch(`/trader/devices/${id}/stop`)
    return response.data
  },
  // Requisite status control
  startRequisite: async (id: string) => {
    const response = await traderApiInstance.patch(`/trader/bank-details/${id}/start`)
    return response.data
  },
  stopRequisite: async (id: string) => {
    const response = await traderApiInstance.patch(`/trader/bank-details/${id}/stop`)
    return response.data
  },
  // Methods endpoints
  getMethods: async () => {
    const response = await traderApiInstance.get('/trader/methods')
    return response.data
  },
  // Transaction status update
  updateTransactionStatus: async (id: string, status: string) => {
    const response = await traderApiInstance.patch(`/trader/transactions/${id}/status`, { status })
    return response.data
  },
  // Messages endpoints
  getMessages: async (params?: any) => {
    const response = await traderApiInstance.get('/trader/messages', { params })
    return response.data
  },
  // Devices endpoints
  getDevices: async () => {
    const response = await traderApiInstance.get('/trader/devices')
    return response.data
  },
  getDevice: async (id: string) => {
    const response = await traderApiInstance.get(`/trader/devices/${id}`)
    return response.data
  },
  createDevice: async (data: { name: string }) => {
    const response = await traderApiInstance.post('/trader/devices', data)
    return response.data
  },
  regenerateDeviceToken: async (id: string) => {
    const response = await traderApiInstance.post(`/trader/devices/${id}/regenerate-token`)
    return response.data
  },
  deleteDevice: async (id: string) => {
    const response = await traderApiInstance.delete(`/trader/devices/${id}`)
    return response.data
  },
  stopDevice: async (id: string) => {
    const response = await traderApiInstance.patch(`/trader/devices/${id}/stop`)
    return response.data
  },
  startDevice: async (id: string) => {
    const response = await traderApiInstance.patch(`/trader/devices/${id}/start`)
    return response.data
  },
  linkDeviceToBankDetail: async (deviceId: string, bankDetailId: string) => {
    const response = await traderApiInstance.post('/trader/devices/link', { deviceId, bankDetailId })
    return response.data
  },
  unlinkDeviceFromBankDetail: async (deviceId: string, bankDetailId: string) => {
    const response = await traderApiInstance.post('/trader/devices/unlink', { deviceId, bankDetailId })
    return response.data
  },
  // Payouts endpoints
  getPayouts: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await traderApiInstance.get('/trader/payouts', { params })
    return response.data
  },
  acceptPayout: async (id: string) => {
    const response = await traderApiInstance.post(`/trader/payouts/${id}/accept`)
    return response.data
  },
  cancelPayout: async (id: string, data: { reason: string; proofFiles?: string[] }) => {
    const response = await traderApiInstance.post(`/trader/payouts/${id}/cancel`, data)
    return response.data
  },
  confirmPayout: async (id: string, data: { proofFiles?: string[] }) => {
    const response = await traderApiInstance.post(`/trader/payouts/${id}/confirm`, data)
    return response.data
  },
  // Telegram integration
  generateTelegramLinkCode: async () => {
    const response = await traderApiInstance.post('/trader/telegram/generate-link-code')
    return response.data
  },
  checkTelegramConnection: async () => {
    const response = await traderApiInstance.get('/trader/telegram/check-connection')
    return response.data
  },
  disconnectTelegram: async () => {
    const response = await traderApiInstance.post('/trader/telegram/disconnect')
    return response.data
  },
  // Folders endpoints
  getFolders: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await traderApiInstance.get('/trader/folders', { params })
    return response.data
  },
  getFolder: async (id: string) => {
    const response = await traderApiInstance.get(`/trader/folders/${id}`)
    return response.data
  },
  createFolder: async (data: { title: string; requisiteIds: string[] }) => {
    const response = await traderApiInstance.post('/trader/folders', data)
    return response.data
  },
  updateFolder: async (id: string, data: { title?: string; requisiteIds?: string[]; isActive?: boolean }) => {
    const response = await traderApiInstance.put(`/trader/folders/${id}`, data)
    return response.data
  },
  deleteFolder: async (id: string) => {
    const response = await traderApiInstance.delete(`/trader/folders/${id}`)
    return response.data
  },
  startAllRequisitesInFolder: async (id: string) => {
    const response = await traderApiInstance.post(`/trader/folders/${id}/start-all`)
    return response.data
  },
  stopAllRequisitesInFolder: async (id: string) => {
    const response = await traderApiInstance.post(`/trader/folders/${id}/stop-all`)
    return response.data
  },
  // Disputes endpoints
  getDisputes: async (params?: { page?: number; limit?: number; status?: string; type?: string }) => {
    const response = await traderApiInstance.get('/trader/disputes', { params })
    return response.data
  },
  getDispute: async (id: string) => {
    const response = await traderApiInstance.get(`/trader/disputes/${id}`)
    return response.data
  },
  sendDisputeMessage: async (disputeId: string, data: FormData) => {
    const response = await traderApiInstance.post(`/trader/disputes/${disputeId}/messages`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  resolveDispute: async (disputeId: string, data: { status: string; resolution: string }) => {
    const response = await traderApiInstance.post(`/trader/disputes/${disputeId}/resolve`, data)
    return response.data
  },
}

// Merchant API instance with interceptors
export const merchantApiInstance = axios.create({
  baseURL: API_URL,
})

merchantApiInstance.interceptors.request.use((config) => {
  const sessionToken = useMerchantAuth.getState().sessionToken
  if (sessionToken) {
    config.headers['Authorization'] = `Bearer ${sessionToken}`
  }
  return config
})

merchantApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useMerchantAuth.getState().logout()
      window.location.href = '/merchant/login'
    }
    return Promise.reject(error)
  }
)

export const merchantApi = {
  login: async (apiToken: string) => {
    const response = await api.post('/merchant/auth/login', { apiToken })
    return response.data
  },
  logout: async () => {
    const response = await merchantApiInstance.post('/merchant/auth/logout')
    return response.data
  },
  getMe: async () => {
    const response = await merchantApiInstance.get('/merchant/auth/me')
    return response.data
  },
  getStatistics: async (period?: string) => {
    const params = period ? { period } : {}
    const response = await merchantApiInstance.get('/merchant/dashboard/statistics', { params })
    return response.data
  },
  getTransactions: async (params: any) => {
    const response = await merchantApiInstance.get('/merchant/dashboard/transactions', { params })
    return response.data
  },
  createDispute: async (transactionId: string, data: FormData) => {
    const response = await merchantApiInstance.post(`/merchant/dashboard/transactions/${transactionId}/dispute`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  // Payout disputes
  createPayoutDispute: async (payoutId: string, data: FormData) => {
    const response = await merchantApiInstance.post(`/merchant/disputes/${payoutId}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  getPayoutDisputes: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await merchantApiInstance.get('/merchant/disputes', { params })
    return response.data
  },
  getPayoutDispute: async (id: string) => {
    const response = await merchantApiInstance.get(`/merchant/disputes/${id}`)
    return response.data
  },
  sendPayoutDisputeMessage: async (disputeId: string, data: FormData) => {
    const response = await merchantApiInstance.post(`/merchant/disputes/${disputeId}/messages`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

export const adminApi = {
  login: async (token: string) => {
    // Ensure token contains only ASCII characters to prevent encoding errors
    const sanitizedToken = token.replace(/[^\x00-\x7F]/g, "")
    console.log('Admin login attempt with token:', sanitizedToken)
    console.log('API URL:', API_URL)
    const response = await api.get('/admin/verify', {
      headers: {
        'x-admin-key': sanitizedToken
      }
    })
    return response.data
  },
  validateToken: async () => {
    const response = await adminApiInstance.get('/admin/verify')
    return response.data
  },
  getTraders: async () => {
    const response = await adminApiInstance.get('/admin/traders')
    return response.data
  },
  createTrader: async (data: any) => {
    const response = await adminApiInstance.post('/admin/traders', data)
    return response.data
  },
  updateTrader: async (id: string, data: any) => {
    const response = await adminApiInstance.patch(`/admin/traders/${id}`, data)
    return response.data
  },
  updateTraderBalance: async (id: string, data: { amount: number, type: 'add' | 'set' }) => {
    const response = await adminApiInstance.patch(`/admin/traders/${id}/balance`, data)
    return response.data
  },
  toggleTraderTraffic: async (id: string, enabled: boolean) => {
    const response = await adminApiInstance.patch(`/admin/traders/${id}/traffic`, { enabled })
    return response.data
  },
  toggleTraderBan: async (id: string, banned: boolean) => {
    const response = await adminApiInstance.patch(`/admin/traders/${id}/ban`, { banned })
    return response.data
  },
  getTransactions: async () => {
    const response = await adminApiInstance.get('/admin/transactions')
    return response.data
  },
  getMerchants: async () => {
    const response = await adminApiInstance.get('/admin/merchants')
    return response.data
  },
  createMerchant: async (data: any) => {
    const response = await adminApiInstance.post('/admin/merchants', data)
    return response.data
  },
  sendDeviceMessage: async (data: {
    deviceId: string
    type: 'notification' | 'sms'
    packageName?: string
    phoneNumber?: string
    message: string
    timestamp: string
  }) => {
    const response = await adminApiInstance.post('/admin/devices/send-message', data)
    return response.data
  },
  // Device Emulator Service
  deviceEmulator: {
    getConfig: async () => {
      const response = await adminApiInstance.get('/admin/device-emulator/config')
      return response.data
    },
    updateConfig: async (config: any) => {
      const response = await adminApiInstance.post('/admin/device-emulator/config', config)
      return response.data
    },
    setEnabled: async (enabled: boolean) => {
      const response = await adminApiInstance.patch('/admin/device-emulator/enabled', { enabled })
      return response.data
    },
  },
  // Devices management
  getDevices: async (params?: any) => {
    const response = await adminApiInstance.get('/admin/devices', { params })
    return response.data
  },
  getDevice: async (id: string) => {
    const response = await adminApiInstance.get(`/admin/devices/${id}`)
    return response.data
  },
  updateDevice: async (id: string, data: any) => {
    const response = await adminApiInstance.patch(`/admin/devices/${id}`, data)
    return response.data
  },
  deleteDevice: async (id: string) => {
    const response = await adminApiInstance.delete(`/admin/devices/${id}`)
    return response.data
  },
  getDeviceMessages: async (id: string) => {
    const response = await adminApiInstance.get(`/admin/devices/${id}/messages`)
    return response.data
  },
  getDeviceTransactions: async (id: string) => {
    const response = await adminApiInstance.get(`/admin/devices/${id}/transactions`)
    return response.data
  },
  // Telegram settings
  getTelegramSettings: async () => {
    const response = await adminApiInstance.get('/admin/telegram-settings')
    return response.data
  },
  updateTelegramSettings: async (settings: { botLink: string; botUsername: string; botToken: string }) => {
    const response = await adminApiInstance.put('/admin/telegram-settings', settings)
    return response.data
  },
  restartTelegramService: async () => {
    const response = await adminApiInstance.post('/admin/telegram-settings/restart-service')
    return response.data
  },
}

// Server health check
export const checkServerConnection = async (): Promise<boolean> => {
  try {
    const response = await api.get('/info/connection', { timeout: 5000 })
    return response.status === 200
  } catch (error) {
    return false
  }
}