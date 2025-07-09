import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MerchantAuthState {
  token: string | null
  merchantId: string | null
  merchantName: string | null
  sessionToken: string | null
  setAuth: (token: string, sessionToken: string, merchantId: string, merchantName: string) => void
  logout: () => void
}

export const useMerchantAuth = create<MerchantAuthState>()(
  persist(
    (set) => ({
      token: null,
      merchantId: null,
      merchantName: null,
      sessionToken: null,
      setAuth: (token, sessionToken, merchantId, merchantName) => 
        set({ token, sessionToken, merchantId, merchantName }),
      logout: () => set({ token: null, sessionToken: null, merchantId: null, merchantName: null }),
    }),
    {
      name: 'merchant-auth',
    }
  )
)