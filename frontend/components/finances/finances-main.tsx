"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  ChevronRight,
  Wallet,
  CreditCard,
  DollarSign,
  Info,
  AlertCircle,
  Copy,
  CheckCircle2,
  Shield,
  Users,
  TrendingUpIcon,
  ArrowUpDown,
  ChevronDown,
  WalletIcon,
  Banknote,
  BanknoteIcon,
} from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTraderFinancials } from "@/hooks/use-trader-financials";
import { TraderHeader } from "@/components/trader/trader-header";
import { DepositDialog } from "@/components/finances/deposit-dialog";
import { WithdrawalDialog } from "@/components/finances/withdrawal-dialog";
import { cn } from "@/lib/utils";

interface AccountOperation {
  id: string;
  type:
    | "deposit"
    | "withdrawal"
    | "commission"
    | "freeze"
    | "unfreeze"
    | "profit";
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed" | "active";
  date: string;
  description: string;
  txHash?: string;
  dealId?: number;
}

interface DepositRequest {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "confirmed" | "failed";
  date: string;
  network: string;
  txHash?: string;
}

const mockOperations: AccountOperation[] = [
  {
    id: "op-1",
    type: "deposit",
    amount: 5000,
    currency: "USDT",
    status: "completed",
    date: "2024-01-15T14:23:11Z",
    description: "Пополнение баланса",
    txHash: "0x1234567890abcdef",
  },
  {
    id: "op-2",
    type: "withdrawal",
    amount: 1500,
    currency: "USDT",
    status: "completed",
    date: "2024-01-14T10:15:33Z",
    description: "Вывод средств",
    txHash: "0x8765432109fedcba",
  },
  {
    id: "op-3",
    type: "commission",
    amount: 25.5,
    currency: "USDT",
    status: "completed",
    date: "2024-01-13T18:45:22Z",
    description: "Комиссия за сделку #12345",
    dealId: 12345,
  },
  {
    id: "op-4",
    type: "freeze",
    amount: 1000,
    currency: "USDT",
    status: "active",
    date: "2024-01-12T09:30:00Z",
    description: "Заморозка средств для сделки #12346",
    dealId: 12346,
  },
  {
    id: "op-5",
    type: "unfreeze",
    amount: 800,
    currency: "USDT",
    status: "completed",
    date: "2024-01-11T16:20:45Z",
    description: "Разморозка средств по сделке #12344",
    dealId: 12344,
  },
  {
    id: "op-6",
    type: "profit",
    amount: 150.75,
    currency: "USDT",
    status: "completed",
    date: "2024-01-10T12:30:15Z",
    description: "Прибыль с приема платежей",
    dealId: 12343,
  },
];

const mockDepositRequests: DepositRequest[] = [
  {
    id: "req-1",
    amount: 2000,
    currency: "USDT",
    status: "pending",
    date: "2024-01-15T12:00:00Z",
    network: "TRC-20",
    txHash: "0xabc123def456",
  },
  {
    id: "req-2",
    amount: 5000,
    currency: "USDT",
    status: "confirmed",
    date: "2024-01-14T15:30:00Z",
    network: "TRC-20",
    txHash: "0xdef456abc123",
  },
];

