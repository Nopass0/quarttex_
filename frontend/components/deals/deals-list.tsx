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

// Функция для получения квадратных SVG логотипов банков
const getBankIcon = (bankType: string, size: "sm" | "md" = "md") => {
  const bankLogos: Record<string, string> = {
    SBERBANK: "/bank-logos/sberbank.svg",
    TBANK: "/bank-logos/tbank.svg",
    TINKOFF: "/bank-logos/tinkoff.svg",
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
      <div className={`${sizeClasses} rounded-lg bg-white border border-gray-200 flex items-center justify-center p-1`}>
        <img
          src={logoPath}
          alt={bankType}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
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
    <div className={`${sizeClasses} rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center`}>
      <CreditCard className="w-5 h-5 text-gray-600" />
    </div>
  );
};

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
  deviceId?: string;
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
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [, forceUpdate] = useState(0); // Force component re-render for countdown
  const [showRequisiteDetails, setShowRequisiteDetails] = useState(false);
  const [showRequisiteInfoModal, setShowRequisiteInfoModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Real data for filters
  const [devices, setDevices] = useState<any[]>([]);
  const [requisites, setRequisites] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [requisiteSearch, setRequisiteSearch] = useState("");
  const [methodSearch, setMethodSearch] = useState("");

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

  const manualCloseTransaction = async (transactionId: string) => {
    try {
      await traderApi.updateTransactionStatus(transactionId, "COMPLETED");
      toast.success("Сделка закрыта вручную");

      // Update the transaction status locally
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId ? { ...tx, status: "COMPLETED" } : tx,
        ),
      );

      setSelectedTransaction(null);

      // Refresh both transactions and profile to update profit
      await Promise.all([fetchTransactions(), fetchTraderProfile()]);
    } catch (error) {
      toast.error("Не удалось закрыть сделку");
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
        await Promise.all([
          fetchTransactions(),
          fetchTraderProfile(),
          fetchDevices(),
          fetchRequisites(),
          fetchMethods(),
        ]);
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
  
  // Refetch when filters change
  useEffect(() => {
    if (!loading) {
      setPage(1);
      fetchTransactions(1, false);
    }
  }, [filterStatus, filterDevice, filterRequisite, filterMethod, filterAmount, filterDateFrom, filterDateTo]);

  const fetchTransactions = async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Build query parameters with filters
      const params: any = {
        page: pageNum,
        limit: 50,
      };

      // Add status filter
      if (filterStatus !== "all") {
        switch (filterStatus) {
          case "not_credited":
            params.status = ["CREATED", "EXPIRED", "CANCELED"];
            break;
          case "credited":
            params.status = "READY";
            break;
          case "in_progress":
            params.status = "IN_PROGRESS";
            break;
        }
      }

      // Add device filter
      if (filterDevice !== "all") {
        params.deviceId = filterDevice;
      }

      // Add requisite filter
      if (filterRequisite !== "all") {
        params.requisiteId = filterRequisite;
      }

      // Add method filter
      if (filterMethod !== "all") {
        params.methodId = filterMethod;
      }

      // Add amount filters
      if (filterAmountType === "exact" && filterAmount.exact) {
        params.amount = parseFloat(filterAmount.exact);
      } else if (filterAmountType === "range") {
        if (filterAmount.min) {
          params.amountMin = parseFloat(filterAmount.min);
        }
        if (filterAmount.max) {
          params.amountMax = parseFloat(filterAmount.max);
        }
      }

      // Add date filters
      if (filterDateFrom) {
        params.dateFrom = filterDateFrom;
      }
      if (filterDateTo) {
        params.dateTo = filterDateTo;
      }

      // Add search query
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await traderApi.getTransactions(params);
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
            toast.success(`Новая сделка ${tx.numericId}`, {
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

  const fetchDevices = async () => {
    try {
      const response = await traderApi.getDevices();
      setDevices(response.devices || response || []);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    }
  };

  const fetchRequisites = async () => {
    try {
      const response = await traderApi.getRequisites();
      setRequisites(response.requisites || response || []);
    } catch (error) {
      console.error("Failed to fetch requisites:", error);
    }
  };

  const fetchMethods = async () => {
    try {
      const response = await traderApi.getMethods();
      setMethods(response.methods || response || []);
    } catch (error) {
      console.error("Failed to fetch methods:", error);
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

    // Payment method filter
    if (filterMethod !== "all") {
      filtered = filtered.filter((t) => t.method?.name === filterMethod);
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
  
  // Calculate stats for filtered transactions
  const filteredStats = filteredTransactions.reduce((acc, tx) => {
    if (tx.status === "READY" || tx.status === "COMPLETED") {
      acc.count += 1;
      acc.totalAmount += tx.amount || 0;
      acc.totalProfit += tx.calculatedCommission || 0;
    }
    return acc;
  }, { count: 0, totalAmount: 0, totalProfit: 0 });
  
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
        <h1 className="text-xl font-semibold text-gray-900 dark:text-[#eeeeee]">
          Последние сделки
        </h1>

        <TraderHeader />
      </div>

      {/* Stats Blocks */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Deals Stats */}
        <Card className="p-4 border border-gray-200 dark:border-[#29382f]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Сделки ({filteredStats.count})</h3>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-gray-900 dark:text-[#eeeeee]">
                  {filteredStats.totalProfit.toFixed(2)} USDT
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {(filteredStats.totalProfit * 95).toFixed(0)} RUB
                </div>
                {filteredStats.count === 0 && (
                  <div className="text-xs text-red-500 dark:text-[#c64444] mt-2">
                    Нет успешных сделок
                  </div>
                )}
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  Период: за сегодня
                  <ChevronDown className="ml-1 h-3 w-3 text-[#006039] dark:text-[#2d6a42]" />
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
        <Card className="p-4 border border-gray-200 dark:border-[#29382f]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Прибыль</h3>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-gray-900 dark:text-[#eeeeee]">
                  {(
                    financials.profitFromDeals + financials.profitFromPayouts
                  ).toFixed(2)}{" "}
                  USDT
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
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
                  <ChevronDown className="ml-1 h-3 w-3 text-[#006039] dark:text-[#2d6a42]" />
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

      {/* Search and Filters - Sticky */}
      <div className="sticky top-0 z-10 bg-white dark:bg-[#0f0f0f] pb-4 -mx-6 px-6 pt-2 shadow-sm dark:shadow-[#29382f]">
        <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006039] dark:text-[#2d6a42] h-4 w-4" />
          <Input
            placeholder="Поиск по ID, ФИО, банку, сумме..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border h-12 border-gray-300 dark:border-[#29382f] rounded-lg"
          />
        </div>

        {/* Filters */}
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="default"
              className="gap-2 h-12 px-6"
            >
              <SlidersHorizontal className="h-4 w-4 text-[#006039]" />
              Не выбраны
              {(filterStatus !== "all" ||
                filterAmount.exact ||
                filterAmount.min ||
                filterAmount.max ||
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
                      filterRequisite !== "all",
                      filterDateFrom || filterDateTo,
                    ].filter(Boolean).length
                  }
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-colors",
                  filtersOpen ? "text-[#006039]" : "text-gray-400",
                )}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[500px]" sideOffset={5}>
            <div className="space-y-4">
              <h4 className="font-medium text-">Параметры поиска</h4>

              {/* Status Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Статус платежа</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full justify-between h-12"
                    >
                      <span className={"text-[#006039]"}>
                        {filterStatus === "all"
                          ? "Все сделки"
                          : filterStatus === "not_credited"
                            ? "Не зачисленные сделки"
                            : filterStatus === "credited"
                              ? "Зачисленные сделки"
                              : "Сделки выполняются"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[465px]  p-0"
                    align="start"
                    sideOffset={5}
                  >
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input placeholder="Поиск статуса" className="pl-9" />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterStatus === "all" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterStatus("all")}
                      >
                        Все сделки
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterStatus === "not_credited" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterStatus("not_credited")}
                      >
                        Не зачисленные сделки
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterStatus === "credited" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterStatus("credited")}
                      >
                        Зачисленные сделки
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterStatus === "in_progress" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#006039]" />
                    <Label className="text-sm">Сумма зачисления</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={cn(
                        "text-sm font-medium transition-colors",
                        filterAmountType === "exact"
                          ? "text-[#006039]"
                          : "text-gray-500 hover:text-gray-700",
                      )}
                      onClick={() => setFilterAmountType("exact")}
                    >
                      Точное значение
                    </button>
                    <span className="text-gray-400">/</span>
                    <button
                      className={cn(
                        "text-sm font-medium transition-colors",
                        filterAmountType === "range"
                          ? "text-[#006039]"
                          : "text-gray-500 hover:text-gray-700",
                      )}
                      onClick={() => setFilterAmountType("range")}
                    >
                      Диапазон
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {filterAmountType === "exact" ? (
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="Сумма"
                        value={filterAmount.exact}
                        onChange={(e) =>
                          setFilterAmount({
                            ...filterAmount,
                            exact: e.target.value,
                          })
                        }
                        className="h-12"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                        RUB
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          placeholder="Сумма, от"
                          value={filterAmount.min}
                          onChange={(e) =>
                            setFilterAmount({
                              ...filterAmount,
                              min: e.target.value,
                            })
                          }
                          className="flex-1 h-12"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                          RUB
                        </span>
                      </div>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          placeholder="Сумма, до"
                          value={filterAmount.max}
                          onChange={(e) =>
                            setFilterAmount({
                              ...filterAmount,
                              max: e.target.value,
                            })
                          }
                          className="flex-1 h-12"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                          RUB
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Device Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Устройства</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full justify-between h-12"
                    >
                      <span className={"text-[#006039]"}>
                        {filterDevice === "all"
                          ? "Все устройства"
                          : filterDevice === "1"
                            ? "Основное устройство"
                            : "Резервное устройство"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[465px] p-0"
                    align="start"
                    sideOffset={5}
                  >
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                          placeholder="Поиск устройств" 
                          className="pl-9"
                          value={deviceSearch}
                          onChange={(e) => setDeviceSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterDevice === "all" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterDevice("all")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Smartphone className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">Все устройства</div>
                            <div className="text-sm text-gray-500">
                              Не фильтровать по устройству
                            </div>
                          </div>
                        </div>
                      </Button>
                      {devices
                        .filter((device) => 
                          !deviceSearch || 
                          device.name?.toLowerCase().includes(deviceSearch.toLowerCase()) ||
                          device.id?.toLowerCase().includes(deviceSearch.toLowerCase())
                        )
                        .map((device) => (
                          <Button
                            key={device.id}
                            variant="ghost"
                            size="default"
                            className={cn(
                              "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                              filterDevice === device.id && "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                            )}
                            onClick={() => setFilterDevice(device.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Smartphone className="h-4 w-4 text-gray-600" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium">{device.name}</div>
                                <div className="text-sm text-gray-500">
                                  {device.isOnline ? "Онлайн" : "Оффлайн"} • ID: {device.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Requisite Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Реквизиты</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full justify-between h-12"
                    >
                      <span className={"text-[#006039]"}>
                        {filterRequisite === "all"
                          ? "Все реквизиты"
                          : filterRequisite === "1"
                            ? "Основная карта"
                            : "Резервная карта"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[465px]  p-0"
                    align="start"
                    sideOffset={5}
                  >
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Поиск реквизитов"
                          className="pl-9"
                          value={requisiteSearch}
                          onChange={(e) => setRequisiteSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterRequisite === "all" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterRequisite("all")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CreditCard className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">Все реквизиты</div>
                            <div className="text-sm text-gray-500">
                              Не фильтровать по реквизитам
                            </div>
                          </div>
                        </div>
                      </Button>
                      {requisites
                        .filter((requisite) => 
                          !requisiteSearch || 
                          requisite.recipientName?.toLowerCase().includes(requisiteSearch.toLowerCase()) ||
                          requisite.cardNumber?.includes(requisiteSearch) ||
                          requisite.bankType?.toLowerCase().includes(requisiteSearch.toLowerCase())
                        )
                        .map((requisite) => (
                          <Button
                            key={requisite.id}
                            variant="ghost"
                            size="default"
                            className={cn(
                              "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                              filterRequisite === requisite.id && "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                            )}
                            onClick={() => setFilterRequisite(requisite.id)}
                          >
                            <div className="flex items-center gap-3">
                              {requisite.bankType ? getBankIcon(requisite.bankType, "sm") : <NeutralBankIcon />}
                              <div className="text-left">
                                <div className="font-medium">
                                  {requisite.recipientName || "Безымянная карта"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {requisite.cardNumber ? `•••• ${requisite.cardNumber.slice(-4)}` : "Номер не указан"} • {requisite.bankType || "Банк не указан"}
                                </div>
                              </div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Метод оплаты</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full justify-between h-12"
                    >
                      <span className={"text-[#006039]"}>
                        {filterMethod === "all"
                          ? "Все методы"
                          : filterMethod}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[465px] p-0"
                    align="start"
                    sideOffset={5}
                  >
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Поиск методов"
                          className="pl-9"
                          value={methodSearch}
                          onChange={(e) => setMethodSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterMethod === "all" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterMethod("all")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">Все методы</div>
                            <div className="text-sm text-gray-500">
                              Не фильтровать по методу оплаты
                            </div>
                          </div>
                        </div>
                      </Button>
                      {methods
                        .filter((method) => 
                          !methodSearch || 
                          method.name?.toLowerCase().includes(methodSearch.toLowerCase()) ||
                          method.type?.toLowerCase().includes(methodSearch.toLowerCase())
                        )
                        .map((method) => {
                          // Try to extract bank type from method name or type
                          const bankType = method.type?.toUpperCase() || method.name?.toUpperCase().replace(/\s+/g, '') || '';
                          
                          return (
                            <Button
                              key={method.id}
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                                filterMethod === method.id && "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                              )}
                              onClick={() => setFilterMethod(method.id)}
                            >
                              <div className="flex items-center gap-3">
                                {bankType ? getBankIcon(bankType, "sm") : <NeutralBankIcon />}
                                <div className="text-left">
                                  <div className="font-medium">{method.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {method.description || `Перевод через ${method.name}`}
                                  </div>
                                </div>
                              </div>
                            </Button>
                          );
                        })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Дата создания платежа</Label>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-12 text-left font-normal"
                        >
                          <span
                            className={
                              filterDateFrom ? "text-black" : "text-gray-500"
                            }
                          >
                            {filterDateFrom ? `${filterDateFrom} 00:00` : "От"}
                          </span>
                          <Calendar className="h-4 w-4 text-gray-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-7 gap-1 text-sm">
                              <div className="text-center font-medium text-gray-500">
                                Пн
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Вт
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Ср
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Чт
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Пт
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Сб
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Вс
                              </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {Array.from({ length: 35 }, (_, i) => {
                                const date = new Date(2024, 0, i - 6);
                                const isSelected =
                                  filterDateFrom ===
                                  date.toISOString().split("T")[0];
                                return (
                                  <Button
                                    key={i}
                                    variant={isSelected ? "default" : "ghost"}
                                    size="sm"
                                    className={cn(
                                      "h-8 w-8 p-0 font-normal",
                                      isSelected &&
                                        "bg-[#006039] text-white hover:bg-[#006039]",
                                    )}
                                    onClick={() =>
                                      setFilterDateFrom(
                                        date.toISOString().split("T")[0],
                                      )
                                    }
                                  >
                                    {date.getDate()}
                                  </Button>
                                );
                              })}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Время</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder="Час"
                                  min="0"
                                  max="23"
                                  className="flex-1 h-12"
                                />
                                <Input
                                  type="number"
                                  placeholder="Мин"
                                  min="0"
                                  max="59"
                                  className="flex-1 h-12"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-12"
                                onClick={() => setFilterDateFrom("")}
                              >
                                Сбросить
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 h-12 bg-[#006039] hover:bg-[#006039]/90"
                              >
                                Применить
                              </Button>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-12 text-left font-normal"
                        >
                          <span
                            className={
                              filterDateTo ? "text-black" : "text-gray-500"
                            }
                          >
                            {filterDateTo ? `${filterDateTo} 23:59` : "До"}
                          </span>
                          <Calendar className="h-4 w-4 text-gray-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-7 gap-1 text-sm">
                              <div className="text-center font-medium text-gray-500">
                                Пн
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Вт
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Ср
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Чт
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Пт
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Сб
                              </div>
                              <div className="text-center font-medium text-gray-500">
                                Вс
                              </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {Array.from({ length: 35 }, (_, i) => {
                                const date = new Date(2024, 0, i - 6);
                                const isSelected =
                                  filterDateTo ===
                                  date.toISOString().split("T")[0];
                                return (
                                  <Button
                                    key={i}
                                    variant={isSelected ? "default" : "ghost"}
                                    size="sm"
                                    className={cn(
                                      "h-8 w-8 p-0 font-normal",
                                      isSelected &&
                                        "bg-[#006039] text-white hover:bg-[#006039]",
                                    )}
                                    onClick={() =>
                                      setFilterDateTo(
                                        date.toISOString().split("T")[0],
                                      )
                                    }
                                  >
                                    {date.getDate()}
                                  </Button>
                                );
                              })}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Время</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder="Час"
                                  min="0"
                                  max="23"
                                  className="flex-1 h-12"
                                />
                                <Input
                                  type="number"
                                  placeholder="Мин"
                                  min="0"
                                  max="59"
                                  className="flex-1 h-12"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-12"
                                onClick={() => setFilterDateTo("")}
                              >
                                Сбросить
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 h-12 bg-[#006039] hover:bg-[#006039]/90"
                              >
                                Применить
                              </Button>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-12"
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterAmount({ exact: "", min: "", max: "" });
                    setFilterAmountType("range");
                    setFilterDevice("all");
                    setFilterRequisite("all");
                    setFilterMethod("all");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                >
                  Сбросить фильтры
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-12 bg-green-100 hover:bg-green-200 transition-colors duration-150 text-green-500"
                  onClick={() => setFiltersOpen(false)}
                >
                  Применить фильтры
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="default"
              className="gap-2 h-12 px-6"
            >
              <ArrowUpDown className="h-4 w-4 text-[#006039]" />
              Сортировка
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto" sideOffset={5}>
            <div className="space-y-2">
              <h4 className="font-medium text-base">Сортировать</h4>
              <div className="space-y-1">
                <Button
                  variant={sortBy === "newest" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("newest")}
                >
                  Сначала новые
                </Button>
                <Button
                  variant={sortBy === "oldest" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("oldest")}
                >
                  Сначала старые
                </Button>
                <Button
                  variant={sortBy === "amount_desc" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("amount_desc")}
                >
                  По убыванию суммы
                </Button>
                <Button
                  variant={sortBy === "amount_asc" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("amount_asc")}
                >
                  По возрастанию суммы
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        </div>
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
                    return (
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-blue-600" />
                      </div>
                    );
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

                    {/* Transaction ID and Device */}
                    <div className="w-24 flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-[#eeeeee]">
                        {transaction.numericId}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {transaction.method?.name || "—"}
                      </div>
                    </div>

                    {/* Payment Status and Date */}
                    <div className="w-48 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-[#eeeeee]">
                        {getPaymentStatus()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                          getBankIcon(transaction.requisites.bankType)}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-[#eeeeee]">
                            {transaction.requisites?.cardNumber || "—"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {transaction.clientName}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="w-32 flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-[#eeeeee]">
                        {usdtAmount} USDT
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {transaction.amount.toLocaleString("ru-RU")} ₽
                      </div>
                    </div>

                    {/* Rate */}
                    <div className="w-32 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
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
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden rounded-3xl">
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
                      {selectedTransaction.numericId}
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
                            if (selectedTransaction.deviceId) {
                              router.push(
                                `/trader/devices/${selectedTransaction.deviceId}`,
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
                      <div className="text-center space-y-3">
                        <p className="text-sm text-gray-500">
                          Сделка готова к закрытию{" "}
                          <span className="text-blue-600 cursor-pointer hover:underline">
                            спором
                          </span>
                        </p>
                        <div className="space-y-2">
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => manualCloseTransaction(selectedTransaction.id)}
                          >
                            Закрыть сделку вручную
                          </Button>
                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => setSelectedTransaction(null)}
                          >
                            Отмена
                          </Button>
                        </div>
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
                      {selectedTransaction.requisites?.bankType && (
                        <div className="scale-125">
                          {getBankIcon(selectedTransaction.requisites.bankType)}
                        </div>
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
            bankType:
              selectedTransaction.requisites?.bankType ||
              selectedTransaction.assetOrBank,
            cardNumber:
              selectedTransaction.requisites?.cardNumber ||
              "2200 0000 0000 0000",
            recipientName:
              selectedTransaction.requisites?.recipientName ||
              selectedTransaction.clientName,
            phoneNumber: "+7 900 000 00 00",
            accountNumber: "40817810490069500347",
            status:
              selectedTransaction.status === "READY" ? "active" : "inactive",
            device: {
              id: "device-123",
              name: "Рабочее устройство",
            },
            stats: {
              turnover24h: selectedTransaction.amount || 0,
              deals24h: 1,
              profit24h: selectedTransaction.calculatedCommission || 0,
              conversion24h: 95,
            },
            verifications: {
              cardNumber: false,
              accountNumber: false,
              phoneNumber: true,
            },
          }}
        />
      )}
    </div>
  );
}
