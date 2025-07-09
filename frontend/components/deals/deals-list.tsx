"use client";

import { useState, useEffect } from "react";
import "./deals-list.css";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { useTraderAuth } from "@/stores/auth";
import { useRouter } from "next/navigation";
import { useTraderStore } from "@/stores/trader";
import { TraderHeader } from "@/components/trader/trader-header";
import {
  Loader2,
  MoreVertical,
  ChevronDown,
  Copy,
  Eye,
  MessageSquare,
  CreditCard,
  Smartphone,
  Clock,
  CheckCircle,
  X,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Building2,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RequisiteInfoModal } from "@/components/requisites/requisite-info-modal";

interface Transaction {
  id: string;
  numericId: number;
  amount: number;
  currency: string | null;
  status: string;
  clientName: string;
  assetOrBank: string;
  createdAt: string;
  acceptedAt: string | null;
  expired_at: string;
  isNew?: boolean;
  rate?: number | null;
  frozenUsdtAmount?: number | null;
  calculatedCommission?: number | null;
  merchant?: {
    id: string;
    name: string;
  };
  method?: {
    id: string;
    name: string;
    type: string;
  };
  requisites?: {
    id: string;
    recipientName: string;
    cardNumber: string;
    bankType: string;
  } | null;
  receipts?: Array<{
    id: string;
    fileName: string;
    isChecked: boolean;
    isFake: boolean;
  }>;
}

