"use client"

import { useState, useEffect } from "react"
import { MerchantProtectedRoute } from "@/components/auth/merchant-protected-route"
import { MerchantLayout } from "@/components/layouts/merchant-layout"
import { TransactionsList } from "@/components/merchant/transactions-list"
import { TransactionFiltersNew } from "@/components/merchant/transaction-filters-new"
import { useMerchantAuth } from "@/stores/merchant-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatAmount } from "@/lib/utils"
import { TrendingUp, Activity, DollarSign } from "lucide-react"

type Statistics = {
  balance?: number
  transactions?: {
    total: number
    successful: number
    failed: number
    dispute: number
    successRate: number
    inTransactions: number
    outTransactions: number
  }
  volume?: {
    total: number
    successful: number
  }
}

export default function MerchantTransactionsPage() {
  const { sessionToken } = useMerchantAuth()
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    amountFrom: "",
    amountTo: "",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc" as "asc" | "desc",
  })

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant/dashboard/statistics`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setStatistics(data)
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  return (
    <MerchantProtectedRoute>
      <MerchantLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Транзакции</h1>
            <p className="text-sm text-gray-500 mt-1">Управление и мониторинг платежей</p>
          </div>

          {statistics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Успешные платежи</CardTitle>
                  <TrendingUp className="h-4 w-4 text-[#006039]" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">₽{formatAmount(statistics.volume?.successful || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    {statistics.transactions?.successful || 0} транзакций
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Всего транзакций</CardTitle>
                  <Activity className="h-4 w-4 text-[#006039]" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{statistics.transactions?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    За выбранный период
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Успешность</CardTitle>
                  <Activity className="h-4 w-4 text-[#006039]" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{(statistics.transactions?.successRate || 0).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Процент успешных транзакций
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Баланс</CardTitle>
                  <DollarSign className="h-4 w-4 text-[#006039]" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">${formatAmount(statistics.balance || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    Доступный баланс USDT
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <TransactionFiltersNew filters={filters} onFiltersChange={setFilters} />
          <TransactionsList filters={filters} />
        </div>
      </MerchantLayout>
    </MerchantProtectedRoute>
  )
}