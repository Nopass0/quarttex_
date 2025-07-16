import { create } from 'zustand'

interface TraderFinancials {
  trustBalance: number
  profitFromDeals: number
  profitFromPayouts: number
  frozenUsdt: number
  frozenRub: number
  balanceUsdt: number
  balanceRub: number
  deposit: number
}

interface TraderStore {
  financials: TraderFinancials | null
  setFinancials: (financials: TraderFinancials) => void
  resetFinancials: () => void
}

export const useTraderStore = create<TraderStore>((set) => ({
  financials: null,
  setFinancials: (financials) => set({ financials }),
  resetFinancials: () => set({ financials: null }),
}))