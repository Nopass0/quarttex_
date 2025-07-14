"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { merchantApi } from "@/services/api"
import { formatAmount } from "@/lib/utils"
import { 
  TrendingUp, 
  Receipt, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

export default function MerchantDashboardPage() {
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      const response = await merchantApi.getStatistics()
      setStatistics(response)
    } catch (error) {
      console.error("Failed to fetch statistics:", error)
      toast.error("Не удалось загрузить статистику")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Не удалось загрузить данные</p>
      </div>
    )
  }

  const successRate = statistics.transactions.total > 0 
    ? ((statistics.transactions.successful / statistics.transactions.total) * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Баланс</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(statistics.balance)} ₽</div>
            <p className="text-xs text-muted-foreground">Доступно для вывода</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего транзакций</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.transactions.total}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="flex items-center text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {statistics.transactions.inTransactions} входящих
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Успешность</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {statistics.transactions.successful} из {statistics.transactions.total}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Объем</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(statistics.volume.total)} ₽</div>
            <p className="text-xs text-muted-foreground">Общий оборот</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Статусы транзакций</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Успешные</p>
                <p className="text-2xl font-bold">{statistics.transactions.successful}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Неудачные</p>
                <p className="text-2xl font-bold">{statistics.transactions.failed}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Споры</p>
                <p className="text-2xl font-bold">{statistics.transactions.dispute}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">В процессе</p>
                <p className="text-2xl font-bold">
                  {statistics.transactions.total - statistics.transactions.successful - statistics.transactions.failed - statistics.transactions.dispute}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Method Statistics */}
      {statistics.methodStats && statistics.methodStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Статистика по методам оплаты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statistics.methodStats.map((method: any) => (
                <div key={method.methodId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{method.methodName}</p>
                      <p className="text-sm text-muted-foreground">{method.methodCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{method.count} транзакций</p>
                    <p className="text-sm text-muted-foreground">{formatAmount(method.volume)} ₽</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}