export function FinancesMain() {
  const [activeTab, setActiveTab] = useState("operations");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState("month");
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const financials = useTraderFinancials();

  const filteredOperations = mockOperations.filter((op) => {
    if (filterType !== "all" && op.type !== filterType) return false;
    if (filterStatus !== "all" && op.status !== filterStatus) return false;
    if (
      searchQuery &&
      !op.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const getOperationIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownRight className="h-4 w-4" />;
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4" />;
      case "commission":
        return <DollarSign className="h-4 w-4" />;
      case "freeze":
        return <AlertCircle className="h-4 w-4" />;
      case "unfreeze":
        return <CheckCircle2 className="h-4 w-4" />;
      case "profit":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case "deposit":
        return "text-[#006039]";
      case "withdrawal":
        return "text-red-600";
      case "commission":
        return "text-orange-600";
      case "freeze":
        return "text-blue-600";
      case "unfreeze":
        return "text-[#006039]";
      case "profit":
        return "text-[#006039]";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 border-green-200" style={{ color: '#006039' }}>
            Завершено
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Ожидает
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Ошибка
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Активно
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            Неизвестно
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Финансы</h1>
        <TraderHeader />
      </div>

      {/* Balance Cards */}
      <h2 className="text-xl font-semibold mb-4 text-gray-400">Балансы</h2>

      <div className="flex flex-wrap gap-4">
        {/* ТРАСТ */}
        <Card className="p-6 flex-1 min-w-[320px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">ТРАСТ</span>
              <Button
                size="sm"
                className="bg-[#006039]/10 hover:bg-[#006039]/20 text-gray-700 h-7 px-2"
                onClick={() => setDepositDialogOpen(true)}
              >
                <Wallet className="h-3 w-3 mr-1" style={{ color: '#006039' }} />
                Пополнить
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {(financials?.trustBalance || 0).toFixed(2)}
              </span>
              <span className="text-sm font-medium text-[#006039]">USDT</span>
            </div>
            <div className="flex items-center gap-1 text-sm" style={{ color: '#006039' }}>
              <TrendingUp className="h-3 w-3" style={{ color: '#006039' }} />
              <span>+12.5%</span>
            </div>
          </div>
        </Card>

        {/* Компенсация выплат */}
        <Card className="p-6 flex-1 min-w-[320px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Компенсация выплат</span>
              <Button
                size="sm"
                className="bg-[#006039]/10 hover:bg-[#006039]/20 text-gray-700 h-7 px-2"
                onClick={() => setWithdrawalDialogOpen(true)}
              >
                <Wallet className="h-3 w-3 mr-1" style={{ color: '#006039' }} />
                Вывод средств
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {(financials?.compensationBalance || 0).toFixed(2)}
              </span>
              <span className="text-sm font-medium text-[#006039]">USDT</span>
            </div>
            <div className="text-sm text-gray-500">Страховой резерв</div>
          </div>
        </Card>

        {/* Прибыль с приема */}
        <Card className="p-6 flex-1 min-w-[320px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Прибыль с приема</span>
              <Button
                size="sm"
                className="bg-[#006039]/10 hover:bg-[#006039]/20 text-gray-700 h-7 px-2"
                onClick={() => setWithdrawalDialogOpen(true)}
              >
                <Wallet className="h-3 w-3 mr-1" style={{ color: '#006039' }} />
                Вывод средств
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: '#006039' }}>
                +{(financials?.profitFromDeals || 0).toFixed(2)}
              </span>
              <span className="text-sm font-medium text-[#006039]">USDT</span>
            </div>
            <div className="flex items-center gap-1 text-sm" style={{ color: '#006039' }}>
              <TrendingUp className="h-3 w-3" style={{ color: '#006039' }} />
              <span>+8.3%</span>
            </div>
          </div>
        </Card>

        {/* Прибыль с выплат */}
        <Card className="p-6 flex-1 min-w-[320px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Прибыль с выплат</span>
              <Button
                size="sm"
                className="bg-[#006039]/10 hover:bg-[#006039]/20 text-gray-700 h-7 px-2"
                onClick={() => setWithdrawalDialogOpen(true)}
              >
                <Wallet className="h-3 w-3 mr-1" style={{ color: '#006039' }} />
                Вывод средств
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: '#006039' }}>
                +{(financials?.profitFromPayouts || 0).toFixed(2)}
              </span>
              <span className="text-sm font-medium text-[#006039]">USDT</span>
            </div>
            <div className="flex items-center gap-1 text-sm" style={{ color: '#006039' }}>
              <TrendingUp className="h-3 w-3" style={{ color: '#006039' }} />
              <span>+15.2%</span>
            </div>
          </div>
        </Card>

        {/* РЕФЕРАЛЬНЫЙ БАЛАНС */}
        <Card className="p-6 flex-1 min-w-[320px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">РЕФЕРАЛЬНЫЙ БАЛАНС</span>
              <Button
                size="sm"
                className="bg-[#006039]/10 hover:bg-[#006039]/20 text-gray-700 h-7 px-2"
                onClick={() => setWithdrawalDialogOpen(true)}
              >
                <Wallet className="h-3 w-3 mr-1" style={{ color: '#006039' }} />
                Вывод средств
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {(financials?.referralBalance || 0).toFixed(2)}
              </span>
              <span className="text-sm font-medium text-[#006039]">USDT</span>
            </div>
            <div className="flex items-center gap-1 text-sm" style={{ color: '#006039' }}>
              <TrendingUp className="h-3 w-3" style={{ color: '#006039' }} />
              <span>+5.7%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Frozen Funds Section */}
      <h2 className="text-xl font-semibold mb-4 text-gray-400">
        Замороженные средства
      </h2>
      <div className="flex flex-wrap gap-4">
        {/* ЭСКРОУ-СЧЕТ */}
        <Card className="p-6 flex-1 min-w-[240px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">ЭСКРОУ-СЧЕТ</span>
              <Shield className="h-4 w-4 text-[#006039]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {(financials?.escrowBalance || 0).toFixed(2)}
              </span>
              <span className="text-sm font-medium text-[#006039]">USDT</span>
            </div>
            <div className="text-sm text-gray-500">
              Средства в эскроу для активных сделок (проводится сделка)
            </div>
          </div>
        </Card>

        {/* СПОРНЫЕ СДЕЛКИ */}
        <Card className="p-6 flex-1 min-w-[240px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">СПОРНЫЕ СДЕЛКИ</span>
              <AlertCircle className="h-4 w-4 text-[#006039]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {(financials?.disputedBalance || 0).toFixed(2)}
              </span>
              <span className="text-sm font-medium text-[#006039]">USDT</span>
            </div>
            <div className="text-sm text-gray-500">
              Замороженные средства в спорных сделках
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-fit grid-cols-2 gap-1 bg-gray-50 p-1">
          <TabsTrigger
            value="operations"
            className="data-[state=active]:bg-[#006039]/10 h-12 data-[state=active]:text-gray-900 data-[state=active]:shadow-sm px-6"
          >
            <WalletIcon className="h-4 w-4 mr-2" style={{ color: '#006039' }} />
            Операции по счету
          </TabsTrigger>
          <TabsTrigger
            value="deposits"
            className="data-[state=active]:bg-[#006039]/10 h-12 data-[state=active]:text-gray-900 data-[state=active]:shadow-sm px-6"
          >
            <BanknoteIcon className="h-4 w-4 mr-2" style={{ color: '#006039' }} />
            Заявки на пополнение
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="mt-6">
          <Card className="p-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Поиск по операциям..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Тип операции" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все операции</SelectItem>
                  <SelectItem value="deposit">Пополнения</SelectItem>
                  <SelectItem value="withdrawal">Выводы</SelectItem>
                  <SelectItem value="commission">Комиссии</SelectItem>
                  <SelectItem value="freeze">Заморозки</SelectItem>
                  <SelectItem value="unfreeze">Разморозки</SelectItem>
                  <SelectItem value="profit">Прибыль</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="completed">Завершено</SelectItem>
                  <SelectItem value="pending">Ожидает</SelectItem>
                  <SelectItem value="active">Активно</SelectItem>
                  <SelectItem value="failed">Ошибка</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Период" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Сегодня</SelectItem>
                  <SelectItem value="week">Неделя</SelectItem>
                  <SelectItem value="month">Месяц</SelectItem>
                  <SelectItem value="year">Год</SelectItem>
                  <SelectItem value="all">Все время</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Operations List */}
            <div className="space-y-3">
              {filteredOperations.map((operation) => (
                <div
                  key={operation.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "p-2 bg-white rounded-lg",
                        getOperationColor(operation.type),
                      )}
                    >
                      {getOperationIcon(operation.type)}
                    </div>
                    <div>
                      <p className="font-medium">{operation.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(operation.date)}
                        </span>
                        {operation.txHash && (
                          <span className="text-sm text-gray-500 font-mono">
                            {operation.txHash.slice(0, 10)}...
                          </span>
                        )}
                        {operation.dealId && (
                          <Badge variant="secondary" className="text-xs">
                            Сделка #{operation.dealId}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        "font-semibold",
                        operation.type === "deposit" ||
                          operation.type === "unfreeze" ||
                          operation.type === "profit"
                          ? "text-[#006039]"
                          : operation.type === "withdrawal" ||
                              operation.type === "commission" ||
                              operation.type === "freeze"
                            ? "text-red-600"
                            : "text-gray-900",
                      )}
                    >
                      {operation.type === "deposit" ||
                      operation.type === "unfreeze" ||
                      operation.type === "profit"
                        ? "+"
                        : "-"}
                      {operation.amount.toFixed(2)} {operation.currency}
                    </div>
                    <div className="mt-1">
                      {getStatusBadge(operation.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredOperations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Операции не найдены</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="deposits" className="mt-6">
          <Card className="p-6">
            <div className="space-y-4">
              {mockDepositRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-lg" style={{ color: '#006039' }}>
                      <ArrowDownRight className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Пополнение {request.amount.toFixed(2)}{" "}
                        {request.currency}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(request.date)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {request.network}
                        </span>
                        {request.txHash && (
                          <span className="text-sm text-gray-500 font-mono">
                            {request.txHash.slice(0, 10)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold" style={{ color: '#006039' }}>
                      +{request.amount.toFixed(2)} {request.currency}
                    </div>
                    <div className="mt-1">{getStatusBadge(request.status)}</div>
                  </div>
                </div>
              ))}
            </div>

            {mockDepositRequests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Upload className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Заявки на пополнение не найдены</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DepositDialog
        open={depositDialogOpen}
        onOpenChange={setDepositDialogOpen}
      />
      <WithdrawalDialog
        open={withdrawalDialogOpen}
        onOpenChange={setWithdrawalDialogOpen}
      />
    </div>
  );
}
