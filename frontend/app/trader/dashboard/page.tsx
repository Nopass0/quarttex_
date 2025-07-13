"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TraderHeader } from "@/components/trader/trader-header";
import { traderApi } from "@/services/api";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import {
  ChevronDown,
  Smartphone,
  Building2,
  MessageSquare,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Bank icon component
const getBankIcon = (bankType: string) => {
  const bankLogos: Record<string, string> = {
    SBERBANK: "/bank-logos/sberbank.svg",
    TBANK: "/bank-logos/tbank.svg",
    ALFABANK: "/bank-logos/alfabank.svg",
    VTB: "/bank-logos/vtb.svg",
    RAIFFEISEN: "/bank-logos/raiffeisen.svg",
    GAZPROMBANK: "/bank-logos/gazprombank.svg",
    DEFAULT: "/bank-logos/sberbank.svg",
  };

  const logoPath = bankLogos[bankType] || bankLogos.DEFAULT;

  return (
    <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-1">
      <img
        src={logoPath}
        alt={bankType}
        className="w-full h-full object-contain"
        onError={(e) => {
          e.currentTarget.src = "/bank-logos/sberbank.svg";
        }}
      />
    </div>
  );
};

// Skeleton components for loading states
const FinanceStatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-8 w-12" />
        </div>
        <div className="text-right">
          <Skeleton className="h-4 w-12 mb-2" />
          <Skeleton className="h-6 w-24 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </Card>
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="text-right">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </Card>
  </div>
);

const EventSkeleton = () => (
  <div className="p-4">
    <div className="flex items-start gap-3">
      <Skeleton className="w-2 h-2 rounded-full mt-2" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-4 w-48 mb-1" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  </div>
);

const DeviceSkeleton = () => (
  <div className="p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-32 mb-1" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  </div>
);

const DealSkeleton = () => (
  <div className="p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-4 w-40 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-4 w-20 mb-1" />
        <Skeleton className="h-3 w-16 mb-1" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  </div>
);

const DisputeSkeleton = () => (
  <div className="p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
);

