import { create } from 'zustand'

interface Device {
  id: string
  name: string
  deviceKey: string
  token?: string | null
  traderId?: string | null
  isConnected: boolean
  isActive: boolean
  batteryLevel: number
  networkInfo: string
  deviceModel: string
  androidVersion: string
  appVersion: string
  lastPing?: Date | null
  lastHealthCheck?: Date | null
}

interface Merchant {
  id: string
  name: string
  apiKey: string
  apiSecret: string
  isActive: boolean
  liquidity: number
  minAmount: number
  maxAmount: number
}

interface EmulatorState {
  devices: Device[]
  merchants: Merchant[]
  trafficEnabled: boolean
  selectedMerchantId: string | null
  logs: any[]
  
  // Actions
  setDevices: (devices: Device[]) => void
  setMerchants: (merchants: Merchant[]) => void
  setTrafficEnabled: (enabled: boolean) => void
  setSelectedMerchantId: (id: string | null) => void
  addLog: (log: any) => void
  clearLogs: () => void
}

export const useEmulatorStore = create<EmulatorState>((set) => ({
  devices: [],
  merchants: [],
  trafficEnabled: false,
  selectedMerchantId: null,
  logs: [],
  
  setDevices: (devices) => set({ devices }),
  setMerchants: (merchants) => set({ merchants }),
  setTrafficEnabled: (enabled) => set({ trafficEnabled: enabled }),
  setSelectedMerchantId: (id) => set({ selectedMerchantId: id }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  clearLogs: () => set({ logs: [] })
}))