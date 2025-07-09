"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  CreditCard,
  Clock,
  Copy,
  CalendarIcon,
  ChevronDown,
  Eye,
  CheckCircle,
  Building2,
  Wallet,
  Hash,
  UserRound,
  Phone,
  Filter,
  User,
  LogOut,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTraderAuth } from "@/stores/auth";
import { traderApi } from "@/services/api";
import { payoutApi, type Payout as ApiPayout } from "@/services/payout-api";
import { useRouter } from "next/navigation";

interface Payout {
  id: number;
  amount: number;
  amountUsdt: number;
  wallet: string;
  bank: string;
  total: number;
  totalUsdt: number;
  rate: number;
  isCard: boolean;
  created_at: string;
  accepted_at?: string | null;
  expire_at: string;
  confirmed_at: string | null;
  status?: "created" | "active" | "checking" | "expired" | "completed" | "cancelled";
}

interface TraderProfile {
  id: number;
  numericId: number;
  email: string;
}

export function PayoutsList() {
  const router = useRouter();
  const logout = useTraderAuth((state) => state.logout);
  const [selectedTrafficType, setSelectedTrafficType] = useState<number[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<number[]>([]);
  const [selectedCardBanks, setSelectedCardBanks] = useState<number[]>([]);
  const [balanceInput, setBalanceInput] = useState("");
  const [showIdSearch, setShowIdSearch] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [showRequisitesSearch, setShowRequisitesSearch] = useState(false);
  const [searchRequisites, setSearchRequisites] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [teamEnabled, setTeamEnabled] = useState(false);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(
    null,
  );
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);
  const [payoutBalance, setPayoutBalance] = useState({
    available: 0,
    frozen: 0,
    total: 0,
  });
  const [activeTab, setActiveTab] = useState("all");

  // Bank logos mapping
  const bankLogos: Record<string, string> = {
    Сбербанк: "/bank-logos/sberbank.svg",
    Тинькофф: "/bank-logos/tinkoff.svg",
    ВТБ: "/bank-logos/vtb.svg",
    "Альфа-банк": "/bank-logos/alfabank.svg",
    Райффайзен: "/bank-logos/raiffeisen.svg",
    Открытие: "/bank-logos/otkritie.svg",
    Газпромбанк: "/bank-logos/gazprombank.svg",
    Росбанк: "/bank-logos/rosbank.svg",
    "МТС Банк": "/bank-logos/mts.svg",
    "Почта Банк": "/bank-logos/pochtabank.svg",
    Совкомбанк: "/bank-logos/sovcombank.svg",
    "Хоум Кредит": "/bank-logos/homecredit.svg",
    СБП: "/bank-logos/sbp.svg",
  };

  // Mock data with status
  const examplePayouts: Payout[] = [
    {
      id: 99999,
      amount: 10000,
      amountUsdt: 100,
      wallet: "79001234567",
      bank: "Сбербанк",
      total: 10100,
      totalUsdt: 101,
      rate: 100,
      isCard: false,
      created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      accepted_at: null,
      expire_at: new Date(Date.now() + 1000 * 60 * 13).toISOString(),
      confirmed_at: null,
      status: "created",
    },
    {
      id: 12345,
      amount: 5000,
      amountUsdt: 50,
      wallet: "79123456789",
      bank: "СБП",
      total: 5100,
      totalUsdt: 51,
      rate: 100,
      isCard: false,
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      expire_at: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
      confirmed_at: null,
      status: "active",
    },
    {
      id: 12346,
      amount: 10000,
      amountUsdt: 95.24,
      wallet: "4276 1234 5678 9012",
      bank: "Сбербанк",
      total: 10200,
      totalUsdt: 97.14,
      rate: 105,
      isCard: true,
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      expire_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      confirmed_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      status: "completed",
    },
    {
      id: 12347,
      amount: 15000,
      amountUsdt: 142.86,
      wallet: "5536 9876 5432 1098",
      bank: "Тинькофф",
      total: 15300,
      totalUsdt: 145.71,
      rate: 105,
      isCard: true,
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      expire_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      confirmed_at: null,
      status: "active",
    },
    {
      id: 12348,
      amount: 8000,
      amountUsdt: 80,
      wallet: "79987654321",
      bank: "СБП",
      total: 8160,
      totalUsdt: 81.6,
      rate: 100,
      isCard: false,
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      expire_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      confirmed_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: "completed",
    },
    {
      id: 12349,
      amount: 25000,
      amountUsdt: 238.1,
      wallet: "4255 1919 2424 3636",
      bank: "ВТБ",
      total: 25500,
      totalUsdt: 242.86,
      rate: 105,
      isCard: true,
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      expire_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      confirmed_at: null,
      status: "active",
    },
    {
      id: 12350,
      amount: 12000,
      amountUsdt: 120,
      wallet: "79111222333",
      bank: "СБП",
      total: 12240,
      totalUsdt: 122.4,
      rate: 100,
      isCard: false,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      expire_at: new Date(Date.now() - 600000).toISOString(),
      confirmed_at: null,
      status: "expired",
    },
    {
      id: 12351,
      amount: 30000,
      amountUsdt: 285.71,
      wallet: "5469 5500 1234 5678",
      bank: "Альфа-банк",
      total: 30600,
      totalUsdt: 291.43,
      rate: 105,
      isCard: true,
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      expire_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      confirmed_at: null,
      status: "cancelled",
    },
  ];

  // Helper functions
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован`);
  };

  const formatRemainingTime = (expire_at: string) => {
    const now = new Date().getTime();
    const expiresAt = new Date(expire_at).getTime();
    const diff = expiresAt - now;

    if (diff <= 0) return "Истекло";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
  };

  const getStatusColor = (payout: Payout) => {
    const now = new Date().getTime();
    const expiresAt = new Date(payout.expire_at).getTime();

    if (payout.status === "completed" || payout.confirmed_at) {
      return "bg-green-100 text-green-700";
    } else if (payout.status === "cancelled") {
      return "bg-red-100 text-red-700";
    } else if (payout.status === "checking") {
      return "bg-purple-100 text-purple-700";
    } else if (payout.status === "created") {
      return "bg-yellow-100 text-yellow-700";
    } else if (payout.status === "expired" || expiresAt < now) {
      return "bg-gray-100 text-gray-700";
    } else {
      return "bg-blue-100 text-blue-700";
    }
  };

  const getStatusText = (payout: Payout) => {
    const now = new Date().getTime();
    const expiresAt = new Date(payout.expire_at).getTime();

    if (payout.status === "completed" || payout.confirmed_at) {
      return "Выплачено";
    } else if (payout.status === "cancelled") {
      return "Отменено";
    } else if (payout.status === "checking") {
      return "Проверка";
    } else if (payout.status === "created") {
      return "Создана";
    } else if (payout.status === "expired" || expiresAt < now) {
      return "Истекло";
    } else {
      return formatRemainingTime(payout.expire_at);
    }
  };

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update timers
      setBalanceInput((prev) => prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load team state from localStorage
    const savedTeamState = localStorage.getItem("teamEnabled");
    if (savedTeamState !== null) {
      setTeamEnabled(savedTeamState === "true");
    }

    // Fetch initial data
    fetchTraderProfile();
    fetchPayouts();
    fetchPayoutBalance();
  }, []);

  useEffect(() => {
    // Save team state to localStorage whenever it changes
    localStorage.setItem("teamEnabled", teamEnabled.toString());
  }, [teamEnabled]);
  
  useEffect(() => {
    // Refetch payouts when tab changes
    fetchPayouts();
  }, [activeTab]);

  const fetchTraderProfile = async () => {
    try {
      const response = await traderApi.getProfile();
      if (response) {
        setTraderProfile({
          id: response.id || 0,
          numericId: response.numericId || 0,
          email: response.email || "trader@example.com",
        });
      }
    } catch (error) {
      console.error("Failed to fetch trader profile:", error);
      setTraderProfile({
        id: 0,
        numericId: 0,
        email: "trader@example.com",
      });
    }
  };

  const handleLogout = () => {
    logout();
    if (typeof window !== "undefined") {
      localStorage.removeItem("trader-auth");
    }
    router.push("/trader/login");
  };
  
  const fetchPayouts = async () => {
    setLoading(true);
    try {
      let status: string | undefined;
      switch (activeTab) {
        case "active":
          status = "ACTIVE";
          break;
        case "check":
          status = "CHECKING";
          break;
        case "history":
          status = "COMPLETED";
          break;
        case "cancelled":
          status = "CANCELLED";
          break;
      }
      
      const response = await payoutApi.getPayouts({
        status,
        search: searchId || searchRequisites || undefined,
      });
      
      if (response.success) {
        // Convert API payouts to component format
        const formattedPayouts: Payout[] = response.payouts.map(p => ({
          id: p.numericId,
          amount: p.amount,
          amountUsdt: p.amountUsdt,
          wallet: p.wallet,
          bank: p.bank,
          total: p.total,
          totalUsdt: p.totalUsdt,
          rate: p.rate,
          isCard: p.isCard,
          created_at: p.createdAt,
          accepted_at: p.acceptedAt,
          expire_at: p.expireAt,
          confirmed_at: p.confirmedAt,
          status: p.status.toLowerCase() as any,
        }));
        setPayouts(formattedPayouts);
      }
    } catch (error) {
      console.error("Failed to fetch payouts:", error);
      // Fall back to mock data on error
      const filteredMockPayouts = activeTab === "all" ? examplePayouts : 
        examplePayouts.filter(p => {
          if (activeTab === "active") return p.status === "active" || p.status === "created";
          if (activeTab === "check") return p.status === "checking";
          if (activeTab === "history") return p.status === "completed";
          if (activeTab === "cancelled") return p.status === "cancelled";
          return true;
        });
      setPayouts(filteredMockPayouts);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPayoutBalance = async () => {
    try {
      const response = await payoutApi.getBalance();
      if (response.success) {
        setPayoutBalance(response.balance);
        setBalanceInput(response.balance.available.toString());
      }
    } catch (error) {
      console.error("Failed to fetch payout balance:", error);
      // Fall back to mock balance on error
      const mockBalance = {
        available: 150000,
        frozen: 25000,
        total: 175000,
      };
      setPayoutBalance(mockBalance);
      setBalanceInput(mockBalance.available.toString());
    }
  };
  
  const handleSaveBalance = async () => {
    try {
      const balance = parseFloat(balanceInput);
      if (isNaN(balance) || balance < 0) {
        toast.error("Неверная сумма баланса");
        return;
      }
      
      const response = await payoutApi.updateBalance(balance);
      if (response.success) {
        setPayoutBalance(response.balance);
        toast.success("Баланс обновлен");
      }
    } catch (error) {
      console.error("Failed to update balance:", error);
      // Fall back to local update on error
      const balance = parseFloat(balanceInput);
      if (!isNaN(balance) && balance >= 0) {
        setPayoutBalance(prev => ({
          ...prev,
          available: balance,
          total: balance + prev.frozen,
        }));
        toast.success("Баланс обновлен локально");
      } else {
        toast.error("Не удалось обновить баланс");
      }
    }
  };
  
  const handleAcceptPayout = async (payoutId: number) => {
    try {
      const payout = payouts.find(p => p.id === payoutId);
      if (!payout) return;
      
      const response = await payoutApi.acceptPayout(payout.id.toString());
      if (response.success) {
        toast.success("Выплата принята в работу");
        fetchPayouts();
        fetchPayoutBalance();
      }
    } catch (error: any) {
      console.error("Failed to accept payout:", error);
      // Fall back to local update on error
      setPayouts(prev => prev.map(p => 
        p.id === payoutId 
          ? { ...p, status: "active" as const, accepted_at: new Date().toISOString() }
          : p
      ));
      toast.success("Выплата принята в работу (локально)");
    }
  };

  // Filter payouts locally (server already filters by status)
  const filteredPayouts = payouts.filter((payout) => {
    if (searchId && !payout.id.toString().includes(searchId)) {
      return false;
    }
    if (
      searchRequisites &&
      !payout.wallet.toLowerCase().includes(searchRequisites.toLowerCase()) &&
      !payout.bank.toLowerCase().includes(searchRequisites.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const PayoutCard = ({ payout }: { payout: Payout }) => (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className="bg-white rounded-lg border border-gray-200 p-5 hover:bg-gray-50 transition-colors cursor-pointer mb-4 h-[100px]"
          onClick={() => setSelectedPayout(payout)}
        >
          <div className="grid grid-cols-[60px_140px_1fr_160px_160px_100px_120px] gap-4 items-center h-full">
            {/* Icon */}
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 bg-gray-50 rounded-lg shadow-sm flex items-center justify-center">
                {payout.isCard ? (
                  <CreditCard className="h-7 w-7 text-gray-700" />
                ) : (
                  <img
                    src="/bank-logos/sbp.svg"
                    alt="СБП"
                    className="h-7 w-7"
                  />
                )}
              </div>
            </div>

            {/* ID and Date */}
            <div className="space-y-0.5">
              <div
                className="font-medium text-base hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(payout.id.toString(), "ID");
                }}
              >
                #{payout.id}
              </div>
              <div className="text-xs text-gray-500">
                {format(new Date(payout.created_at), "HH:mm", {
                  locale: ru,
                })}
              </div>
              {payout.accepted_at && (
                <div className="text-xs text-green-600">
                  {format(new Date(payout.accepted_at), "HH:mm", {
                    locale: ru,
                  })}
                </div>
              )}
            </div>

            {/* Requisites */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-50 rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
                <img
                  src={bankLogos[payout.bank] || ""}
                  alt={payout.bank}
                  className="h-7 w-7"
                />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-base truncate">
                  {payout.wallet}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {payout.bank}
                </div>
              </div>
            </div>

            {/* Amount */}
            <div
              className="space-y-1"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(payout.amount.toString(), "Сумма");
              }}
            >
              <div className="font-medium text-base">
                {payout.amount.toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-sm text-gray-500">
                {payout.amountUsdt.toFixed(2)} USDT
              </div>
            </div>

            {/* Total */}
            <div className="space-y-1">
              <div className="font-medium text-base">
                {payout.total.toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-sm text-gray-500">
                {payout.totalUsdt.toFixed(2)} USDT
              </div>
            </div>

            {/* Rate */}
            <div
              className="font-semibold text-base"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(payout.rate.toFixed(2), "Курс");
              }}
            >
              {payout.rate.toFixed(2)}
            </div>

            {/* Status */}
            {payout.status === "created" ? (
              <Button
                size="sm"
                className="h-9 px-4 bg-[#006039] hover:bg-[#004d2e] text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAcceptPayout(payout.id);
                }}
              >
                Взять в работу
              </Button>
            ) : (
              <Badge
                className={cn(
                  "h-9 px-3 rounded-md flex items-center justify-center gap-1.5 text-sm font-medium transition-none hover:brightness-100",
                  getStatusColor(payout),
                )}
                data-badge
              >
                {payout.status === "completed" || payout.confirmed_at ? (
                  <CheckCircle className="h-4 w-4" />
                ) : payout.status === "cancelled" ? (
                  <X className="h-4 w-4" />
                ) : payout.status === "expired" ||
                  new Date(payout.expire_at).getTime() < new Date().getTime() ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                <span>{getStatusText(payout)}</span>
              </Badge>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() =>
            copyToClipboard(`${payout.wallet} ${payout.bank}`, "Реквизиты")
          }
        >
          <Copy className="h-4 w-4 mr-2" />
          Копировать всё
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => copyToClipboard(payout.wallet, "Номер")}
        >
          Копировать номер
        </ContextMenuItem>
        <ContextMenuItem onClick={() => copyToClipboard(payout.bank, "Банк")}>
          Копировать банк
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => setSelectedPayout(payout)}>
          <Eye className="h-4 w-4 mr-2" />
          Подробнее
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 bg-white">
        <h1 className="text-2xl font-semibold">Выплаты</h1>
        <div className="flex items-center gap-4">
          {/* Team toggle switch */}
          <div className="flex items-center gap-2">
            <Label htmlFor="team-switch" className="text-sm text-gray-700">
              Команда
            </Label>
            <Switch
              id="team-switch"
              checked={teamEnabled}
              onCheckedChange={setTeamEnabled}
            />
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-sm font-normal hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-[#006039]" />
                  </div>
                  <span className="text-gray-700 font-medium">
                    #{traderProfile?.numericId || "0000"}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-[#006039]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 hover:bg-gray-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4 text-[#006039]" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white px-6 py-4">
        <div className="flex items-end gap-3">
          {/* Balance block first */}
          <div className="bg-gray-100 rounded-lg px-5 h-12 flex flex-col justify-center min-w-[180px] mr-auto">
            <div className="text-xs text-gray-600">Баланс</div>
            <div className="text-lg font-semibold leading-tight">
              {payoutBalance.available.toLocaleString("ru-RU")} ₽
            </div>
          </div>

          {/* Traffic Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Выбор типа трафика:</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 justify-between w-[200px]"
                >
                  <span className="flex items-center gap-2">
                    {selectedTrafficType.length === 0 ? (
                      "СБП"
                    ) : (
                      <div className="flex gap-1">
                        {selectedTrafficType.includes(1) && (
                          <Badge className="h-5 px-2 bg-green-100 text-green-700 border-green-200">
                            СБП
                          </Badge>
                        )}
                      </div>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuCheckboxItem
                  checked={selectedTrafficType.includes(1)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTrafficType([...selectedTrafficType, 1]);
                    } else {
                      setSelectedTrafficType(
                        selectedTrafficType.filter((t) => t !== 1),
                      );
                    }
                  }}
                  className="cursor-pointer"
                >
                  {selectedTrafficType.includes(1) && (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  СБП
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* SBP Banks */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Выбор банков СБП:</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 justify-between w-[250px]"
                >
                  <span className="flex items-center gap-2">
                    {selectedBanks.length === 0 ? (
                      "Выберите банки"
                    ) : (
                      <div className="flex gap-1">
                        {selectedBanks.slice(0, 2).map((index) => (
                          <Badge
                            key={index}
                            className="h-5 px-2 bg-green-100 text-green-700 border-green-200"
                          >
                            {Object.keys(bankLogos)[index]}
                          </Badge>
                        ))}
                        {selectedBanks.length > 2 && (
                          <Badge className="h-5 px-2 bg-green-100 text-green-700 border-green-200">
                            +{selectedBanks.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[250px] max-h-[300px] overflow-y-auto"
              >
                {Object.keys(bankLogos).map((bank, index) => (
                  <DropdownMenuCheckboxItem
                    key={bank}
                    checked={selectedBanks.includes(index)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedBanks([...selectedBanks, index]);
                      } else {
                        setSelectedBanks(
                          selectedBanks.filter((b) => b !== index),
                        );
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {selectedBanks.includes(index) && (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {bank}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Card Banks */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              Выбор банков по картам:
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 justify-between w-[250px]"
                >
                  <span className="flex items-center gap-2">
                    {selectedCardBanks.length === 0 ? (
                      "Выберите банки"
                    ) : (
                      <div className="flex gap-1">
                        {selectedCardBanks.slice(0, 2).map((index) => {
                          const banks = Object.keys(bankLogos).filter(
                            (bank) => bank !== "СБП",
                          );
                          return (
                            <Badge
                              key={index}
                              className="h-5 px-2 bg-green-100 text-green-700 border-green-200"
                            >
                              {banks[index]}
                            </Badge>
                          );
                        })}
                        {selectedCardBanks.length > 2 && (
                          <Badge className="h-5 px-2 bg-green-100 text-green-700 border-green-200">
                            +{selectedCardBanks.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[250px] max-h-[300px] overflow-y-auto"
              >
                {Object.keys(bankLogos)
                  .filter((bank) => bank !== "СБП")
                  .map((bank, index) => (
                    <DropdownMenuCheckboxItem
                      key={bank}
                      checked={selectedCardBanks.includes(index)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCardBanks([...selectedCardBanks, index]);
                        } else {
                          setSelectedCardBanks(
                            selectedCardBanks.filter((b) => b !== index),
                          );
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {selectedCardBanks.includes(index) && (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {bank}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Balance Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Баланс</label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="0.00"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                className="h-12 w-32 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <Button 
                variant="outline" 
                className="h-12 hover:text-current"
                onClick={handleSaveBalance}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        {/* Tabs */}
        <div className="bg-white px-6 pb-4">
          <TabsList className="h-12 p-1">
            <TabsTrigger value="all" className="h-10 px-6">
              Все
            </TabsTrigger>
            <TabsTrigger value="active" className="h-10 px-6">
              Активные
            </TabsTrigger>
            <TabsTrigger value="check" className="h-10 px-6">
              Проверка
            </TabsTrigger>
            <TabsTrigger value="finalization" className="h-10 px-6">
              Финализация
            </TabsTrigger>
            <TabsTrigger value="history" className="h-10 px-6">
              История
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="h-10 px-6">
              Отменённые
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 overflow-hidden px-6 py-4">
          {/* Column Headers */}
          <div className="grid grid-cols-[60px_140px_1fr_160px_160px_100px_120px] gap-4 items-center px-5 py-3 text-sm font-medium text-gray-600 mb-4">
            <div></div>
            <div className="flex items-center gap-2">
              {showIdSearch ? (
                <div className="flex items-center gap-1 animate-fade-in">
                  <Input
                    placeholder="ID"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setShowIdSearch(false);
                      setSearchId("");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span>Заявка</span>
                  <Search
                    className="h-3.5 w-3.5 cursor-pointer text-gray-400 hover:text-gray-600"
                    onClick={() => setShowIdSearch(true)}
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showRequisitesSearch ? (
                <div className="flex items-center gap-1 animate-fade-in">
                  <Input
                    placeholder="Поиск реквизитов"
                    value={searchRequisites}
                    onChange={(e) => setSearchRequisites(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setShowRequisitesSearch(false);
                      setSearchRequisites("");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span>Реквизиты</span>
                  <Search
                    className="h-3.5 w-3.5 cursor-pointer text-gray-400 hover:text-gray-600"
                    onClick={() => setShowRequisitesSearch(true)}
                  />
                </>
              )}
            </div>
            <div>Сумма</div>
            <div>Сумма к списанию</div>
            <div>Курс</div>
            <div>Статус</div>
          </div>

          <ScrollArea className="h-[calc(100vh-360px)]">
            <div className="space-y-0">
              {filteredPayouts.map((payout) => (
                <PayoutCard key={payout.id} payout={payout} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="active" className="flex-1 p-6">
          <p className="text-gray-500">Активные выплаты</p>
        </TabsContent>

        <TabsContent value="check" className="flex-1 p-6">
          <p className="text-gray-500">Выплаты на проверке</p>
        </TabsContent>

        <TabsContent value="finalization" className="flex-1 p-6">
          <p className="text-gray-500">Выплаты на финализации</p>
        </TabsContent>

        <TabsContent value="history" className="flex-1 p-6">
          <p className="text-gray-500">История выплат</p>
        </TabsContent>

        <TabsContent value="cancelled" className="flex-1 p-6">
          <p className="text-gray-500">Отменённые выплаты</p>
        </TabsContent>
      </Tabs>

      {/* Payout Details Dialog */}
      <Dialog
        open={!!selectedPayout}
        onOpenChange={() => setSelectedPayout(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали выплаты #{selectedPayout?.id}</DialogTitle>
            <DialogDescription>Полная информация о выплате</DialogDescription>
          </DialogHeader>
          {selectedPayout && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Создана</p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedPayout.created_at),
                      "dd.MM.yyyy HH:mm",
                      {
                        locale: ru,
                      },
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Статус</p>
                  <Badge className={cn("mt-1", getStatusColor(selectedPayout))}>
                    {getStatusText(selectedPayout)}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Реквизиты</p>
                  <p className="font-medium">{selectedPayout.wallet}</p>
                  <p className="text-sm text-gray-600">{selectedPayout.bank}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Курс</p>
                  <p className="font-medium text-lg">{selectedPayout.rate}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Сумма</p>
                  <p className="font-medium">
                    {selectedPayout.amount.toLocaleString("ru-RU")} ₽
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedPayout.amountUsdt.toFixed(2)} USDT
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">К списанию</p>
                  <p className="font-medium">
                    {selectedPayout.total.toLocaleString("ru-RU")} ₽
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedPayout.totalUsdt.toFixed(2)} USDT
                  </p>
                </div>
              </div>
              {selectedPayout.confirmed_at && (
                <div>
                  <p className="text-sm text-gray-500">Подтверждена</p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedPayout.confirmed_at),
                      "dd.MM.yyyy HH:mm",
                      {
                        locale: ru,
                      },
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
