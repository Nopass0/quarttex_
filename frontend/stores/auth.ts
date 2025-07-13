import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface TraderAuthState {
  token: string | null
  setToken: (token: string | null) => void
  logout: () => void
  hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
}

interface AdminAuthState {
  token: string | null
  role: 'SUPER_ADMIN' | 'ADMIN' | null
  setToken: (token: string | null) => void
  setRole: (role: 'SUPER_ADMIN' | 'ADMIN' | null) => void
  logout: () => void
  hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
}

export const useTraderAuth = create<TraderAuthState>()(
  persist(
    (set) => ({
      token: null,
      hasHydrated: false,
      setToken: (token) => set({ token }),
      logout: () => set({ token: null }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'trader-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      hasHydrated: false,
      setToken: (token) => set({ token }),
      setRole: (role) => set({ role }),
      logout: () => set({ token: null, role: null }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'admin-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)