export default function TraderDashboardPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("today");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await traderApi.getDashboard(period);
      
      if (response.success && response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Set empty data on error
      setDashboardData({
        financialStats: {
          deals: { count: 0, amount: 0, amountRub: 0 },
          profit: { amount: 0, amountRub: 0 },
        },
        recentDeals: [],
        openDisputes: [],
        recentEvents: [],
        devices: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const periodLabels = {
    today: "за сегодня",
    week: "за неделю",
    month: "за месяц",
    year: "за год",
  };

  const getEventTypeInfo = (type: string) => {
    switch (type) {
      case "device_stopped":
        return { color: "bg-orange-500", title: "Устройство остановлено" };
      case "device_started":
        return { color: "bg-green-500", title: "Устройство запущено" };
      case "deal_failed":
        return { color: "bg-red-500", title: "Сделка не завершена" };
      case "dispute_opened":
        return { color: "bg-yellow-500", title: "Открыт спор" };
      default:
        return { color: "bg-gray-500", title: "Событие" };
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      READY: { label: "Готово", className: "bg-green-100 text-green-700 border-green-200" },
      IN_PROGRESS: { label: "В работе", className: "bg-blue-100 text-blue-700 border-blue-200" },
      CREATED: { label: "Ожидает", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
      EXPIRED: { label: "Истекло", className: "bg-red-100 text-red-700 border-red-200" },
      CANCELED: { label: "Отменено", className: "bg-gray-100 text-gray-700 border-gray-200" },
      DISPUTE: { label: "Спор", className: "bg-orange-100 text-orange-700 border-orange-200" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };
    return <Badge className={cn("text-xs", config.className)}>{config.label}</Badge>;
  };

  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold dark:text-[#eeeeee]">Главная</h1>
            <TraderHeader />
          </div>

          {/* Finance Section */}
          <section className="space-y-4">
            <div className="sticky top-0 z-10 bg-white dark:bg-[#0f0f0f] py-4 -mx-6 px-6 shadow-sm dark:shadow-none dark:border-b dark:border-gray-800">
              <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium dark:text-[#eeeeee]">Финансовая статистика</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-[#29382f]/50">
                    {periodLabels[period]}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="dark:bg-[#29382f] dark:border-gray-700">
                  <DropdownMenuItem onClick={() => setPeriod("today")} className="dark:hover:bg-[#29382f]/50">
                    За сегодня
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriod("week")} className="dark:hover:bg-[#29382f]/50">
                    За неделю
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriod("month")} className="dark:hover:bg-[#29382f]/50">
                    За месяц
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriod("year")} className="dark:hover:bg-[#29382f]/50">
                    За год
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>

            {loading ? (
              <FinanceStatsSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 dark:bg-[#29382f] dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Сделки</p>
                      <p className="text-2xl font-semibold dark:text-[#eeeeee]">
                        {dashboardData?.financialStats.deals.count || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Объем</p>
                      <p className="text-lg font-medium dark:text-[#eeeeee]">
                        {(dashboardData?.financialStats.deals.amount || 0).toFixed(2)} USDT
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ≈ {(dashboardData?.financialStats.deals.amountRub || 0).toFixed(0)} ₽
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 dark:bg-[#29382f] dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Прибыль</p>
                      <p className="text-2xl font-semibold text-[#006039] dark:text-[#2d6a42]">
                        {(dashboardData?.financialStats.profit.amount || 0).toFixed(2)} USDT
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">В рублях</p>
                      <p className="text-lg font-medium dark:text-[#eeeeee]">
                        ≈ {(dashboardData?.financialStats.profit.amountRub || 0).toFixed(0)} ₽
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </section>

          {/* Recent Deals */}
          <section className="space-y-4">
            <Link
              href="/trader/deals"
              className="flex items-center justify-between group"
            >
              <h2 className="text-lg font-medium">Последние сделки</h2>
              <div className="flex items-center gap-1 text-[#006039]">
                <span className="text-sm">Показать все</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Card className="overflow-hidden border-gray-200">
              <div className="divide-y divide-gray-100">
                {loading ? (
                  <>
                    <DealSkeleton />
                    <DealSkeleton />
                    <DealSkeleton />
                    <DealSkeleton />
                    <DealSkeleton />
                  </>
                ) : dashboardData?.recentDeals.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    Нет сделок
                  </div>
                ) : (
                  dashboardData?.recentDeals.map((deal: any) => (
                    <Link key={deal.id} href={`/trader/deals?id=${deal.id}`}>
                      <div className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {deal.requisites?.bankType ? (
                              getBankIcon(deal.requisites.bankType)
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {deal.numericId}
                              </p>
                              <p className="text-sm text-gray-600">
                                {deal.requisites?.bankType || "Неизвестный банк"} • {deal.clientName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(
                                  new Date(deal.createdAt),
                                  "d MMMM yyyy 'г.', в HH:mm",
                                  { locale: ru }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {deal.amount.toFixed(2)} USDT
                            </p>
                            <p className="text-sm text-gray-500">
                              {deal.amountRub.toFixed(0)} RUB
                            </p>
                            <div className="mt-1">
                              {getStatusBadge(deal.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </section>

          {/* Two column layout for middle sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Open Disputes */}
            <section className="space-y-4">
              <Link
                href="/trader/disputes"
                className="flex items-center justify-between group"
              >
                <h2 className="text-lg font-medium">Открытые споры</h2>
                <div className="flex items-center gap-1 text-[#006039]">
                  <span className="text-sm">Показать все</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Card className="overflow-hidden border-gray-200">
                <div className="divide-y divide-gray-100">
                  {loading ? (
                    <>
                      <DisputeSkeleton />
                      <DisputeSkeleton />
                      <DisputeSkeleton />
                      <DisputeSkeleton />
                      <DisputeSkeleton />
                    </>
                  ) : dashboardData?.openDisputes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      Споры не найдены
                    </div>
                  ) : (
                    dashboardData?.openDisputes.map((dispute: any) => (
                      <Link
                        key={dispute.id}
                        href={`/trader/disputes/${dispute.id}`}
                      >
                        <div className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <MessageSquare className="h-5 w-5 text-yellow-600" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {dispute.entityId}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {dispute.reason}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {format(
                                    new Date(dispute.createdAt),
                                    "d MMMM yyyy",
                                    { locale: ru }
                                  )}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-yellow-200 text-yellow-700 text-xs"
                            >
                              {dispute.status === "OPEN" ? "Открыт" : "В процессе"}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </Card>
            </section>

            {/* Recent Events */}
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Последние события</h2>
              <Card className="overflow-hidden border-gray-200">
                <div className="divide-y divide-gray-100">
                  {loading ? (
                    <>
                      <EventSkeleton />
                      <EventSkeleton />
                      <EventSkeleton />
                      <EventSkeleton />
                      <EventSkeleton />
                    </>
                  ) : dashboardData?.recentEvents.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      Нет последних событий
                    </div>
                  ) : (
                    dashboardData?.recentEvents.slice(0, 5).map((event: any) => {
                      const eventInfo = getEventTypeInfo(event.type);
                      return (
                        <div
                          key={event.id}
                          className="p-4 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full mt-2",
                                eventInfo.color
                              )}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{eventInfo.title}</p>
                              <p className="text-sm text-gray-600">
                                {event.description}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {format(
                                  new Date(event.createdAt),
                                  "d MMMM yyyy 'г.', в HH:mm",
                                  { locale: ru }
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </section>
          </div>

          {/* Devices */}
          <section className="space-y-4">
            <Link
              href="/trader/devices"
              className="flex items-center justify-between group"
            >
              <h2 className="text-lg font-medium">Устройства</h2>
              <div className="flex items-center gap-1 text-[#006039]">
                <span className="text-sm">Показать все</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Card className="overflow-hidden border-gray-200">
              <div className="divide-y divide-gray-100">
                {loading ? (
                  <>
                    <DeviceSkeleton />
                    <DeviceSkeleton />
                    <DeviceSkeleton />
                    <DeviceSkeleton />
                    <DeviceSkeleton />
                  </>
                ) : dashboardData?.devices.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    Нет устройств
                  </div>
                ) : (
                  dashboardData?.devices.map((device: any) => (
                    <Link key={device.id} href={`/trader/devices/${device.id}`}>
                      <div className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                device.isOnline
                                  ? "bg-green-100"
                                  : "bg-orange-100"
                              )}
                            >
                              <Smartphone
                                className={cn(
                                  "h-5 w-5",
                                  device.isOnline
                                    ? "text-green-600"
                                    : "text-orange-600"
                                )}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {device.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {device.token}
                              </p>
                              <p className="text-xs text-gray-500">
                                {device.activeRequisites} активных реквизитов
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={device.isActive ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {device.isActive ? "Активно" : "Неактивно"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </section>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}