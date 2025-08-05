"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { useTraderAuth } from "@/stores/auth";
import { formatAmount } from "@/lib/utils";
import { BtEntranceList } from "./bt-entrance-list";
import { BtRequisitesSheet } from "./bt-requisites-sheet";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  CreditCard,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Building2,
  Calendar,
  Eye,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Filter,
  Ban,
  Settings,
  Plus,
  CheckCircle2,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isWithoutDevice } from "@/lib/transactions";

// Функция для получения квадратных SVG логотипов банков
const getBankIcon = (bankType: string, size: "sm" | "md" = "md") => {
  const bankLogos: Record<string, string> = {
    SBERBANK: "/bank-logos/sberbank.svg",
    TBANK: "/bank-logos/tbank.svg",
    TINK: "/bank-logos/tbank.svg", // Map TINK to TBANK logo
    ALFABANK: "/bank-logos/alfabank.svg",
    VTB: "/bank-logos/vtb.svg",
    RAIFFEISEN: "/bank-logos/raiffeisen.svg",
    GAZPROMBANK: "/bank-logos/gazprombank.svg",
    POCHTABANK: "/bank-logos/pochtabank.svg",
    PROMSVYAZBANK: "/bank-logos/psb.svg",
    PSB: "/bank-logos/psb.svg",
    SOVCOMBANK: "/bank-logos/sovcombank.svg",
    SPBBANK: "/bank-logos/bspb.svg",
    BSPB: "/bank-logos/bspb.svg",
    ROSSELKHOZBANK: "/bank-logos/rshb.svg",
    RSHB: "/bank-logos/rshb.svg",
    OTKRITIE: "/bank-logos/otkritie.svg",
    URALSIB: "/bank-logos/uralsib.svg",
    MKB: "/bank-logos/mkb.svg",
    ROSBANK: "/bank-logos/rosbank.svg",
    ZENIT: "/bank-logos/zenit.svg",
    RUSSIAN_STANDARD: "/bank-logos/russian-standard.svg",
    AVANGARD: "/bank-logos/avangard.svg",
    RNKB: "/bank-logos/rnkb.svg",
    SBP: "/bank-logos/sbp.svg",
    AKBARS: "/bank-logos/akbars.svg",
  };

  const logoPath = bankLogos[bankType] || bankLogos[bankType?.toUpperCase()];
  const sizeClasses = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  if (logoPath) {
    return (
      <div
        className={`${sizeClasses} rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center p-1`}
      >
        <img
          src={logoPath}
          alt={bankType}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement!.innerHTML = `
              <svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            `;
          }}
        />
      </div>
    );
  }

  // Default neutral bank icon
  return (
    <div
      className={`${sizeClasses} rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center`}
    >
      <CreditCard className="w-5 h-5 text-gray-600" />
    </div>
  );
};

interface BtDeal {
  id: string;
  numericId: number;
  amount: number;
  merchantId: string;
  merchantName: string;
  methodType: string;
  bankType: string;
  cardNumber: string;
  recipientName: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  expiredAt?: string;
  requisiteId: string;
  commission: number;
  rate: number;
  btOnly: boolean;
  deviceId?: string | null;
  traderProfit?: number;
}

const dealStatusConfig = {
  PENDING: {
    label: "Ожидает принятия",
    description: "Новая сделка",
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock
  },
  ACCEPTED: {
    label: "Принята",
    description: "Сделка принята трейдером",
    color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    icon: AlertCircle
  },
  IN_PROGRESS: {
    label: "В процессе",
    description: "Сделка в процессе выполнения",
    color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    icon: AlertCircle
  },
  READY: {
    label: "Готово",
    description: "Сделка выполнена",
    color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    badgeColor: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle
  },
  EXPIRED: {
    label: "Просрочена",
    description: "Время выполнения истекло",
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle
  },
  CANCELLED: {
    label: "Отменена",
    description: "Сделка отменена",
    color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
    badgeColor: "bg-gray-50 text-gray-700 border-gray-200",
    icon: XCircle
  }
};

// Format card number function - now shows full card number
const formatCardNumber = (cardNumber: string) => {
  if (!cardNumber) return "****";
  // Show full card number with spaces for readability
  return cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
};