const statusConfig = {
  CREATED: {
    label: "Ожидает",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  IN_PROGRESS: {
    label: "В работе",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  READY: {
    label: "Выполнено",
    color: "bg-green-50 text-green-600 border-green-200",
  },
  EXPIRED: { label: "Истекло", color: "bg-red-50 text-red-600 border-red-200" },
  CANCELED: {
    label: "Отменено",
    color: "bg-gray-50 text-gray-600 border-gray-200",
  },
};

// Function to format remaining time
const formatRemainingTime = (expiredAt: string) => {
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

export function DealsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAmount, setFilterAmount] = useState({
    exact: "",
    min: "",
    max: "",
  });
  const [filterAmountType, setFilterAmountType] = useState("range");
  const [filterDevice, setFilterDevice] = useState("all");
  const [filterRequisite, setFilterRequisite] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [, forceUpdate] = useState(0); // Force component re-render for countdown
  const [showRequisiteDetails, setShowRequisiteDetails] = useState(false);
  const [showRequisiteInfoModal, setShowRequisiteInfoModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Bank logos mapping
  const bankLogos: Record<string, string> = {
    SBERBANK: "https://cdn.brandfetch.io/sberbank.ru/logo/theme/dark/h/64/w/64",
    TBANK: "https://cdn.brandfetch.io/tbank.ru/logo/theme/dark/h/64/w/64",
    VTB: "https://cdn.brandfetch.io/vtb.com/logo/theme/dark/h/64/w/64",
    ALFABANK:
      "https://cdn.brandfetch.io/alfabank.com/logo/theme/dark/h/64/w/64",
    RAIFFEISEN:
      "https://cdn.brandfetch.io/raiffeisen.ru/logo/theme/dark/h/64/w/64",
    OPEN: "https://cdn.brandfetch.io/open.ru/logo/theme/dark/h/64/w/64",
    GAZPROMBANK:
      "https://cdn.brandfetch.io/gazprombank.ru/logo/theme/dark/h/64/w/64",
    ROSBANK: "https://cdn.brandfetch.io/rosbank.ru/logo/theme/dark/h/64/w/64",
  };

  const router = useRouter();
  const setFinancials = useTraderStore((state) => state.setFinancials);
  const financials = useTraderStore((state) => state.financials);

  const confirmPayment = async (transactionId: string) => {
    try {
      await traderApi.updateTransactionStatus(transactionId, "READY");
      toast.success("Платеж подтвержден");

      // Update the transaction status locally
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId ? { ...tx, status: "READY" } : tx,
        ),
      );

      setSelectedTransaction(null);

      // Refresh both transactions and profile to update profit
      await Promise.all([fetchTransactions(), fetchTraderProfile()]);
    } catch (error) {
      toast.error("Не удалось подтвердить платеж");
    }
  };

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100
      ) {
        if (!loadingMore && hasMore) {
          setLoadingMore(true);
          const nextPage = page + 1;
          setPage(nextPage);
          fetchTransactions(nextPage, true);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadingMore, hasMore, page]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await fetchTransactions();
        await fetchTraderProfile();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []); // Only run on mount

  // Set up polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Only fetch if not already loading
      if (!loading && !loadingMore) {
        fetchTransactions(1, false);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Timer for countdown update - only update if there are pending transactions
  useEffect(() => {
    const hasPendingTransactions = transactions.some(
      (t) => t.status === "CREATED" || t.status === "IN_PROGRESS",
    );

    if (hasPendingTransactions) {
      const timer = setInterval(() => {
        forceUpdate((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [transactions]);

  const fetchTransactions = async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await traderApi.getTransactions({
        page: pageNum,
        limit: 50,
      });
      console.log("[DealsList] API Response:", response);
      // Handle both response formats
      const txData = response.data || response.transactions || [];
      const hasMoreData = txData.length === 50; // If we get full page, there might be more

      console.log("[DealsList] Transactions data:", txData.length, "items");

      // Mark new transactions using callback to get current state
      setTransactions((currentTransactions) => {
        const existingIds = new Set(currentTransactions.map((t) => t.id));
        const newTransactions: Transaction[] = [];

        const newData = txData.map((tx: Transaction) => {
          if (!existingIds.has(tx.id) && !loading && append) {
            // New transaction - mark it and show toast
            newTransactions.push(tx);
            return { ...tx, isNew: true };
          }
          return { ...tx, isNew: false };
        });

        // Show toast for new transactions
        if (newTransactions.length > 0 && !loading && append && pageNum === 1) {
          newTransactions.forEach((tx) => {
            toast.success(`Новая сделка #${tx.numericId}`, {
              description: `${tx.amount.toLocaleString("ru-RU")} ₽ от ${tx.clientName}`,
            });
          });

          // Remove "new" flag after animation
          setTimeout(() => {
            setTransactions((prev) =>
              prev.map((tx) => ({ ...tx, isNew: false })),
            );
          }, 500);
        }

        return append ? [...currentTransactions, ...newData] : newData;
      });

      setHasMore(hasMoreData);
      console.log("[DealsList] Transactions set in state");
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      if (loading) {
        toast.error("Не удалось загрузить сделки");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchTraderProfile = async () => {
    try {
      const response = await traderApi.getProfile();

      // Update financials in store
      if (response) {
        const {
          trustBalance,
          profitFromDeals,
          profitFromPayouts,
          frozenUsdt,
          frozenRub,
          balanceUsdt,
          balanceRub,
        } = response;
        setFinancials({
          trustBalance: trustBalance || 0,
          profitFromDeals: profitFromDeals || 0,
          profitFromPayouts: profitFromPayouts || 0,
          frozenUsdt: frozenUsdt || 0,
          frozenRub: frozenRub || 0,
          balanceUsdt: balanceUsdt || 0,
          balanceRub: balanceRub || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };


  const getFilteredTransactions = () => {
    let filtered = transactions;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((t) => {
        // Calculate USDT amount for search
        const usdtAmount = t.frozenUsdtAmount
          ? t.frozenUsdtAmount
          : t.rate
            ? t.amount / t.rate
            : t.amount / 95;

        return (
          t.numericId.toString().includes(searchQuery) ||
          t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.requisites?.bankType || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (t.merchant?.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (t.requisites?.cardNumber || "").includes(searchQuery) ||
          (t.requisites?.recipientName || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          t.amount.toString().includes(searchQuery) || // Search by RUB amount
          usdtAmount.toFixed(2).includes(searchQuery) || // Search by USDT amount
          Math.round(usdtAmount).toString().includes(searchQuery) // Search by rounded USDT
        );
      });
    }

    // Status filter
    if (filterStatus !== "all") {
      switch (filterStatus) {
        case "not_credited":
          filtered = filtered.filter(
            (t) =>
              t.status === "CREATED" ||
              t.status === "EXPIRED" ||
              t.status === "CANCELED",
          );
          break;
        case "credited":
          filtered = filtered.filter((t) => t.status === "READY");
          break;
        case "in_progress":
          filtered = filtered.filter((t) => t.status === "IN_PROGRESS");
          break;
      }
    }

    // Amount filter
    if (filterAmountType === "exact" && filterAmount.exact) {
      filtered = filtered.filter(
        (t) => t.amount === parseFloat(filterAmount.exact),
      );
    } else if (filterAmountType === "range") {
      if (filterAmount.min) {
        filtered = filtered.filter(
          (t) => t.amount >= parseFloat(filterAmount.min),
        );
      }
      if (filterAmount.max) {
        filtered = filtered.filter(
          (t) => t.amount <= parseFloat(filterAmount.max),
        );
      }
    }

    // Method filter (replacing device filter)
    if (filterDevice !== "all") {
      filtered = filtered.filter((t) => t.method?.id === filterDevice);
    }

    // Requisite filter
    if (filterRequisite !== "all") {
      filtered = filtered.filter((t) => t.requisites?.id === filterRequisite);
    }

    // Date filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter((t) => new Date(t.createdAt) >= fromDate);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => new Date(t.createdAt) <= toDate);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "amount_desc":
          return b.amount - a.amount;
        case "amount_asc":
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();
  console.log(
    "[DealsList] Rendering with:",
    transactions.length,
    "transactions, filtered:",
    filteredTransactions.length,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with user info */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Последние сделки
        </h1>

        <TraderHeader />
      </div>

      {/* Stats Blocks */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Deals Stats */}
        <Card className="p-4 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm text-gray-600 mb-2">Сделки</h3>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-gray-900">
                  {financials.profitFromDeals.toFixed(2)} USDT
                </div>
                <div className="text-sm text-gray-500">
                  {(financials.profitFromDeals * 95).toFixed(0)} RUB
                </div>
                {financials.profitFromDeals === 0 && (
                  <div className="text-xs text-red-500 mt-2">
                    Нет успешных сделок
                  </div>
                )}
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  Период: за сегодня
                  <ChevronDown className="ml-1 h-3 w-3 text-[#006039]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0" align="end">
                <div className="max-h-64 overflow-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За сегодня
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За вчера
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За неделю
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За месяц
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За квартал
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За полгода
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За год
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </Card>

        {/* Profit Stats */}
        <Card className="p-4 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm text-gray-600 mb-2">Прибыль</h3>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-gray-900">
                  {(
                    financials.profitFromDeals + financials.profitFromPayouts
                  ).toFixed(2)}{" "}
                  USDT
                </div>
                <div className="text-sm text-gray-500">
                  {(
                    (financials.profitFromDeals +
                      financials.profitFromPayouts) *
                    95
                  ).toFixed(0)}{" "}
                  RUB
                </div>
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  Период: за сегодня
                  <ChevronDown className="ml-1 h-3 w-3 text-[#006039]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0" align="end">
                <div className="max-h-64 overflow-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За сегодня
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За вчера
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За неделю
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За месяц
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За квартал
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За полгода
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    За год
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006039] h-4 w-4" />
          <Input
            placeholder="Поиск по ID, ФИО, банку, сумме..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Sort */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="default" className="gap-2">
              <ArrowUpDown className="h-4 w-4 text-[#006039]" />
              Сортировка
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Сортировать</h4>
              <div className="space-y-1">
                <Button
                  variant={sortBy === "newest" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSortBy("newest")}
                >
                  Сначала новые
                </Button>
                <Button
                  variant={sortBy === "oldest" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSortBy("oldest")}
                >
                  Сначала старые
                </Button>
                <Button
                  variant={sortBy === "amount_desc" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSortBy("amount_desc")}
                >
                  Сумма по убыванию
                </Button>
                <Button
                  variant={sortBy === "amount_asc" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSortBy("amount_asc")}
                >
                  Сумма по возрастанию
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Filters */}
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="default" className="gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#006039]" />
              Фильтры
              {(filterStatus !== "all" ||
                filterAmount.exact ||
                filterAmount.min ||
                filterAmount.max ||
                filterDevice !== "all" ||
                filterRequisite !== "all" ||
                filterDateFrom ||
                filterDateTo) && (
                <Badge className="ml-1 bg-[#006039] text-white">
                  {
                    [
                      filterStatus !== "all",
                      filterAmount.exact ||
                        filterAmount.min ||
                        filterAmount.max,
                      filterDevice !== "all",
                      filterRequisite !== "all",
                      filterDateFrom || filterDateTo,
                    ].filter(Boolean).length
                  }
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Фильтры</h4>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Статусы</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                    >
                      {filterStatus === "all"
                        ? "Все сделки"
                        : filterStatus === "not_credited"
                          ? "Не зачисленные сделки"
                          : filterStatus === "credited"
                            ? "Зачисленные сделки"
                            : "Сделки выполняются"}
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterStatus("all")}
                      >
                        Все сделки
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterStatus("not_credited")}
                      >
                        Не зачисленные сделки
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterStatus("credited")}
                      >
                        Зачисленные сделки
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterStatus("in_progress")}
                      >
                        Сделки выполняются
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Сумма зачисление</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span className="text-sm">Точное значение</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Диапазон</span>
                      <Switch
                        checked={filterAmountType === "range"}
                        onCheckedChange={(checked) =>
                          setFilterAmountType(checked ? "range" : "exact")
                        }
                        className="data-[state=checked]:bg-[#006039]"
                      />
                    </div>
                  </div>
                  {filterAmountType === "exact" ? (
                    <Input
                      type="number"
                      placeholder="Введите сумму"
                      value={filterAmount.exact}
                      onChange={(e) =>
                        setFilterAmount({
                          ...filterAmount,
                          exact: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="От"
                        value={filterAmount.min}
                        onChange={(e) =>
                          setFilterAmount({
                            ...filterAmount,
                            min: e.target.value,
                          })
                        }
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="До"
                        value={filterAmount.max}
                        onChange={(e) =>
                          setFilterAmount({
                            ...filterAmount,
                            max: e.target.value,
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Device Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Устройства</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                    >
                      {filterDevice === "all"
                        ? "Все устройства"
                        : transactions.find((t) => t.deviceId === filterDevice)
                          ? "Chrome на Windows"
                          : "Все устройства"}
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDevice("all")}
                      >
                        Все устройства
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDevice("1")}
                      >
                        <Smartphone className="mr-2 h-4 w-4 text-[#006039]" />
                        Chrome на Windows
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDevice("2")}
                      >
                        <Smartphone className="mr-2 h-4 w-4 text-[#006039]" />
                        Safari на iPhone
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Requisite Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Реквизиты</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                    >
                      {filterRequisite === "all"
                        ? "Все реквизиты"
                        : filterRequisite === "1"
                          ? "Основная карта"
                          : "Резервная карта"}
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterRequisite("all")}
                      >
                        Все реквизиты
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterRequisite("1")}
                      >
                        <CreditCard className="mr-2 h-4 w-4 text-[#006039]" />
                        Основная карта (Сбербанк)
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterRequisite("2")}
                      >
                        <CreditCard className="mr-2 h-4 w-4 text-[#006039]" />
                        Резервная карта (Тинькофф)
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm">Дата создания</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label
                      htmlFor="date-from"
                      className="text-xs text-gray-500"
                    >
                      От
                    </Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="date-to" className="text-xs text-gray-500">
                      До
                    </Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterAmount({ exact: "", min: "", max: "" });
                    setFilterAmountType("range");
                    setFilterDevice("all");
                    setFilterRequisite("all");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                >
                  Сбросить фильтры
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[#006039] hover:bg-[#006039]/90"
                  onClick={() => setFiltersOpen(false)}
                >
                  Применить фильтры
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
            Сделки не найдены
          </Card>
        ) : (
          <>
            {filteredTransactions.map((transaction) => {
              const getStatusIcon = () => {
                switch (transaction.status) {
                  case "CREATED":
                  case "IN_PROGRESS":
                    return (
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-blue-600" />
                      </div>
                    );
                  case "READY":
                    return (
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    );
                  case "EXPIRED":
                  case "CANCELED":
                    return (
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                        <X className="h-6 w-6 text-red-600" />
                      </div>
                    );
                  default:
                    return null;
                }
              };

              const getPaymentStatus = () => {
                switch (transaction.status) {
                  case "READY":
                    return "Платеж зачислен";
                  case "CREATED":
                  case "IN_PROGRESS":
                    return "Платеж ожидает зачисления";
                  default:
                    return "Платеж не зачислен";
                }
              };

              const getStatusBadgeText = () => {
                switch (transaction.status) {
                  case "READY":
                    return "Зачислен";
                  case "CREATED":
                  case "IN_PROGRESS":
                    return formatRemainingTime(transaction.expired_at);
                  case "EXPIRED":
                    return "Истекло";
                  case "CANCELED":
                    return "Отменено";
                  default:
                    return "Не зачислен";
                }
              };

              const getStatusBadgeColor = () => {
                switch (transaction.status) {
                  case "READY":
                    return "bg-green-100 text-green-700 border-green-200";
                  case "CREATED":
                  case "IN_PROGRESS":
                    return "bg-blue-100 text-blue-700 border-blue-200";
                  default:
                    return "bg-red-100 text-red-700 border-red-200";
                }
              };

              // Use frozen USDT amount or calculate from rate
              const usdtAmount = transaction.frozenUsdtAmount
                ? (
                    Math.round(transaction.frozenUsdtAmount * 100) / 100
                  ).toFixed(2)
                : transaction.rate
                  ? (
                      Math.round(
                        (transaction.amount / transaction.rate) * 100,
                      ) / 100
                    ).toFixed(2)
                  : (Math.round((transaction.amount / 95) * 100) / 100).toFixed(
                      2,
                    );

              return (
                <Card
                  key={transaction.id}
                  className={cn(
                    "p-4 hover:shadow-md transition-all duration-300 cursor-pointer",
                    transaction.isNew && "flash-once",
                  )}
                  onClick={() => setSelectedTransaction(transaction)}
                >
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">{getStatusIcon()}</div>

                    {/* Payment Status and Date */}
                    <div className="w-48 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">
                        {getPaymentStatus()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Создан{" "}
                        {format(
                          new Date(transaction.createdAt),
                          "HH:mm dd.MM.yyyy",
                        )}
                      </div>
                    </div>

                    {/* Bank and Requisites */}
                    <div className="w-64 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        {transaction.requisites?.bankType &&
                          bankLogos[transaction.requisites.bankType] && (
                            <img
                              src={bankLogos[transaction.requisites.bankType]}
                              alt={transaction.requisites.bankType}
                              className="h-16 w-16 rounded object-contain flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.requisites?.cardNumber || "—"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {transaction.clientName}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="w-32 flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-900">
                        {usdtAmount} USDT
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {transaction.amount.toLocaleString("ru-RU")} ₽
                      </div>
                    </div>

                    {/* Rate */}
                    <div className="w-32 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-700">
                        {transaction.rate
                          ? `${transaction.rate.toFixed(2)} ₽/USDT`
                          : "—"}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-4 py-2 text-sm font-medium border rounded-xl inline-block min-w-[100px] text-center",
                          getStatusBadgeColor(),
                        )}
                      >
                        {getStatusBadgeText()}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Count */}
            <div className="text-sm text-gray-600 mt-4">
              Найдено {filteredTransactions.length} записей
            </div>

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-[#006039]" />
                <span className="ml-2 text-sm text-gray-600">Загрузка...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transaction Details Dialog */}
      <Dialog
        open={!!selectedTransaction}
        onOpenChange={() => {
          setSelectedTransaction(null);
          setShowRequisiteDetails(false);
        }}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden rounded-3xl">
            {/* Hidden DialogTitle for accessibility */}
            <DialogTitle className="sr-only">
              {showRequisiteDetails
                ? "Информация о реквизите"
                : "Детали транзакции"}
            </DialogTitle>
            <div className="bg-white">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                {showRequisiteDetails ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRequisiteDetails(false)}
                      className="text-sm text-gray-600 hover:text-gray-900 -ml-2"
                    >
                      <ChevronDown className="h-4 w-4 mr-1 rotate-90 text-[#006039]" />
                      Назад
                    </Button>
                    <h3 className="font-medium">Информация о реквизите</h3>
                    <div className="w-8" />
                  </>
                ) : (
                  <>
                    <div className="text-sm text-gray-500 ml-[124px]">
                      {selectedTransaction &&
                        format(
                          new Date(selectedTransaction.createdAt),
                          "d MMMM yyyy 'г., в' HH:mm",
                          { locale: ru },
                        )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTransaction(null);
                        setShowRequisiteDetails(false);
                      }}
                      className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                    >
                      <X className="h-4 w-4 text-[#006039]" />
                    </Button>
                  </>
                )}
              </div>

              {selectedTransaction && !showRequisiteDetails && (
                <>
                  {/* Status Icon and Info */}
                  <div className="px-6 py-6 text-center">
                    {/* Status Icon */}
                    <div className="mb-4 flex justify-center">
                      {selectedTransaction.status === "READY" ? (
                        <div className="w-20 h-20 rounded-3xl bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                      ) : selectedTransaction.status === "CREATED" ||
                        selectedTransaction.status === "IN_PROGRESS" ? (
                        <div className="w-20 h-20 rounded-3xl bg-blue-100 flex items-center justify-center">
                          <Clock className="h-10 w-10 text-blue-600" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center">
                          <X className="h-10 w-10 text-red-600" />
                        </div>
                      )}
                    </div>

                    {/* Transaction Title */}
                    <h2 className="text-lg font-semibold mb-1">
                      {selectedTransaction.status === "READY"
                        ? "Платеж зачислен"
                        : selectedTransaction.status === "CREATED" ||
                            selectedTransaction.status === "IN_PROGRESS"
                          ? "Ожидание платежа"
                          : "Платеж не зачислен"}
                    </h2>

                    {/* Transaction ID */}
                    <p className="text-sm text-gray-500 mb-4">
                      {selectedTransaction.id.slice(-12)}
                    </p>

                    {/* Amount */}
                    <div className="mb-1">
                      <span className="text-3xl font-bold text-green-600">
                        {selectedTransaction.frozenUsdtAmount
                          ? selectedTransaction.frozenUsdtAmount.toFixed(2)
                          : selectedTransaction.rate
                            ? (
                                selectedTransaction.amount /
                                selectedTransaction.rate
                              ).toFixed(2)
                            : (selectedTransaction.amount / 95).toFixed(2)}{" "}
                        USDT
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {selectedTransaction.amount.toLocaleString("ru-RU")} RUB
                    </p>
                  </div>

                  {/* Dispute Badge if exists */}
                  {selectedTransaction.status === "DISPUTE" && (
                    <div className="px-6 pb-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Спор принят</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(), "d MMMM yyyy 'г., в' HH:mm", {
                                locale: ru,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Requisite Card */}
                  <div className="px-6 pb-4">
                    <Button
                      variant="outline"
                      className="w-full p-4 h-auto justify-between hover:bg-gray-50 transition-colors"
                      onClick={() => setShowRequisiteInfoModal(true)}
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
                          <p className="font-semibold text-xl">
                            {selectedTransaction.requisites?.recipientName ||
                              selectedTransaction.clientName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {selectedTransaction.requisites?.cardNumber
                              ?.replace(/(\d{4})/g, "$1 ")
                              .trim() || "—"}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5 text-[#006039] -rotate-90" />
                    </Button>
                  </div>

                  {/* Transaction Details */}
                  <div className="px-6 pb-4 space-y-3">
                    {/* Rate */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Ставка</span>
                        <span className="text-lg font-semibold">
                          1 USDT ={" "}
                          {selectedTransaction.rate
                            ? selectedTransaction.rate.toFixed(2)
                            : "95.00"}{" "}
                          RUB
                        </span>
                      </div>
                    </div>

                    {/* Profit */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Прибыль</span>
                        <span className="text-lg font-semibold text-green-600">
                          +{" "}
                          {selectedTransaction.calculatedCommission
                            ? selectedTransaction.calculatedCommission.toFixed(
                                2,
                              )
                            : "0.17"}{" "}
                          USDT
                        </span>
                      </div>
                    </div>

                    {/* Device */}
                    {selectedTransaction.method && (
                      <div className="pt-3 border-t">
                        <Button
                          variant="ghost"
                          className="w-full p-3 h-auto justify-between hover:bg-gray-50 -mx-3"
                          onClick={() => {
                            if (selectedTransaction.requisites?.id) {
                              router.push(
                                `/trader/devices/${selectedTransaction.requisites.id}`,
                              );
                            } else {
                              toast.error("ID устройства не найден");
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                              <Smartphone className="h-5 w-5 text-[#006039]" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium">
                                {selectedTransaction.method.id}
                              </p>
                              <p className="text-xs text-gray-500">
                                {selectedTransaction.method.name}
                              </p>
                            </div>
                          </div>
                          <ChevronDown className="h-5 w-5 text-[#006039] -rotate-90" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6">
                    {selectedTransaction.status === "READY" ? (
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-3">
                          Сделка подтверждена{" "}
                          <span className="text-blue-600 cursor-pointer hover:underline">
                            спором
                          </span>
                        </p>
                        <Button
                          className="w-full bg-[#006039] hover:bg-[#006039]/90"
                          onClick={() => setSelectedTransaction(null)}
                        >
                          Закрыть
                        </Button>
                      </div>
                    ) : selectedTransaction.status === "IN_PROGRESS" ? (
                      <Button
                        className="w-full bg-[#006039] hover:bg-[#006039]/90"
                        onClick={() => confirmPayment(selectedTransaction.id)}
                      >
                        Подтвердить платеж
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setSelectedTransaction(null)}
                      >
                        Закрыть
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* Requisite Details View */}
              {selectedTransaction && showRequisiteDetails && (
                <div className="">
                  {/* Requisite Header */}
                  <div className="px-6 py-6 text-center border-b">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                      {selectedTransaction.requisites?.bankType &&
                        bankLogos[selectedTransaction.requisites.bankType] && (
                          <img
                            src={
                              bankLogos[selectedTransaction.requisites.bankType]
                            }
                            alt={selectedTransaction.requisites.bankType}
                            className="h-14 w-14 rounded object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">
                      {selectedTransaction.clientName}
                    </h3>
                    <p className="text-2xl font-bold mb-1">
                      {selectedTransaction.requisites?.cardNumber || "—"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Банк:{" "}
                      {selectedTransaction.requisites?.bankType ||
                        selectedTransaction.assetOrBank}{" "}
                      • Россия
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Счет:{" "}
                      {selectedTransaction.requisites?.id?.slice(-8) ||
                        "00000000"}
                    </p>
                  </div>

                  {/* Requisite Stats */}
                  <div className="px-6 py-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">
                          Прием по номеру карты: Не подтверждено
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-blue-600 p-0 h-auto"
                        >
                          Карта выбрана как основная
                        </Button>
                      </div>
                      <div className="text-xs text-gray-400">
                        Прием по номеру счета: Не подтверждено
                      </div>
                      <div className="text-xs text-gray-400">
                        Прием по номеру телефона: Подтверждено
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">
                        Статистика за 24 часа
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Объем сделок</span>
                          <span className="font-medium">
                            0 USDT = 0 RUB{" "}
                            <span className="text-gray-400">(0 сделок)</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Прибыль</span>
                          <span className="font-medium">0 USDT</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Конверсия</span>
                          <span className="font-medium text-gray-400">0%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <h4 className="font-medium text-sm">
                        Привязка к устройству
                      </h4>
                      <Button
                        variant="outline"
                        className="w-full p-3 h-auto justify-between hover:bg-gray-50"
                        onClick={() => {
                          if (selectedTransaction.method?.id) {
                            router.push(
                              `/trader/devices/${selectedTransaction.method.id}`,
                            );
                          } else {
                            toast.error("ID устройства не найден");
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-[#006039]" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium">
                              {selectedTransaction.method?.name ||
                                "Tinkoff iOS 17.2"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedTransaction.method?.id ||
                                "5f779d3c-7f63-424e-ac7e-97f5924af501"}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className="h-5 w-5 text-[#006039] -rotate-90" />
                      </Button>
                    </div>

                    <div className="pt-4 space-y-3">
                      <h4 className="font-medium text-sm">
                        Управление реквизитом
                      </h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => toast.info("Функция в разработке")}
                        >
                          <X className="h-4 w-4 mr-2 text-red-500" />
                          Удалить
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => toast.info("Функция в разработке")}
                        >
                          <Eye className="h-4 w-4 mr-2 text-[#006039]" />
                          Просмотр сделок по реквизиту
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => toast.info("Функция в разработке")}
                        >
                          <CreditCard className="h-4 w-4 mr-2 text-[#006039]" />
                          Подтвердить номер карты
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => toast.info("Функция в разработке")}
                        >
                          <CreditCard className="h-4 w-4 mr-2 text-[#006039]" />
                          Подтвердить номер счета
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="px-6 pb-6">
                    <Button
                      className="w-full bg-[#006039] hover:bg-[#006039]/90"
                      onClick={() => setShowRequisiteDetails(false)}
                    >
                      Закрыть
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Requisite Info Modal */}
      {selectedTransaction && (
        <RequisiteInfoModal
          open={showRequisiteInfoModal}
          onOpenChange={setShowRequisiteInfoModal}
          requisite={{
            id: selectedTransaction.requisites?.id || selectedTransaction.id,
            bankType: selectedTransaction.requisites?.bankType || selectedTransaction.assetOrBank,
            cardNumber: selectedTransaction.requisites?.cardNumber || "2200 0000 0000 0000",
            recipientName: selectedTransaction.requisites?.recipientName || selectedTransaction.clientName,
            phoneNumber: "+7 900 000 00 00",
            accountNumber: "40817810490069500347",
            status: selectedTransaction.status === "READY" ? "active" : "inactive",
            device: {
              id: "device-123",
              name: "Рабочее устройство"
            },
            stats: {
              turnover24h: selectedTransaction.amount || 0,
              deals24h: 1,
              profit24h: selectedTransaction.calculatedCommission || 0,
              conversion24h: 95
            },
            verifications: {
              cardNumber: false,
              accountNumber: false,
              phoneNumber: true
            }
          }}
        />
      )}
    </div>
  );
}
