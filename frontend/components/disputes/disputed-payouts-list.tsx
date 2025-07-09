"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { traderApi } from "@/services/api"
import { toast } from "sonner"
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
  AlertCircle,
  Send,
  Wallet,
  FileText,
  XCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DisputedPayout {
  id: string
  numericId: number
  amount: number
  currency: string
  status: string
  method: string
  recipientName?: string
  cardNumber?: string
  walletAddress?: string
  bankType?: string
  createdAt: string
  completedAt?: string
  transactionHash?: string
  commission?: number
  disputeStatus: "open" | "in_review" | "resolved" | "rejected"
  disputeReason: string
  disputeCreatedAt: string
  disputeResolution?: string
}

const statusConfig = {
  PENDING: { label: "Ожидает", color: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  PROCESSING: { label: "В обработке", color: "bg-blue-50 text-blue-600 border-blue-200" },
  COMPLETED: { label: "Выполнено", color: "bg-green-50 text-green-600 border-green-200" },
  FAILED: { label: "Ошибка", color: "bg-red-50 text-red-600 border-red-200" },
  CANCELLED: { label: "Отменено", color: "bg-gray-50 text-gray-600 border-gray-200" },
}

const disputeStatusConfig = {
  open: { label: "Открыт", color: "bg-red-50 text-red-600 border-red-200" },
  in_review: { label: "На рассмотрении", color: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  resolved: { label: "Решен", color: "bg-green-50 text-green-600 border-green-200" },
  rejected: { label: "Отклонен", color: "bg-gray-50 text-gray-600 border-gray-200" },
}

export function DisputedPayoutsList() {
  const [payouts, setPayouts] = useState<DisputedPayout[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayout, setSelectedPayout] = useState<DisputedPayout | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterDisputeStatus, setFilterDisputeStatus] = useState("all")
  const [filterMethod, setFilterMethod] = useState("all")
  const [filterAmount, setFilterAmount] = useState({ exact: "", min: "", max: "" })
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [stats, setStats] = useState({
    openDisputes: 0,
    inReviewDisputes: 0,
    resolvedDisputes: 0,
    totalAmount: 0
  })

  useEffect(() => {
    fetchPayouts()
  }, [])

  const fetchPayouts = async () => {
    try {
      setLoading(true)

      // Mock disputed payouts data
      const mockPayouts: DisputedPayout[] = [
        {
          id: "dp-1",
          numericId: 2001,
          amount: 250.00,
          currency: "USDT",
          status: "FAILED",
          method: "card",
          recipientName: "Сергей Иванов",
          cardNumber: "4276 **** **** 5678",
          bankType: "SBERBANK",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          transactionHash: "0xabcdef1234567890",
          commission: 5.00,
          disputeStatus: "open",
          disputeReason: "Средства не поступили на карту",
          disputeCreatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "dp-2",
          numericId: 2002,
          amount: 100.50,
          currency: "USDT",
          status: "COMPLETED",
          method: "wallet",
          walletAddress: "0x742d35Cc6632C0532C718123",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          transactionHash: "0x123456789abcdef0",
          commission: 2.01,
          disputeStatus: "in_review",
          disputeReason: "Неверный адрес кошелька",
          disputeCreatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "dp-3",
          numericId: 2003,
          amount: 500.00,
          currency: "USDT",
          status: "PROCESSING",
          method: "card",
          recipientName: "Мария Петрова",
          cardNumber: "5536 **** **** 9012",
          bankType: "TBANK",
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          commission: 10.00,
          disputeStatus: "resolved",
          disputeReason: "Двойное списание средств",
          disputeCreatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          disputeResolution: "Средства возвращены на счет клиента"
        }
      ]

      setPayouts(mockPayouts)

      // Calculate stats
      setStats({
        openDisputes: mockPayouts.filter(p => p.disputeStatus === "open").length,
        inReviewDisputes: mockPayouts.filter(p => p.disputeStatus === "in_review").length,
        resolvedDisputes: mockPayouts.filter(p => p.disputeStatus === "resolved").length,
        totalAmount: mockPayouts.reduce((sum, p) => sum + p.amount, 0)
      })

    } catch (error) {
      console.error("Error fetching disputed payouts:", error)
      toast.error("Не удалось загрузить спорные выплаты")
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedPayouts = payouts
    .filter((payout) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !payout.id.toLowerCase().includes(query) &&
          !payout.numericId.toString().includes(query) &&
          !payout.recipientName?.toLowerCase().includes(query) &&
          !payout.cardNumber?.includes(query) &&
          !payout.walletAddress?.toLowerCase().includes(query) &&
          !payout.disputeReason.toLowerCase().includes(query)
        ) {
          return false
        }
      }

      // Status filter
      if (filterStatus !== "all" && payout.status !== filterStatus) return false

      // Dispute status filter
      if (filterDisputeStatus !== "all" && payout.disputeStatus !== filterDisputeStatus) return false

      // Method filter
      if (filterMethod !== "all" && payout.method !== filterMethod) return false

      // Amount filter
      if (filterAmount.min && payout.amount < parseFloat(filterAmount.min)) return false
      if (filterAmount.max && payout.amount > parseFloat(filterAmount.max)) return false

      // Date filter
      if (filterDateFrom && new Date(payout.createdAt) < new Date(filterDateFrom)) return false
      if (filterDateTo && new Date(payout.createdAt) > new Date(filterDateTo)) return false

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "amount_desc":
          return b.amount - a.amount
        case "amount_asc":
          return a.amount - b.amount
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

  const activeFiltersCount = [
    filterStatus !== "all" && 1,
    filterDisputeStatus !== "all" && 1,
    filterMethod !== "all" && 1,
    (filterAmount.min || filterAmount.max) && 1,
    (filterDateFrom || filterDateTo) && 1,
  ].filter(Boolean).length

  const clearFilters = () => {
    setFilterStatus("all")
    setFilterDisputeStatus("all")
    setFilterMethod("all")
    setFilterAmount({ exact: "", min: "", max: "" })
    setFilterDateFrom("")
    setFilterDateTo("")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Открытые споры</p>
              <p className="text-2xl font-bold text-red-600">{stats.openDisputes}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">На рассмотрении</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inReviewDisputes}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Решенные споры</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolvedDisputes}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Общая сумма</p>
              <p className="text-2xl font-bold">{stats.totalAmount.toFixed(2)} USDT</p>
            </div>
            <DollarSign className="h-8 w-8 text-[#006039]" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск по ID, получателю или причине спора"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Фильтры</span>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Фильтры</h4>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-8 px-2 text-xs"
                      >
                        Сбросить
                      </Button>
                    )}
                  </div>

                  {/* Dispute Status Filter */}
                  <div>
                    <Label className="text-sm">Статус спора</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between mt-1">
                          <span>
                            {filterDisputeStatus === "all"
                              ? "Все статусы"
                              : disputeStatusConfig[filterDisputeStatus]?.label}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem onClick={() => setFilterDisputeStatus("all")}>
                          Все статусы
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {Object.entries(disputeStatusConfig).map(([key, config]) => (
                          <DropdownMenuItem
                            key={key}
                            onClick={() => setFilterDisputeStatus(key)}
                          >
                            {config.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <Label className="text-sm">Статус выплаты</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between mt-1">
                          <span>
                            {filterStatus === "all"
                              ? "Все статусы"
                              : statusConfig[filterStatus]?.label}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                          Все статусы
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <DropdownMenuItem key={key} onClick={() => setFilterStatus(key)}>
                            {config.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Method Filter */}
                  <div>
                    <Label className="text-sm">Метод</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between mt-1">
                          <span>
                            {filterMethod === "all"
                              ? "Все методы"
                              : filterMethod === "card"
                              ? "На карту"
                              : "На кошелек"}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem onClick={() => setFilterMethod("all")}>
                          Все методы
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setFilterMethod("card")}>
                          На карту
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterMethod("wallet")}>
                          На кошелек
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Amount Filter */}
                  <div>
                    <Label className="text-sm">Сумма</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="От"
                        value={filterAmount.min}
                        onChange={(e) =>
                          setFilterAmount({ ...filterAmount, min: e.target.value })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="До"
                        value={filterAmount.max}
                        onChange={(e) =>
                          setFilterAmount({ ...filterAmount, max: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {sortBy === "newest"
                      ? "Сначала новые"
                      : sortBy === "oldest"
                      ? "Сначала старые"
                      : sortBy === "amount_desc"
                      ? "Сумма ↓"
                      : "Сумма ↑"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy("newest")}>
                  Сначала новые
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                  Сначала старые
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("amount_desc")}>
                  Сумма по убыванию
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("amount_asc")}>
                  Сумма по возрастанию
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Payouts List */}
      <div className="space-y-4">
        {filteredAndSortedPayouts.length === 0 ? (
          <Card className="p-12 text-center">
            <Send className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Спорных выплат не найдено</p>
          </Card>
        ) : (
          filteredAndSortedPayouts.map((payout) => (
            <Card
              key={payout.id}
              className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedPayout(payout)}
            >
              <div className="flex items-start justify-between">
                {/* Left Section */}
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    payout.disputeStatus === "open" ? "bg-red-100" :
                    payout.disputeStatus === "in_review" ? "bg-yellow-100" :
                    payout.disputeStatus === "resolved" ? "bg-green-100" :
                    "bg-gray-100"
                  )}>
                    <AlertCircle className={cn(
                      "h-6 w-6",
                      payout.disputeStatus === "open" ? "text-red-600" :
                      payout.disputeStatus === "in_review" ? "text-yellow-600" :
                      payout.disputeStatus === "resolved" ? "text-green-600" :
                      "text-gray-600"
                    )} />
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">
                        Выплата #{payout.numericId}
                      </h3>
                      <Badge className={cn("border", disputeStatusConfig[payout.disputeStatus]?.color)}>
                        {disputeStatusConfig[payout.disputeStatus]?.label}
                      </Badge>
                      <Badge className={cn("border", statusConfig[payout.status]?.color)}>
                        {statusConfig[payout.status]?.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {payout.method === "card" ? (
                        <>
                          <span>{payout.cardNumber}</span>
                          <span>•</span>
                          <span>{payout.recipientName}</span>
                        </>
                      ) : (
                        <span className="font-mono">{payout.walletAddress}</span>
                      )}
                    </div>

                    <div className="text-sm text-red-600 font-medium">
                      {payout.disputeReason}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        Создано: {format(new Date(payout.createdAt), "d MMMM yyyy 'в' HH:mm", { locale: ru })}
                      </span>
                      <span>•</span>
                      <span>
                        Спор: {format(new Date(payout.disputeCreatedAt), "d MMMM yyyy 'в' HH:mm", { locale: ru })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Section */}
                <div className="text-right space-y-2">
                  <div className="text-2xl font-bold">
                    {payout.amount.toFixed(2)} {payout.currency}
                  </div>
                  <div className="text-sm text-gray-500">
                    ≈ {(payout.amount * 100).toFixed(0)} RUB
                  </div>
                  {payout.commission && (
                    <div className="text-xs text-gray-500">
                      Комиссия: {payout.commission.toFixed(2)} {payout.currency}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Payout Details Dialog */}
      <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Спор по выплате #{selectedPayout?.numericId}
            </DialogTitle>
            <DialogDescription>
              Детальная информация о спорной выплате
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-6">
              {/* Status and Amount */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className={cn("border", disputeStatusConfig[selectedPayout.disputeStatus]?.color)}>
                    {disputeStatusConfig[selectedPayout.disputeStatus]?.label}
                  </Badge>
                  <Badge className={cn("border", statusConfig[selectedPayout.status]?.color)}>
                    {statusConfig[selectedPayout.status]?.label}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">
                  {selectedPayout.amount.toFixed(2)} {selectedPayout.currency}
                </div>
              </div>

              {/* Dispute Information */}
              <div className="space-y-4">
                <h4 className="font-medium">Информация о споре</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Причина спора</span>
                    <span className="text-red-600 font-medium">{selectedPayout.disputeReason}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Дата создания спора</span>
                    <span>{format(new Date(selectedPayout.disputeCreatedAt), "d MMMM yyyy 'в' HH:mm", { locale: ru })}</span>
                  </div>
                  {selectedPayout.disputeResolution && (
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-gray-600">Решение</span>
                      <span className="text-right max-w-sm">{selectedPayout.disputeResolution}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Details */}
              <div className="space-y-4">
                <h4 className="font-medium">Получатель</h4>
                <div className="space-y-3">
                  {selectedPayout.method === "card" ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Номер карты</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{selectedPayout.cardNumber}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(selectedPayout.cardNumber || "")
                              toast.success("Номер карты скопирован")
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Имя получателя</span>
                        <span>{selectedPayout.recipientName}</span>
                      </div>
                      {selectedPayout.bankType && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Банк</span>
                          <span>{selectedPayout.bankType}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Адрес кошелька</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{selectedPayout.walletAddress}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(selectedPayout.walletAddress || "")
                            toast.success("Адрес кошелька скопирован")
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Details */}
              <div className="space-y-4">
                <h4 className="font-medium">Финансовая информация</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Сумма</span>
                    <span className="font-medium">{selectedPayout.amount.toFixed(2)} {selectedPayout.currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Сумма в рублях</span>
                    <span>{(selectedPayout.amount * 100).toFixed(2)} RUB</span>
                  </div>
                  {selectedPayout.commission && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Комиссия</span>
                      <span>{selectedPayout.commission.toFixed(2)} {selectedPayout.currency}</span>
                    </div>
                  )}
                  {selectedPayout.transactionHash && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Хеш транзакции</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{selectedPayout.transactionHash}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(selectedPayout.transactionHash || "")
                            toast.success("Хеш транзакции скопирован")
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}