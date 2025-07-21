import { useEffect } from 'react'
import { useTraderAuth } from '@/stores/auth'
import { useTraderStore } from '@/stores/trader'
import { api } from '@/services/api'

export function useTraderFinancials() {
  const token = useTraderAuth((state) => state.token)
  const { financials, setFinancials } = useTraderStore()

  useEffect(() => {
    if (!token) return

    const fetchFinancials = async () => {
      try {
        const response = await api.get('/trader/profile', {
          headers: {
            'x-trader-token': token
          }
        })
        
        if (response.data) {
          const { trustBalance, profitFromDeals, profitFromPayouts, frozenUsdt, frozenRub, balanceUsdt, balanceRub, deposit, escrowBalance, compensationBalance, referralBalance, disputedBalance } = response.data
          setFinancials({
            trustBalance: trustBalance || 0,
            profitFromDeals: profitFromDeals || 0,
            profitFromPayouts: profitFromPayouts || 0,
            frozenUsdt: frozenUsdt || 0,
            frozenRub: frozenRub || 0,
            balanceUsdt: balanceUsdt || 0,
            balanceRub: balanceRub || 0,
            deposit: deposit || 0,
            escrowBalance: escrowBalance || 0,
            compensationBalance: compensationBalance || 0,
            referralBalance: referralBalance || 0,
            disputedBalance: disputedBalance || 0,
          })
        }
      } catch (error) {
        console.error('Failed to fetch trader financials:', error)
      }
    }

    fetchFinancials()
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchFinancials, 30000)

    return () => clearInterval(interval)
  }, [token, setFinancials])

  return financials
}