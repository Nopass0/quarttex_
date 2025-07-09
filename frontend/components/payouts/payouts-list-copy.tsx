"use client";

import { useState, useEffect } from "react";
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
  Send,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Payout {
  id: string;
  numericId: number;
  amount: number;
  currency: string | null;
  status: string;
  recipientName: string;
  method: string;
  createdAt: string;
  completedAt: string | null;
  expired_at: string;
  isNew?: boolean;
  commission?: number | null;
  cardNumber?: string;
  walletAddress?: string;
  bankType?: string;
  transactionHash?: string;
}

const statusConfig = {
  CREATED: {
    label: "Создана",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  PENDING: {
    label: "Ожидает",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  PROCESSING: {
    label: "В обработке",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  COMPLETED: {
    label: "Выполнена",
    color: "bg-green-50 text-green-600 border-green-200",
  },
  FAILED: { label: "Ошибка", color: "bg-red-50 text-red-600 border-red-200" },
  CANCELLED: {
    label: "Отменена",
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

export function PayoutsList() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAmount, setFilterAmount] = useState({
    exact: "",
    min: "",
    max: "",
  });
  const [filterAmountType, setFilterAmountType] = useState("range");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterRecipient, setFilterRecipient] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [, forceUpdate] = useState(0); // Force component re-render for countdown
  const [showRecipientDetails, setShowRecipientDetails] = useState(false);
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

  const confirmPayout = async (payoutId: string) => {
    try {
      // Mock API call
      toast.success("Выплата подтверждена");

      // Update the payout status locally
      setPayouts((prev) =>
        prev.map((payout) =>
          payout.id === payoutId ? { ...payout, status: "COMPLETED" } : payout,
        ),
      );

      setSelectedPayout(null);

      // Refresh both payouts and profile to update profit
      await Promise.all([fetchPayouts(), fetchTraderProfile()]);
    } catch (error) {
      toast.error("Не удалось подтвердить выплату");
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
          fetchPayouts(nextPage, true);
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
        await fetchPayouts();
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
        fetchPayouts(1, false);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Timer for countdown update - only update if there are pending payouts
  useEffect(() => {
    const hasPendingPayouts = payouts.some(
      (p) => p.status === "CREATED" || p.status === "PROCESSING",
    );

    if (hasPendingPayouts) {
      const timer = setInterval(() => {
        forceUpdate((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [payouts]);

  const fetchPayouts = async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Mock data - replace with real API call
      const mockPayouts: Payout[] = [
        {
          id: "payout-1",
          numericId: 1001,
          amount: 150.50,
          currency: "USDT",
          status: "COMPLETED",
          recipientName: "Иван Иванов",
          method: "card",
          cardNumber: "4276 **** **** 1234",
          bankType: "SBERBANK",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          commission: 3.01,
          transactionHash: "0xabcdef1234567890",
        },
        {
          id: "payout-2",
          numericId: 1002,
          amount: 250.00,
          currency: "USDT",
          status: "PROCESSING",
          recipientName: "Петр Петров",
          method: "wallet",
          walletAddress: "0x742d35Cc6632C0532C718123456789ABCDEF0123",
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          completedAt: null,
          expired_at: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
          commission: 5.00,
          isNew: true,
        },
        {
          id: "payout-3",
          numericId: 1003,
          amount: 75.25,
          currency: "USDT",
          status: "PENDING",
          recipientName: "Мария Сидорова",
          method: "card",
          cardNumber: "5536 **** **** 9012",
          bankType: "TBANK",
          createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          completedAt: null,
          expired_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
          commission: 1.51,
        },
      ];

      console.log("[PayoutsList] Mock payouts data:", mockPayouts.length, "items");

      // Mark new payouts using callback to get current state
      setPayouts((currentPayouts) => {
        const existingIds = new Set(currentPayouts.map((p) => p.id));
        const newPayouts: Payout[] = [];

        const newData = mockPayouts.map((payout: Payout) => {
          if (!existingIds.has(payout.id) && !loading && append) {
            // New payout - mark it and show toast
            newPayouts.push(payout);
            return { ...payout, isNew: true };
          }
          return { ...payout, isNew: false };
        });

        // Show toast for new payouts
        if (newPayouts.length > 0 && !loading && append && pageNum === 1) {
          newPayouts.forEach((payout) => {
            toast.success(`Новая выплата #${payout.numericId}`, {
              description: `${payout.amount.toLocaleString("ru-RU")} ${payout.currency} для ${payout.recipientName}`,
            });
          });

          // Remove "new" flag after animation
          setTimeout(() => {
            setPayouts((prev) =>
              prev.map((payout) => ({ ...payout, isNew: false })),
            );
          }, 500);
        }

        return append ? [...currentPayouts, ...newData] : newData;
      });

      setHasMore(mockPayouts.length === 50);
      console.log("[PayoutsList] Payouts set in state");
    } catch (error) {
      console.error("Failed to fetch payouts:", error);
      if (loading) {
        toast.error("Не удалось загрузить выплаты");
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

  const getFilteredPayouts = () => {
    let filtered = payouts;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((p) => {
        return (
          p.numericId.toString().includes(searchQuery) ||
          p.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.bankType || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (p.cardNumber || "").includes(searchQuery) ||
          (p.walletAddress || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          p.amount.toString().includes(searchQuery) ||
          (p.transactionHash || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    // Status filter
    if (filterStatus !== "all") {
      switch (filterStatus) {
        case "not_completed":
          filtered = filtered.filter(
            (p) =>
              p.status === "CREATED" ||
              p.status === "PENDING" ||
              p.status === "PROCESSING" ||
              p.status === "FAILED" ||
              p.status === "CANCELLED",
          );
          break;
        case "completed":
          filtered = filtered.filter((p) => p.status === "COMPLETED");
          break;
        case "processing":
          filtered = filtered.filter((p) => p.status === "PROCESSING");
          break;
      }
    }

    // Amount filter
    if (filterAmountType === "exact" && filterAmount.exact) {
      filtered = filtered.filter(
        (p) => p.amount === parseFloat(filterAmount.exact),
      );
    } else if (filterAmountType === "range") {
      if (filterAmount.min) {
        filtered = filtered.filter(
          (p) => p.amount >= parseFloat(filterAmount.min),
        );
      }
      if (filterAmount.max) {
        filtered = filtered.filter(
          (p) => p.amount <= parseFloat(filterAmount.max),
        );
      }
    }

    // Method filter
    if (filterMethod !== "all") {
      filtered = filtered.filter((p) => p.method === filterMethod);
    }

    // Recipient filter
    if (filterRecipient !== "all") {
      filtered = filtered.filter((p) => p.recipientName === filterRecipient);
    }

    // Date filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter((p) => new Date(p.createdAt) >= fromDate);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p) => new Date(p.createdAt) <= toDate);
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

  const filteredPayouts = getFilteredPayouts();
  console.log(
    "[PayoutsList] Rendering with:",
    payouts.length,
    "payouts, filtered:",
    filteredPayouts.length,
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
          Последние выплаты
        </h1>

        <TraderHeader />
      </div>

      {/* Stats Blocks */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Payouts Stats */}
        <Card className="p-4 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm text-gray-600 mb-2">Выплаты</h3>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-gray-900">
                  {financials.profitFromPayouts.toFixed(2)} USDT
                </div>
                <div className="text-sm text-gray-500">
                  {(financials.profitFromPayouts * 95).toFixed(0)} RUB
                </div>
                {financials.profitFromPayouts === 0 && (
                  <div className="text-xs text-red-500 mt-2">
                    Нет успешных выплат
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
            placeholder="Поиск по ID, получателю, адресу, сумме..."
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
                filterMethod !== "all" ||
                filterRecipient !== "all" ||
                filterDateFrom ||
                filterDateTo) && (
                <Badge className="ml-1 bg-[#006039] text-white">
                  {
                    [
                      filterStatus !== "all",
                      filterAmount.exact ||
                        filterAmount.min ||
                        filterAmount.max,
                      filterMethod !== "all",
                      filterRecipient !== "all",
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
                        ? "Все выплаты"
                        : filterStatus === "not_completed"
                          ? "Не завершенные выплаты"
                          : filterStatus === "completed"
                            ? "Завершенные выплаты"
                            : "Выплаты в обработке"}
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
                        Все выплаты
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterStatus("not_completed")}
                      >
                        Не завершенные выплаты
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterStatus("completed")}
                      >
                        Завершенные выплаты
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterStatus("processing")}
                      >
                        Выплаты в обработке
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Сумма выплаты</Label>
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

              {/* Method Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Способ выплаты</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                    >
                      {filterMethod === "all"
                        ? "Все способы"
                        : filterMethod === "card"
                          ? "На карту"
                          : "На кошелек"}
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMethod("all")}
                      >
                        Все способы
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMethod("card")}
                      >
                        <CreditCard className="mr-2 h-4 w-4 text-[#006039]" />
                        На карту
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMethod("wallet")}
                      >
                        <Wallet className="mr-2 h-4 w-4 text-[#006039]" />
                        На кошелек
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Recipient Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Получатель</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                    >
                      {filterRecipient === "all"
                        ? "Все получатели"
                        : filterRecipient}
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterRecipient("all")}
                      >
                        Все получатели
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterRecipient("Иван Иванов")}
                      >
                        Иван Иванов
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterRecipient("Петр Петров")}
                      >
                        Петр Петров
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
                    setFilterMethod("all");
                    setFilterRecipient("all");
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

      {/* Payouts List */}
      <div className="space-y-3">
        {filteredPayouts.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
            Выплаты не найдены
          </Card>
        ) : (
          <>
            {filteredPayouts.map((payout) => {
              const getStatusIcon = () => {
                switch (payout.status) {
                  case "CREATED":
                  case "PENDING":
                  case "PROCESSING":
                    return (
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-blue-600" />
                      </div>
                    );
                  case "COMPLETED":
                    return (
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    );
                  case "FAILED":
                  case "CANCELLED":
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
                switch (payout.status) {
                  case "COMPLETED":
                    return "Выплата завершена";
                  case "CREATED":
                  case "PENDING":
                  case "PROCESSING":
                    return "Выплата в обработке";
                  default:
                    return "Выплата не завершена";
                }
              };

              const getStatusBadgeText = () => {
                switch (payout.status) {
                  case "COMPLETED":
                    return "Завершена";
                  case "CREATED":
                  case "PENDING":
                  case "PROCESSING":
                    return formatRemainingTime(payout.expired_at);
                  case "FAILED":
                    return "Ошибка";
                  case "CANCELLED":
                    return "Отменена";
                  default:
                    return "Не завершена";
                }
              };

              const getStatusBadgeColor = () => {
                switch (payout.status) {
                  case "COMPLETED":
                    return "bg-green-100 text-green-700 border-green-200";
                  case "CREATED":
                  case "PENDING":
                  case "PROCESSING":
                    return "bg-blue-100 text-blue-700 border-blue-200";
                  default:
                    return "bg-red-100 text-red-700 border-red-200";
                }
              };

              return (
                <Card
                  key={payout.id}
                  className={cn(
                    "p-4 hover:shadow-md transition-all duration-300 cursor-pointer",
                    payout.isNew && "flash-once",
                  )}
                  onClick={() => setSelectedPayout(payout)}
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
                        Создана{" "}
                        {format(
                          new Date(payout.createdAt),
                          "HH:mm dd.MM.yyyy",
                        )}
                      </div>
                    </div>

                    {/* Bank and Recipient */}
                    <div className="w-64 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        {payout.method === "card" && payout.bankType &&
                          bankLogos[payout.bankType] && (
                            <img
                              src={bankLogos[payout.bankType]}
                              alt={payout.bankType}
                              className="h-16 w-16 rounded object-contain flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        {payout.method === "wallet" && (
                          <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center">
                            <Wallet className="h-8 w-8 text-[#006039]" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {payout.method === "card" 
                              ? payout.cardNumber || "—"
                              : payout.walletAddress?.slice(0, 20) + "..." || "—"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {payout.recipientName}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="w-32 flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-900">
                        {payout.amount.toFixed(2)} {payout.currency}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(payout.amount * 95).toFixed(0)} ₽
                      </div>
                    </div>

                    {/* Commission */}
                    <div className="w-32 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-700">
                        {payout.commission
                          ? `${payout.commission.toFixed(2)} ${payout.currency}`
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
              Найдено {filteredPayouts.length} записей
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

      {/* Payout Details Dialog */}
      <Dialog
        open={!!selectedPayout}
        onOpenChange={() => {
          setSelectedPayout(null);
          setShowRecipientDetails(false);
        }}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden rounded-3xl">
            {/* Hidden DialogTitle for accessibility */}
            <DialogTitle className="sr-only">
              {showRecipientDetails
                ? "Информация о получателе"
                : "Детали выплаты"}
            </DialogTitle>
            <div className="bg-white">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                {showRecipientDetails ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRecipientDetails(false)}
                      className="text-sm text-gray-600 hover:text-gray-900 -ml-2"
                    >
                      <ChevronDown className="h-4 w-4 mr-1 rotate-90 text-[#006039]" />
                      Назад
                    </Button>
                    <h3 className="font-medium">Информация о получателе</h3>
                    <div className="w-8" />
                  </>
                ) : (
                  <>
                    <div className="text-sm text-gray-500 ml-[124px]">
                      {selectedPayout &&
                        format(
                          new Date(selectedPayout.createdAt),
                          "d MMMM yyyy 'г., в' HH:mm",
                          { locale: ru },
                        )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPayout(null);
                        setShowRecipientDetails(false);
                      }}
                      className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                    >
                      <X className="h-4 w-4 text-[#006039]" />
                    </Button>
                  </>
                )}
              </div>

              {selectedPayout && !showRecipientDetails && (
                <>
                  {/* Status Icon and Info */}
                  <div className="px-6 py-6 text-center">
                    {/* Status Icon */}
                    <div className="mb-4 flex justify-center">
                      {selectedPayout.status === "COMPLETED" ? (
                        <div className="w-20 h-20 rounded-3xl bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                      ) : selectedPayout.status === "CREATED" ||
                        selectedPayout.status === "PENDING" ||
                        selectedPayout.status === "PROCESSING" ? (
                        <div className="w-20 h-20 rounded-3xl bg-blue-100 flex items-center justify-center">
                          <Clock className="h-10 w-10 text-blue-600" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center">
                          <X className="h-10 w-10 text-red-600" />
                        </div>
                      )}
                    </div>

                    {/* Payout Title */}
                    <h2 className="text-lg font-semibold mb-1">
                      {selectedPayout.status === "COMPLETED"
                        ? "Выплата завершена"
                        : selectedPayout.status === "CREATED" ||
                            selectedPayout.status === "PENDING" ||
                            selectedPayout.status === "PROCESSING"
                          ? "Выплата в обработке"
                          : "Выплата не завершена"}
                    </h2>

                    {/* Payout ID */}
                    <p className="text-sm text-gray-500 mb-4">
                      {selectedPayout.id.slice(-12)}
                    </p>

                    {/* Amount */}
                    <div className="mb-1">
                      <span className="text-3xl font-bold text-green-600">
                        {selectedPayout.amount.toFixed(2)} {selectedPayout.currency}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {(selectedPayout.amount * 95).toFixed(0)} RUB
                    </p>
                  </div>

                  {/* Recipient Card */}
                  <div className="px-6 pb-4">
                    <Button
                      variant="outline"
                      className="w-full p-4 h-auto justify-between hover:bg-gray-50 transition-colors"
                      onClick={() => setShowRecipientDetails(true)}
                    >
                      <div className="flex items-center gap-3">
                        {selectedPayout.method === "card" ? (
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
                        ) : (
                          <div className="w-[92px] h-[62px] rounded-md bg-gradient-to-tr from-blue-800 via-blue-400 to-blue-400 relative overflow-hidden flex items-center justify-center">
                            <Wallet className="h-8 w-8 text-white" />
                          </div>
                        )}
                        <div className="text-left">
                          <p className="font-semibold text-xl">
                            {selectedPayout.recipientName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {selectedPayout.method === "card" 
                              ? selectedPayout.cardNumber?.replace(/(\d{4})/g, "$1 ").trim() || "—"
                              : selectedPayout.walletAddress?.slice(0, 20) + "..." || "—"}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5 text-[#006039] -rotate-90" />
                    </Button>
                  </div>

                  {/* Payout Details */}
                  <div className="px-6 pb-4 space-y-3">
                    {/* Commission */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Комиссия</span>
                        <span className="text-lg font-semibold">
                          {selectedPayout.commission
                            ? `${selectedPayout.commission.toFixed(2)} ${selectedPayout.currency}`
                            : "0.00 USDT"}
                        </span>
                      </div>
                    </div>

                    {/* Transaction Hash */}
                    {selectedPayout.transactionHash && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Хеш транзакции</span>
                          <span className="text-sm font-mono">
                            {selectedPayout.transactionHash.slice(0, 10)}...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6">
                    {selectedPayout.status === "COMPLETED" ? (
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-3">
                          Выплата завершена успешно
                        </p>
                        <Button
                          className="w-full bg-[#006039] hover:bg-[#006039]/90"
                          onClick={() => setSelectedPayout(null)}
                        >
                          Закрыть
                        </Button>
                      </div>
                    ) : selectedPayout.status === "PROCESSING" ? (
                      <Button
                        className="w-full bg-[#006039] hover:bg-[#006039]/90"
                        onClick={() => confirmPayout(selectedPayout.id)}
                      >
                        Подтвердить выплату
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setSelectedPayout(null)}
                      >
                        Закрыть
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* Recipient Details View */}
              {selectedPayout && showRecipientDetails && (
                <div className="">
                  {/* Recipient Header */}
                  <div className="px-6 py-6 text-center border-b">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                      {selectedPayout.method === "card" && selectedPayout.bankType &&
                        bankLogos[selectedPayout.bankType] && (
                          <img
                            src={bankLogos[selectedPayout.bankType]}
                            alt={selectedPayout.bankType}
                            className="h-14 w-14 rounded object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      {selectedPayout.method === "wallet" && (
                        <Wallet className="h-14 w-14 text-[#006039]" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">
                      {selectedPayout.recipientName}
                    </h3>
                    <p className="text-2xl font-bold mb-1">
                      {selectedPayout.method === "card" 
                        ? selectedPayout.cardNumber || "—"
                        : selectedPayout.walletAddress || "—"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedPayout.method === "card" 
                        ? `Банк: ${selectedPayout.bankType || "Неизвестно"} • Россия`
                        : "Криптокошелек"}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      ID: {selectedPayout.id.slice(-8)}
                    </p>
                  </div>

                  {/* Recipient Stats */}
                  <div className="px-6 py-4 space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">
                        Статистика за 24 часа
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Объем выплат</span>
                          <span className="font-medium">
                            {selectedPayout.amount.toFixed(2)} {selectedPayout.currency} = {(selectedPayout.amount * 95).toFixed(0)} RUB{" "}
                            <span className="text-gray-400">(1 выплата)</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Комиссия</span>
                          <span className="font-medium">{selectedPayout.commission?.toFixed(2) || "0.00"} {selectedPayout.currency}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Успешность</span>
                          <span className="font-medium text-green-600">
                            {selectedPayout.status === "COMPLETED" ? "100%" : "0%"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <h4 className="font-medium text-sm">
                        Управление получателем
                      </h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => toast.info("Функция в разработке")}
                        >
                          <X className="h-4 w-4 mr-2 text-red-500" />
                          Заблокировать
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => toast.info("Функция в разработке")}
                        >
                          <Eye className="h-4 w-4 mr-2 text-[#006039]" />
                          Просмотр всех выплат
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            if (selectedPayout.method === "card" && selectedPayout.cardNumber) {
                              navigator.clipboard.writeText(selectedPayout.cardNumber);
                              toast.success("Номер карты скопирован");
                            } else if (selectedPayout.method === "wallet" && selectedPayout.walletAddress) {
                              navigator.clipboard.writeText(selectedPayout.walletAddress);
                              toast.success("Адрес кошелька скопирован");
                            }
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2 text-[#006039]" />
                          Копировать {selectedPayout.method === "card" ? "номер карты" : "адрес"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="px-6 pb-6">
                    <Button
                      className="w-full bg-[#006039] hover:bg-[#006039]/90"
                      onClick={() => setShowRecipientDetails(false)}
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
    </div>
  );
}