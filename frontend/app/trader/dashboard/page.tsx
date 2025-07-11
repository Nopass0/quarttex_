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
} from "lucide-react";
import { cn } from "@/lib/utils";

// Функция для получения квадратных SVG логотипов банков
const getBankIcon = (bankType: string) => {
  const bankLogos: Record<string, string> = {
    SBERBANK: "/bank-logos/sberbank.svg",
    TBANK: "/bank-logos/tbank.svg",
    ALFABANK: "/bank-logos/alfabank.svg",
    VTB: "/bank-logos/vtb.svg",
    RAIFFEISEN: "/bank-logos/raiffeisen.svg",
    GAZPROMBANK: "/bank-logos/gazprombank.svg",
    POCHTABANK: "/bank-logos/pochtabank.svg",
    PROMSVYAZBANK: "/bank-logos/psb.svg",
    SOVCOMBANK: "/bank-logos/sovcombank.svg",
    SPBBANK: "/bank-logos/bspb.svg",
    ROSSELKHOZBANK: "/bank-logos/rshb.svg",
    OTKRITIE: "/bank-logos/otkritie.svg",
    URALSIB: "/bank-logos/uralsib.svg",
    MKB: "/bank-logos/mkb.svg",
    MTSBANK: "/bank-logos/psb.svg",
    OZONBANK: "/bank-logos/psb.svg",
    AKBARS: "/bank-logos/akbars.svg",
    DEFAULT: "/bank-logos/sberbank.svg"
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

interface FinanceStats {
  deals: {
    amount: number;
    amountRub: number;
    count: number;
  };
  profit: {
    amount: number;
    amountRub: number;
  };
}

interface Event {
  id: string;
  type: "device_stopped" | "device_started" | "deal_failed" | "dispute_opened";
  title: string;
  description: string;
  timestamp: string;
  link?: string;
  deviceName?: string;
  deviceId?: string;
}

// Dummy data for mock events
const mockEvents: Event[] = [
  {
    id: "1",
    type: "device_stopped",
    title: "Устройство остановлено",
    description: "Устройство iPhone 13 Pro остановлено в 14:30",
    timestamp: new Date().toISOString(),
    deviceName: "iPhone 13 Pro",
    deviceId: "device_001",
  },
  {
    id: "2",
    type: "deal_failed",
    title: "Платеж не зачислен",
    description: "Сделка №12345 не завершена",
    timestamp: new Date().toISOString(),
  },
];

export default function TraderDashboardPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">(
    "today",
  );
  const [financeStats, setFinanceStats] = useState<FinanceStats>({
    deals: { amount: 0, amountRub: 0, count: 0 },
    profit: { amount: 0, amountRub: 0 },
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  // Моковые данные для сделок
  const mockRecentDeals = [
    {
      id: "mock_1",
      numericId: 1450,
      amount: 83.5,
      currency: "RUB",
      status: "READY",
      clientName: "Кузнецов Алексей",
      createdAt: new Date().toISOString(),
      requisites: {
        bankType: "SBERBANK",
        cardNumber: "4276 **** **** 1234",
        recipientName: "Кузнецов Алексей"
      }
    },
    {
      id: "mock_2", 
      numericId: 1451,
      amount: 1184.2,
      currency: "RUB",
      status: "IN_PROGRESS",
      clientName: "Соколова Иван",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      requisites: {
        bankType: "TBANK",
        cardNumber: "5536 **** **** 5678",
        recipientName: "Соколова Иван"
      }
    },
    {
      id: "mock_3",
      numericId: 1452,
      amount: 653.1,
      currency: "RUB", 
      status: "CREATED",
      clientName: "Васильева Дмитрий",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      requisites: {
        bankType: "VTB",
        cardNumber: "4277 **** **** 9012",
        recipientName: "Васильева Дмитрий"
      }
    },
    {
      id: "mock_4",
      numericId: 1453,
      amount: 675.8,
      currency: "RUB", 
      status: "DISPUTE",
      clientName: "Смирнова Татьяна",
      createdAt: new Date(Date.now() - 10800000).toISOString(),
      requisites: {
        bankType: "ALFABANK",
        cardNumber: "5477 **** **** 3456",
        recipientName: "Смирнова Татьяна"
      }
    },
    {
      id: "mock_5",
      numericId: 1454,
      amount: 72.4,
      currency: "RUB", 
      status: "EXPIRED",
      clientName: "Волков Ольга",
      createdAt: new Date(Date.now() - 14400000).toISOString(),
      requisites: {
        bankType: "GAZPROMBANK",
        cardNumber: "5555 **** **** 7890",
        recipientName: "Волков Ольга"
      }
    }
  ];

  const [recentDeals, setRecentDeals] = useState<any[]>(mockRecentDeals);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [transactionsResponse, devicesData] = await Promise.all([
        traderApi.getTransactions({ limit: 10 }),
        traderApi.getDevices(),
      ]);

      const dealsData = transactionsResponse.transactions || [];
      const disputesData = []; // Mock data since no disputes endpoint exists
      
      console.log('Dashboard data:', { 
        transactionsResponse, 
        dealsData: dealsData.length, 
        devicesData: devicesData.devices?.length || 0 
      });

      // Calculate finance stats based on period
      const now = new Date();
      const filteredDeals = dealsData.filter((deal: any) => {
        const dealDate = new Date(deal.createdAt);
        switch (period) {
          case "today":
            return dealDate.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return dealDate >= weekAgo;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return dealDate >= monthAgo;
          case "year":
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            return dealDate >= yearAgo;
          default:
            return true;
        }
      });

      // Calculate stats
      const totalDeals = filteredDeals.length;
      const totalAmount = filteredDeals.reduce(
        (sum: number, deal: any) => sum + deal.amount,
        0,
      );
      const totalAmountRub = totalAmount * 100; // Mock conversion rate

      const profit = filteredDeals
        .filter((deal: any) => deal.status === "READY")
        .reduce((sum: number, deal: any) => sum + deal.amount * 0.02, 0); // 2% profit

      setFinanceStats({
        deals: {
          amount: totalAmount,
          amountRub: totalAmountRub,
          count: totalDeals,
        },
        profit: { amount: profit, amountRub: profit * 100 },
      });

      // Mock device events
      const deviceEvents = (devicesData.devices || [])
        .filter((device: any) => !device.isOnline)
        .map((device: any) => ({
          id: `device-${device.id}`,
          type: "device_stopped" as const,
          title: "Устройство остановлено",
          description: `Устройство ${device.name} остановлено`,
          timestamp: new Date().toISOString(),
          deviceName: device.name,
          deviceId: device.id,
          link: `/trader/devices/${device.id}`,
        }));

      // Mock failed deals
      const failedDeals = dealsData
        .filter((deal: any) => deal.status === "FAILED")
        .map((deal: any) => ({
          id: `deal-${deal.id}`,
          type: "deal_failed" as const,
          title: "Платеж не зачислен",
          description: `Сделка №${deal.numericId} не завершена`,
          timestamp: deal.createdAt,
          link: `/trader/deals?id=${deal.id}`,
        }));

      setEvents(
        [...deviceEvents, ...failedDeals]
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )
          .slice(0, 5),
      );

      setDevices(devicesData.devices?.slice(0, 5) || []);
      setDisputes(disputesData.slice(0, 5));
      
      // Объединяем реальные данные с моковыми или используем только моковые
      const combinedDeals = dealsData.length > 0 ? dealsData.slice(0, 10) : mockRecentDeals;
      setRecentDeals(combinedDeals);
      
      console.log('Recent deals set:', combinedDeals);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Set mock data on error
      setEvents(mockEvents);
      setDevices([]);
      setDisputes([]);
      
      // Используем предустановленные моковые данные
      setRecentDeals(mockRecentDeals);
      console.log('Set mock recent deals on error:', mockRecentDeals);
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

  if (loading) {
    return (
      <ProtectedRoute variant="trader">
        <AuthLayout variant="trader">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#006039]" />
          </div>
        </AuthLayout>
      </ProtectedRoute>
    );
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
              <h2 className="text-lg font-medium">Финансовая статистика</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {periodLabels[period]}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setPeriod("today")}>
                    За сегодня
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriod("week")}>
                    За неделю
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriod("month")}>
                    За месяц
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriod("year")}>
                    За год
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Сделки</p>
                    <p className="text-2xl font-semibold">
                      {financeStats.deals.count}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Объем</p>
                    <p className="text-lg font-medium">
                      {financeStats.deals.amount.toFixed(2)} USDT
                    </p>
                    <p className="text-sm text-gray-500">
                      ≈ {financeStats.deals.amountRub.toFixed(0)} ₽
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Прибыль</p>
                    <p className="text-2xl font-semibold text-[#006039]">
                      {financeStats.profit.amount.toFixed(2)} USDT
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">В рублях</p>
                    <p className="text-lg font-medium">
                      ≈ {financeStats.profit.amountRub.toFixed(0)} ₽
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Recent Events and Devices in one row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Events */}
            <section>
              <h2 className="text-lg font-medium mb-4">Последние события</h2>
              <div className="space-y-1">
                {events.length === 0 ? (
                  <Card className="p-6 text-center text-gray-500">
                    Нет последних событий
                  </Card>
                ) : (
                  events.map((event) => (
                    <Link key={event.id} href={event.link || "#"}>
                      <div className="border-b border-gray-100 p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full mt-2",
                              event.type === "device_stopped"
                                ? "bg-orange-500"
                                : "bg-red-500",
                            )}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{event.title}</p>
                            <p className="text-xs text-gray-500">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {/* Devices */}
            <section>
              <Link
                href="/trader/devices"
                className="flex items-center justify-between mb-4 group"
              >
                <h2 className="text-lg font-medium">Устройства</h2>
                <div className="flex items-center gap-1 text-[#006039]">
                  <span className="text-sm">Показать все</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <div className="space-y-1">
                {devices.length === 0 ? (
                  <Card className="p-6 text-center text-gray-500">
                    Нет устройств
                  </Card>
                ) : (
                  devices.map((device) => (
                    <Link key={device.id} href={`/trader/devices/${device.id}`}>
                      <div className="border-b border-gray-100 p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                device.isOnline
                                  ? "bg-green-100"
                                  : "bg-orange-100",
                              )}
                            >
                              <Smartphone
                                className={cn(
                                  "h-4 w-4",
                                  device.isOnline
                                    ? "text-green-600"
                                    : "text-orange-600",
                                )}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {device.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {device.id}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={device.isOnline ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {device.isOnline ? "В работе" : "Не в работе"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Disputes and Recent Deals full width */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            {/* Open Disputes */}
            <section>
              <Link
                href="/trader/disputes"
                className="flex items-center justify-between mb-4 group"
              >
                <h2 className="text-lg font-medium">Открытые споры</h2>
                <div className="flex items-center gap-1 text-[#006039]">
                  <span className="text-sm">Показать все</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <div className="space-y-1">
                {disputes.length === 0 ? (
                  <Card className="p-6 text-center text-gray-500">
                    Споры не найдены
                  </Card>
                ) : (
                  disputes.map((dispute) => (
                    <Link
                      key={dispute.id}
                      href={`/trader/disputes/${dispute.id}`}
                    >
                      <div className="border-b border-gray-100 p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 text-yellow-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                Спор #{dispute.id}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(
                                  new Date(dispute.createdAt),
                                  "d MMMM yyyy",
                                  { locale: ru },
                                )}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-yellow-200 text-yellow-700 text-xs"
                          >
                            Открыт
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {/* Recent Deals */}
            <section>
              <Link
                href="/trader/deals"
                className="flex items-center justify-between mb-4 group"
              >
                <h2 className="text-lg font-medium">Последние сделки</h2>
                <div className="flex items-center gap-1 text-[#006039]">
                  <span className="text-sm">Показать все</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <div className="space-y-1">
                {recentDeals.length === 0 ? (
                  <Card className="p-6 text-center text-gray-500">
                    Нет сделок
                  </Card>
                ) : (
                  <>
                    {console.log('Rendering recent deals:', recentDeals.length)}
                    {recentDeals.slice(0, 10).map((deal) => (
                    <Link key={deal.id} href={`/trader/deals?id=${deal.id}`}>
                      <div className="border-b border-gray-100 p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {deal.requisites?.bankType ? 
                              getBankIcon(deal.requisites.bankType) :
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-gray-500" />
                              </div>
                            }
                            <div>
                              <p className="text-sm font-medium">
                                Сделка #{deal.numericId}
                              </p>
                              <p className="text-xs text-gray-500">
                                {deal.requisites?.bankType || "Неизвестный банк"} • {deal.clientName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(
                                  new Date(deal.createdAt),
                                  "d MMMM yyyy 'г.', в HH:mm",
                                  { locale: ru },
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {deal.amount.toFixed(2)} USDT
                            </p>
                            <p className="text-xs text-gray-500">
                              {(deal.amount * 100).toFixed(0)} RUB
                            </p>
                            <Badge
                              variant={deal.status === "READY" ? "default" : "secondary"}
                              className={cn(
                                "text-xs mt-1",
                                deal.status === "READY" && "bg-green-100 text-green-700 border-green-200",
                                deal.status === "IN_PROGRESS" && "bg-blue-100 text-blue-700 border-blue-200",
                                deal.status === "CREATED" && "bg-yellow-100 text-yellow-700 border-yellow-200",
                                deal.status === "EXPIRED" && "bg-red-100 text-red-700 border-red-200",
                                deal.status === "CANCELED" && "bg-gray-100 text-gray-700 border-gray-200",
                                deal.status === "DISPUTE" && "bg-orange-100 text-orange-700 border-orange-200"
                              )}
                            >
                              {deal.status === "READY" ? "Готово" :
                               deal.status === "IN_PROGRESS" ? "В работе" :
                               deal.status === "CREATED" ? "Ожидает" :
                               deal.status === "EXPIRED" ? "Истекло" :
                               deal.status === "CANCELED" ? "Отменено" :
                               deal.status === "DISPUTE" ? "Спор" : deal.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Link>
                    ))}
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}
