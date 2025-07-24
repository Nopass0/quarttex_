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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Баланс</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(statistics.balance)} ₽</div>
            <p className="text-xs text-muted-foreground">Доступно для вывода</p>
            {statistics.balanceDetails && (
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Всего заработано:</span>
                  <span className="text-green-600">{formatAmount(statistics.balanceDetails.totalEarned)} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span>Комиссии:</span>
                  <span className="text-red-600">-{formatAmount(statistics.balanceDetails.totalCommissionPaid)} ₽</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Входящие</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.transactions.inTransactions}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="flex items-center text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                {statistics.transactions.inSuccessful || 0} успешных
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Исходящие</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.transactions.outTransactions}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="flex items-center text-red-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                {statistics.transactions.outSuccessful || 0} успешных
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

        {statistics.balanceDetails && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Комиссии</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{formatAmount(statistics.balanceDetails.totalCommissionPaid)} ₽
              </div>
              <p className="text-xs text-muted-foreground">
                Удержано по тарифам
              </p>
            </CardContent>
          </Card>
        )}
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
            <p className="text-sm text-muted-foreground">
              Детальная статистика с разделением на входящие и исходящие операции
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statistics.methodStats.map((method: any) => (
                <div key={method.methodId} className="border rounded p-3">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                        <Receipt className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{method.methodName}</p>
                        <p className="text-xs text-muted-foreground">{method.methodCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{method.total.count} тр.</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-green-600">{formatAmount(method.total.balance)} ₽</span>
                      </p>
                    </div>
                  </div>

                  {/* Commission Rates */}
                  <div className="flex gap-3 mb-2 text-xs">
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3 text-green-600" />
                      <span>Вход: {method.commissionPayin}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowDownRight className="h-3 w-3 text-red-600" />
                      <span>Выход: {method.commissionPayout}%</span>
                    </div>
                  </div>

                  {/* Detailed Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Incoming */}
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <ArrowUpRight className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">Входящие</span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">{method.in.count}</p>
                        <p className="text-xs text-muted-foreground">тр.</p>
                        <p className="text-xs font-medium">{formatAmount(method.in.volume)} ₽</p>
                        <p className="text-xs font-medium text-green-600">{formatAmount(method.in.balance)} ₽</p>
                      </div>
                    </div>

                    {/* Outgoing */}
                    <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <ArrowDownRight className="h-3 w-3 text-red-600" />
                        <span className="text-xs font-medium text-red-700 dark:text-red-300">Исходящие</span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">{method.out.count}</p>
                        <p className="text-xs text-muted-foreground">тр.</p>
                        <p className="text-xs font-medium">{formatAmount(method.out.volume)} ₽</p>
                        <p className="text-xs font-medium text-red-600">{formatAmount(method.out.balance)} ₽</p>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Итого</span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">{method.total.count}</p>
                        <p className="text-xs text-muted-foreground">тр.</p>
                        <p className="text-xs font-medium">{formatAmount(method.total.volume)} ₽</p>
                        <p className="text-xs font-medium text-blue-600">{formatAmount(method.total.balance)} ₽</p>
                      </div>
                    </div>
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