// Function to format remaining time
const formatRemainingTime = (expiredAt: string | undefined) => {
  if (!expiredAt) return "";
  
  const now = new Date().getTime();
  const expiresAt = new Date(expiredAt).getTime();
  const diff = expiresAt - now;

  if (diff <= 0) return "Истекло";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  } else {
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
};

export function BtEntranceDeals() {
  const { user } = useTraderAuth();
  const router = useRouter();
  const [deals, setDeals] = useState<BtDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("deals");
  const [showRequisitesSheet, setShowRequisitesSheet] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<BtDeal | null>(null);
  const [showRequisiteDetails, setShowRequisiteDetails] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDeals, setTotalDeals] = useState(0);

  useEffect(() => {
    fetchDeals();
  }, [filterStatus, searchQuery, currentPage]);

  // Автоматическое обновление списка сделок каждые 10 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDeals(false); // Без лоадера
    }, 10000); // 10 секунд

    return () => clearInterval(interval);
  }, [filterStatus, searchQuery, currentPage]);

  // Timer for countdown update - only update if there are IN_PROGRESS deals
  useEffect(() => {
    const hasInProgressDeals = deals.some(
      (deal) => deal.status === "ACCEPTED" || deal.status === "IN_PROGRESS"
    );

    if (hasInProgressDeals) {
      const timer = setInterval(() => {
        setForceUpdate((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [deals]);

  const fetchDeals = async (showLoader = true) => {
    try {
      if (showLoader && initialLoading) {
        setLoading(true);
      }
      const params = {
        page: currentPage,
        limit: 50,
        ...(filterStatus !== "all" && { status: filterStatus }),
        ...(searchQuery && { search: searchQuery }),
      };

      const response = await traderApi.getBtDeals(params);
      
      // Response already contains the full structure from API
      const apiDeals = response.data || [];
      
      // Debug first ready deal
      const readyDeal = apiDeals.find((d: any) => d.status === "READY");
      if (readyDeal) {
        console.log("[BT-Entrance] First READY deal:", readyDeal);
        console.log("[BT-Entrance] traderProfit:", readyDeal.traderProfit);
      }
      
      setDeals(apiDeals.filter(isWithoutDevice));
      setTotalDeals(response.total || 0);
      setTotalPages(Math.ceil((response.total || 0) / 50));
      
      if (initialLoading) {
        setInitialLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch BT deals:", error);
      // Не показываем ошибку при автоматическом обновлении
      if (showLoader) {
        toast.error("Не удалось загрузить BT сделки");
      }
    } finally {
      if (showLoader && loading) {
        setLoading(false);
      }
    }
  };

  const handleStatusUpdate = async (dealId: string, newStatus: string) => {
    try {
      await traderApi.updateBtDealStatus(dealId, newStatus);
      toast.success("Статус сделки обновлен");
      
      // Обновляем список сделок
      fetchDeals();
      
      // Обновляем данные пользователя для левого меню
      if (user) {
        const userResponse = await traderApi.getMe();
        useTraderAuth.getState().setUser(userResponse.data);
      }
    } catch (error) {
      console.error("Failed to update deal status:", error);
      toast.error("Не удалось обновить статус сделки");
    }
  };

  const filteredDeals = deals.filter((deal) => {
    if (!isWithoutDevice(deal)) return false;
    if (filterStatus !== "all" && deal.status !== filterStatus) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        deal.numericId.toString().includes(query) ||
        deal.merchantName.toLowerCase().includes(query) ||
        deal.cardNumber.includes(query) ||
        deal.recipientName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Debug logging
  console.log("[BT-Entrance] deals array:", deals);
  console.log("[BT-Entrance] filteredDeals:", filteredDeals);
  console.log("[BT-Entrance] filterStatus:", filterStatus);
  console.log("[BT-Entrance] searchQuery:", searchQuery);

  if (loading && initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">БТ-Вход</h1>
          <p className="text-gray-600 mt-2">
            Сделки для реквизитов без устройств (ручная обработка)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            console.log('Opening BT Requisites Sheet');
            setShowRequisitesSheet(true);
          }}>
            <Settings className="h-4 w-4 mr-2" />
            Реквизиты БТ
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="PENDING">Ожидает принятия</SelectItem>
              <SelectItem value="ACCEPTED">Принята</SelectItem>
              <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
              <SelectItem value="READY">Готово</SelectItem>
              <SelectItem value="EXPIRED">Просрочена</SelectItem>
              <SelectItem value="CANCELLED">Отменена</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Поиск по номеру, мерчанту, карте..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Deals List */}
      <div className="space-y-3">
        {filteredDeals.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? "Сделки не найдены" : "Нет сделок БТ-входа"}
            </p>
          </Card>
        ) : (
          filteredDeals.map((deal) => {
            const statusConfig = dealStatusConfig[deal.status as keyof typeof dealStatusConfig];
            const StatusIcon = statusConfig?.icon || Clock;

            return (
              <Card
                key={deal.id}
                className="group hover:shadow-lg transition-all cursor-pointer border-gray-200 dark:border-gray-700"
                onClick={() => setSelectedDeal(deal)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left section */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Status Icon */}
                      <div className={cn(
                        "p-3 rounded-xl",
                        statusConfig?.color?.split(" ")[0] || "bg-gray-100"
                      )}>
                        <StatusIcon className="h-6 w-6" />
                      </div>

                      {/* Deal Info */}
                      <div className="flex-1 space-y-3">
                        {/* Status and Date */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-base">
                              Сделка #{deal.numericId}
                            </h3>
                            <span className="text-sm text-muted-foreground">
                              • {(deal.status === "ACCEPTED" || deal.status === "IN_PROGRESS") && deal.expiredAt 
                                ? formatRemainingTime(deal.expiredAt)
                                : statusConfig?.label || "Неизвестный статус"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(deal.createdAt), "d MMMM yyyy 'г.', 'в' HH:mm", { locale: ru })}
                          </p>
                        </div>

                        {/* Deal Details */}
                        <div className="flex items-center gap-6">
                          {/* Bank and Card */}
                          <div className="flex items-center gap-3">
                            {getBankIcon(deal.bankType, "sm")}
                            <div>
                              <p className="text-sm font-medium">
                                {formatCardNumber(deal.cardNumber)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {deal.recipientName || "Неизвестно"}
                              </p>
                            </div>
                          </div>

                          {/* Amount */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-primary">
                                {formatAmount(deal.amount)}
                              </span>
                              <span className="text-sm text-muted-foreground">RUB</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {(deal.amount / deal.rate).toFixed(2)} USDT • Курс: {deal.rate.toFixed(2)}
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* Right section - Actions */}
                    <div className="flex items-center gap-3">
                      {deal.status === "PENDING" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(deal.id, "ACCEPTED")}
                        >
                          Принять
                        </Button>
                      )}
                      {(deal.status === "ACCEPTED" || deal.status === "IN_PROGRESS") && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(deal.id, "READY")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Подтвердить
                        </Button>
                      )}
                      <Badge 
                        className={cn(
                          "px-3 py-1.5",
                          statusConfig?.badgeColor || "bg-gray-50 text-gray-700 border-gray-200"
                        )}
                      >
                        {(deal.status === "ACCEPTED" || deal.status === "IN_PROGRESS") && deal.expiredAt 
                          ? formatRemainingTime(deal.expiredAt)
                          : statusConfig?.label || deal.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Additional info */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-muted-foreground">
                      БТ-сделка (ручная обработка)
                    </span>
                    {deal.status === "READY" && deal.traderProfit != null && (
                      <>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                          Прибыль: +{deal.traderProfit.toFixed(2)} USDT
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Предыдущая
          </Button>
          <span className="text-sm text-muted-foreground">
            Страница {currentPage} из {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Следующая
          </Button>
        </div>
      )}

      {/* BT Requisites Sheet */}
      <BtRequisitesSheet
        open={showRequisitesSheet}
        onOpenChange={setShowRequisitesSheet}
        onSuccess={() => {
          // Optionally refresh deals after adding new requisite
        }}
      />

      {/* Deal Details Dialog */}
      <Dialog
        open={!!selectedDeal}
        onOpenChange={() => {
          setSelectedDeal(null);
          setShowRequisiteDetails(false);
        }}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] md:w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background dark:border-gray-700 p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden rounded-2xl md:rounded-3xl">
            {/* Hidden DialogTitle for accessibility */}
            <DialogTitle className="sr-only">
              {showRequisiteDetails
                ? "Информация о реквизите"
                : "Детали сделки"}
            </DialogTitle>
            <div className="bg-white dark:bg-gray-800">
              {/* Header */}
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                {showRequisiteDetails ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRequisiteDetails(false)}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 -ml-2"
                    >
                      <ChevronDown className="h-4 w-4 mr-1 rotate-90 text-[#006039]" />
                      Назад
                    </Button>
                    <h3 className="font-medium dark:text-white">
                      Информация о реквизите
                    </h3>
                    <div className="w-8" />
                  </>
                ) : (
                  <>
                    <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 ml-0 md:ml-[124px]">
                      {selectedDeal &&
                        format(
                          new Date(selectedDeal.createdAt),
                          "d MMM 'в' HH:mm",
                          { locale: ru },
                        )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDeal(null);
                        setShowRequisiteDetails(false);
                      }}
                      className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                      <X className="h-4 w-4 text-[#006039]" />
                    </Button>
                  </>
                )}
              </div>

              {selectedDeal && !showRequisiteDetails && (
                <>
                  {/* Status Icon and Info */}
                  <div className="px-6 py-6 text-center">
                    {/* Status Icon */}
                    <div className="mb-4 flex justify-center">
                      {selectedDeal.status === "READY" ? (
                        <div className="w-20 h-20 rounded-3xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                      ) : selectedDeal.status === "PENDING" ||
                        selectedDeal.status === "ACCEPTED" ||
                        selectedDeal.status === "IN_PROGRESS" ? (
                        <div className="w-20 h-20 rounded-3xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Clock className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-3xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <X className="h-10 w-10 text-red-600 dark:text-red-400" />
                        </div>
                      )}
                    </div>

                    {/* Deal Title */}
                    <h2 className="text-lg font-semibold mb-1 dark:text-white">
                      {selectedDeal.status === "READY"
                        ? "Платеж зачислен"
                        : selectedDeal.status === "PENDING"
                          ? "Ожидание принятия"
                          : selectedDeal.status === "ACCEPTED" || selectedDeal.status === "IN_PROGRESS"
                            ? "Ожидание платежа"
                            : selectedDeal.status === "EXPIRED"
                              ? "Время истекло"
                              : "Платеж не зачислен"}
                    </h2>

                    {/* Deal ID */}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      #{selectedDeal.id.slice(-6)}
                    </p>

                    {/* Amount */}
                    <div className="mb-1">
                      <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {(selectedDeal.amount / selectedDeal.rate).toFixed(2)} USDT
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedDeal.amount.toLocaleString("ru-RU")} RUB
                    </p>
                  </div>

                  {/* Requisite Card */}
                  <div className="px-6 pb-4">
                    <Button
                      variant="outline"
                      className="w-full p-4 h-auto justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:bg-gray-800 dark:border-gray-700"
                      onClick={() => setShowRequisiteDetails(true)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-[92px] h-[62px] rounded-md bg-gradient-to-tr from-green-800 via-green-400 to-green-400 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-800  to-transparent"></div>
                          <div className="absolute top-2 right-4">
                            <svg
                              viewBox="0 0 30 18"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-6 h-4"
                            >
                              <circle
                                cx="9"
                                cy="9"
                                r="9"
                                fill="#fff"
                                fillOpacity="0.8"
                              ></circle>
                              <circle
                                cx="21"
                                cy="9"
                                r="9"
                                fill="#fff"
                                fillOpacity="0.8"
                              ></circle>
                            </svg>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-xl dark:text-white">
                            {selectedDeal.recipientName || "—"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedDeal.cardNumber
                              ?.replace(/(\d{4})(?=\d)/g, "$1 ")
                              .trim() || "—"}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5 text-[#006039] -rotate-90" />
                    </Button>
                  </div>

                  {/* Deal Details */}
                  <div className="px-6 pb-4 space-y-3">
                    {/* Rate */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Ставка
                        </span>
                        <span className="text-lg font-semibold dark:text-white">
                          1 USDT = {selectedDeal.rate.toFixed(2)} RUB
                        </span>
                      </div>
                    </div>

                    {/* Profit */}
                    {selectedDeal.status === "READY" && selectedDeal.traderProfit != null && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Прибыль
                          </span>
                          <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                            + {selectedDeal.traderProfit.toFixed(2)} USDT
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6">
                    {selectedDeal.status === "READY" ? (
                      <div className="text-center space-y-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Сделка готова к закрытию
                        </p>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => setSelectedDeal(null)}
                        >
                          Закрыть
                        </Button>
                      </div>
                    ) : selectedDeal.status === "ACCEPTED" || selectedDeal.status === "IN_PROGRESS" ? (
                      <div className="flex flex-col gap-2">
                        <Button
                          className="w-full bg-[#006039] hover:bg-[#006039]/90"
                          onClick={() => {
                            handleStatusUpdate(selectedDeal.id, "READY");
                            setSelectedDeal(null);
                          }}
                        >
                          Подтвердить платеж
                        </Button>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => setSelectedDeal(null)}
                        >
                          Отмена
                        </Button>
                      </div>
                    ) : selectedDeal.status === "PENDING" ? (
                      <div className="flex flex-col gap-2">
                        <Button
                          className="w-full bg-[#006039] hover:bg-[#006039]/90"
                          onClick={() => {
                            handleStatusUpdate(selectedDeal.id, "ACCEPTED");
                            setSelectedDeal(null);
                          }}
                        >
                          Принять сделку
                        </Button>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => setSelectedDeal(null)}
                        >
                          Отмена
                        </Button>
                      </div>
                    ) : selectedDeal.status === "EXPIRED" ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-3">
                          Срок сделки истек
                        </p>
                        <Button
                          className="w-full bg-orange-600 hover:bg-orange-700"
                          onClick={() => {
                            handleStatusUpdate(selectedDeal.id, "READY");
                            setSelectedDeal(null);
                          }}
                        >
                          Закрыть вручную
                        </Button>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => setSelectedDeal(null)}
                        >
                          Отмена
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setSelectedDeal(null)}
                      >
                        Закрыть
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* Requisite Details View */}
              {selectedDeal && showRequisiteDetails && (
                <div className="">
                  {/* Requisite Header */}
                  <div className="px-6 py-6 text-center border-b dark:border-gray-700">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                      {selectedDeal.bankType && (
                        <div className="scale-125">
                          {getBankIcon(selectedDeal.bankType)}
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-1 dark:text-white">
                      {selectedDeal.recipientName || "—"}
                    </h3>
                    <p className="text-2xl font-bold mb-1 dark:text-white">
                      {selectedDeal.cardNumber || "—"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Банк: {selectedDeal.bankType || "—"} • Россия
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Счет: {selectedDeal.id?.slice(-8) || "00000000"}
                    </p>
                  </div>

                  {/* Requisite Stats */}
                  <div className="px-6 py-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Прием по номеру карты: Не подтверждено
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-blue-600 dark:text-blue-400 p-0 h-auto"
                        >
                          Карта выбрана как основная
                        </Button>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Прием по номеру счета: Не подтверждено
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Прием по номеру телефона: Подтверждено
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm dark:text-white">
                        Статистика за 24 часа
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Объем сделок
                          </span>
                          <span className="font-medium dark:text-white">
                            {(selectedDeal.amount / selectedDeal.rate).toFixed(2)} USDT = {selectedDeal.amount} RUB{" "}
                            <span className="text-gray-400 dark:text-gray-500">
                              (1 сделка)
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Прибыль
                          </span>
                          <span className="font-medium dark:text-white">
                            {selectedDeal.traderProfit ? selectedDeal.traderProfit.toFixed(2) : "0.00"} USDT
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Конверсия
                          </span>
                          <span className="font-medium text-gray-400 dark:text-gray-500">
                            100%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <h4 className="font-medium text-sm dark:text-white">
                        Управление реквизитом
                      </h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                          onClick={() => toast.info("Функция в разработке")}
                        >
                          <X className="h-4 w-4 mr-2 text-red-500" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}