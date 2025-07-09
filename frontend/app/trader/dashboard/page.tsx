"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TraderHeader } from "@/components/trader/trader-header"
import { traderApi } from "@/services/api"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import Link from "next/link"
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Smartphone,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Wifi,
  WifiOff,
  DollarSign,
  CreditCard,
  Building2,
  MessageSquare,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FinanceStats {
  deals: {
    amount: number
    amountRub: number
    count: number
  }
  profit: {
    amount: number
    amountRub: number
  }
}

interface Event {
  id: string
  type: "device_stopped" | "device_started" | "deal_failed" | "dispute_opened"
  title: string
  description: string
  timestamp: string
  link?: string
  deviceName?: string
  deviceId?: string
}

export default function TraderDashboardPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("today")
  const [financeStats, setFinanceStats] = useState<FinanceStats>({
    deals: { amount: 0, amountRub: 0, count: 0 },
    profit: { amount: 0, amountRub: 0 }
  })
  const [events, setEvents] = useState<Event[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [disputes, setDisputes] = useState<any[]>([])
  const [recentDeals, setRecentDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [period])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [transactionsResponse, devicesData] = await Promise.all([
        traderApi.getTransactions({ limit: 10 }),
        traderApi.getDevices()
      ])
      
      const dealsData = transactionsResponse.transactions || []
      const disputesData = [] // Mock data since no disputes endpoint exists

      // Calculate finance stats based on period
      const now = new Date()
      const filteredDeals = dealsData.filter((deal: any) => {
        const dealDate = new Date(deal.createdAt)
        switch (period) {
          case "today":
            return dealDate.toDateString() === now.toDateString()
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return dealDate >= weekAgo
          case "month":
            return dealDate.getMonth() === now.getMonth() && dealDate.getFullYear() === now.getFullYear()
          case "year":
            return dealDate.getFullYear() === now.getFullYear()
          default:
            return true
        }
      })

      const successfulDeals = filteredDeals.filter((deal: any) => deal.status === "READY")
      const totalAmount = successfulDeals.reduce((sum: number, deal: any) => sum + (deal.amount || 0), 0)
      const totalProfit = successfulDeals.reduce((sum: number, deal: any) => sum + (deal.calculatedCommission || 0), 0)

      setFinanceStats({
        deals: {
          amount: totalAmount,
          amountRub: totalAmount * 100, // Mock exchange rate
          count: successfulDeals.length
        },
        profit: {
          amount: totalProfit,
          amountRub: totalProfit * 100
        }
      })

      // Generate events from devices
      const deviceEvents: Event[] = devicesData
        .filter((device: any) => !device.isOnline)
        .map((device: any) => ({
          id: `device-${device.id}`,
          type: "device_stopped" as const,
          title: "Устройство остановлено",
          description: format(new Date(device.lastSeen || new Date()), "d MMMM yyyy 'г.', в HH:mm", { locale: ru }),
          timestamp: device.lastSeen || new Date().toISOString(),
          link: `/devices/device/${device.id}`,
          deviceName: device.name,
          deviceId: device.id
        }))

      // Add failed deals as events
      const failedDeals = dealsData
        .filter((deal: any) => deal.status === "CANCELED" || deal.status === "EXPIRED")
        .slice(0, 5)
        .map((deal: any) => ({
          id: `deal-${deal.id}`,
          type: "deal_failed" as const,
          title: "Платеж не зачислен",
          description: format(new Date(deal.createdAt), "d MMMM yyyy 'г.', в HH:mm", { locale: ru }),
          timestamp: deal.createdAt,
          link: `/deals?id=${deal.id}`
        }))

      setEvents([...deviceEvents, ...failedDeals].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 5))

      setDevices(devicesData.slice(0, 5))
      setDisputes(disputesData.slice(0, 5))
      setRecentDeals(dealsData.slice(0, 10))
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const periodLabels = {
    today: "за сегодня",
    week: "за неделю",
    month: "за месяц",
    year: "за год"
  }

  if (loading) {
    return (
      <ProtectedRoute variant="trader">
        <AuthLayout variant="trader">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#006039]" />
          </div>
        </AuthLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Главная</h1>
            <TraderHeader />
          </div>

          {/* Finance Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <Link href="/finances" className="flex items-center gap-2 group">
                <h2 className="text-lg font-medium">Финансы</h2>
                <ArrowRight className="h-4 w-4 text-[#006039] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Finance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deals Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 uppercase">Сделки</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1">
                        <span className="text-xs">Период: {periodLabels[period]}</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPeriod("today")}>
                        за сегодня
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPeriod("week")}>
                        за неделю
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPeriod("month")}>
                        за месяц
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPeriod("year")}>
                        за год
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{financeStats.deals.amount.toFixed(2)} USDT</p>
                  <p className="text-sm text-gray-500">
                    {financeStats.deals.amountRub.toLocaleString('ru-RU')} RUB
                    {financeStats.deals.count === 0 && " – Нет успешных сделок"}
                  </p>
                </div>
              </Card>

              {/* Profit Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 uppercase">Прибыль</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1">
                        <span className="text-xs">Период: {periodLabels[period]}</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPeriod("today")}>
                        за сегодня
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPeriod("week")}>
                        за неделю
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPeriod("month")}>
                        за месяц
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPeriod("year")}>
                        за год
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{financeStats.profit.amount.toFixed(2)} USDT</p>
                  <p className="text-sm text-gray-500">
                    {financeStats.profit.amountRub.toLocaleString('ru-RU')} RUB
                  </p>
                </div>
              </Card>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Recent Events */}
              <section>
                <h2 className="text-lg font-medium mb-4">Последние события</h2>
                <div className="space-y-2">
                  {events.length === 0 ? (
                    <Card className="p-6 text-center text-gray-500">
                      Нет последних событий
                    </Card>
                  ) : (
                    events.map((event) => (
                      <Link key={event.id} href={event.link || "#"}>
                        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-2",
                              event.type === "device_stopped" ? "bg-orange-500" : "bg-red-500"
                            )} />
                            <div className="flex-1">
                              <p className="font-medium">{event.title}</p>
                              <p className="text-sm text-gray-500">{event.description}</p>
                            </div>
                            {event.deviceName && (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <WifiOff className="h-5 w-5 text-orange-600" />
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{event.deviceName}</p>
                                  <p className="text-xs text-gray-500">{event.deviceId}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              {/* Devices */}
              <section>
                <Link href="/devices" className="flex items-center justify-between mb-4 group">
                  <h2 className="text-lg font-medium">Устройства</h2>
                  <div className="flex items-center gap-1 text-[#006039]">
                    <span className="text-sm">Показать все</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
                <div className="space-y-2">
                  {devices.length === 0 ? (
                    <Card className="p-6 text-center text-gray-500">
                      Нет устройств
                    </Card>
                  ) : (
                    devices.map((device) => (
                      <Link key={device.id} href={`/devices/device/${device.id}`}>
                        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                device.isOnline ? "bg-green-100" : "bg-orange-100"
                              )}>
                                <Smartphone className={cn(
                                  "h-5 w-5",
                                  device.isOnline ? "text-green-600" : "text-orange-600"
                                )} />
                              </div>
                              <div>
                                <p className="font-medium">{device.name}</p>
                                <p className="text-sm text-gray-500">{device.id}</p>
                              </div>
                            </div>
                            <Badge variant={device.isOnline ? "default" : "secondary"}>
                              {device.isOnline ? "В работе" : "Не в работе"}
                            </Badge>
                          </div>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Open Disputes */}
              <section>
                <Link href="/disputes" className="flex items-center justify-between mb-4 group">
                  <h2 className="text-lg font-medium">Открытые споры</h2>
                  <div className="flex items-center gap-1 text-[#006039]">
                    <span className="text-sm">Показать все</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
                <div className="space-y-2">
                  {disputes.length === 0 ? (
                    <Card className="p-6 text-center text-gray-500">
                      Споры не найдены
                    </Card>
                  ) : (
                    disputes.map((dispute) => (
                      <Link key={dispute.id} href={`/disputes/${dispute.id}`}>
                        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <MessageSquare className="h-5 w-5 text-yellow-600" />
                              </div>
                              <div>
                                <p className="font-medium">Спор #{dispute.id}</p>
                                <p className="text-sm text-gray-500">
                                  {format(new Date(dispute.createdAt), "d MMMM yyyy", { locale: ru })}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="border-yellow-200 text-yellow-700">
                              Открыт
                            </Badge>
                          </div>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              {/* Recent Deals */}
              <section>
                <Link href="/deals" className="flex items-center justify-between mb-4 group">
                  <h2 className="text-lg font-medium">Последние сделки</h2>
                  <div className="flex items-center gap-1 text-[#006039]">
                    <span className="text-sm">Показать все</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
                <div className="space-y-2">
                  {recentDeals.length === 0 ? (
                    <Card className="p-6 text-center text-gray-500">
                      Нет сделок
                    </Card>
                  ) : (
                    recentDeals.slice(0, 5).map((deal) => (
                      <Link key={deal.id} href={`/deals?id=${deal.id}`}>
                        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                deal.status === "READY" ? "bg-green-100" :
                                deal.status === "IN_PROGRESS" ? "bg-blue-100" : "bg-red-100"
                              )}>
                                {deal.status === "READY" ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : deal.status === "IN_PROGRESS" ? (
                                  <Clock className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <X className="h-5 w-5 text-red-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {deal.status === "READY" ? "Платеж зачислен" :
                                   deal.status === "IN_PROGRESS" ? "В процессе" : "Платеж не зачислен"}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Создан: {format(new Date(deal.createdAt), "d MMMM yyyy 'г.', в HH:mm", { locale: ru })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{deal.amount.toFixed(2)} USDT</p>
                              <p className="text-sm text-gray-500">{(deal.amount * 100).toFixed(0)} RUB</p>
                            </div>
                          </div>
                          {deal.requisites && (
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{deal.requisites.cardNumber}</p>
                                <p className="text-xs text-gray-500">{deal.requisites.recipientName}</p>
                              </div>
                              {deal.device && (
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">{deal.device.name}</p>
                                  <p className="text-xs text-gray-400">{deal.device.id}</p>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="mt-3">
                            <Badge 
                              variant="outline"
                              className={cn(
                                deal.status === "READY" ? "border-green-200 text-green-700" :
                                deal.status === "IN_PROGRESS" ? "border-blue-200 text-blue-700" :
                                "border-red-200 text-red-700"
                              )}
                            >
                              {deal.status === "READY" ? "Зачислено" :
                               deal.status === "IN_PROGRESS" ? "В процессе" : "Не зачислено"}
                            </Badge>
                          </div>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}