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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { traderApi } from "@/services/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
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
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TraderHeader } from "@/components/trader/trader-header"
import { DisputeDetailDialog } from "@/components/disputes/dispute-detail-dialog"

interface Transaction {
  id: string
  numericId: number
  amount: number
  currency: string
  status: string
  clientName: string
  assetOrBank: string
  createdAt: string
  acceptedAt: string | null
  expired_at: string
  isNew?: boolean
  requisiteId?: string
  deviceId?: string
  cardNumber?: string
  merchantName?: string
  disputeStatus?: "open" | "in_review" | "resolved" | "rejected"
  disputeReason?: string
}

const statusConfig = {
  CREATED: { label: "Ожидает", color: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  IN_PROGRESS: { label: "В работе", color: "bg-blue-50 text-blue-600 border-blue-200" },
  READY: { label: "Выполнено", color: "bg-green-50 text-green-600 border-green-200" },
  EXPIRED: { label: "Истекло", color: "bg-red-50 text-red-600 border-red-200" },
  CANCELED: { label: "Отменено", color: "bg-gray-50 text-gray-600 border-gray-200" },
}

export function DisputedDealsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterAmount, setFilterAmount] = useState({ exact: "", min: "", max: "" })
  const [filterAmountType, setFilterAmountType] = useState("range")
  const [filterDevice, setFilterDevice] = useState("all")
  const [filterRequisite, setFilterRequisite] = useState("all")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterDisputeStatus, setFilterDisputeStatus] = useState("all")
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [selectedDispute, setSelectedDispute] = useState<any>(null)
  
  const bankLogos: Record<string, string> = {
    "Сбербанк": "https://cdn.brandfetch.io/sberbank.ru/logo/theme/dark/h/64/w/64",
    "Тинькофф": "https://cdn.brandfetch.io/tbank.ru/logo/theme/dark/h/64/w/64",
    "ВТБ": "https://cdn.brandfetch.io/vtb.com/logo/theme/dark/h/64/w/64",
    "Альфа-Банк": "https://cdn.brandfetch.io/alfabank.com/logo/theme/dark/h/64/w/64",
    "Райффайзен": "https://cdn.brandfetch.io/raiffeisen.ru/logo/theme/dark/h/64/w/64",
    "Открытие": "https://cdn.brandfetch.io/open.ru/logo/theme/dark/h/64/w/64",
    "Газпромбанк": "https://cdn.brandfetch.io/gazprombank.ru/logo/theme/dark/h/64/w/64",
    "Росбанк": "https://cdn.brandfetch.io/rosbank.ru/logo/theme/dark/h/64/w/64",
  }
  
  const router = useRouter()

  useEffect(() => {
    fetchTransactions()
    fetchTraderProfile()
    
    // Add mock transactions with dispute information
    setTransactions([
      {
        id: "1",
        numericId: 10001,
        amount: 15000,
        currency: "RUB",
        status: "IN_PROGRESS",
        clientName: "Иван Петров",
        assetOrBank: "Сбербанк",
        createdAt: new Date(Date.now() - 300000).toISOString(),
        acceptedAt: new Date(Date.now() - 240000).toISOString(),
        expired_at: new Date(Date.now() + 900000).toISOString(),
        isNew: false,
        requisiteId: "1",
        deviceId: "1",
        cardNumber: "4276 3800 5847 1234",
        merchantName: "Apple Store",
        disputeStatus: "open",
        disputeReason: "Платеж не получен"
      },
      {
        id: "2",
        numericId: 10002,
        amount: 8500,
        currency: "RUB",
        status: "CREATED",
        clientName: "Анна Смирнова",
        assetOrBank: "Тинькофф",
        createdAt: new Date(Date.now() - 180000).toISOString(),
        acceptedAt: null,
        expired_at: new Date(Date.now() + 1020000).toISOString(),
        isNew: false,
        requisiteId: "2",
        deviceId: "2",
        cardNumber: "5469 3700 1234 5678",
        merchantName: "Steam",
        disputeStatus: "in_review",
        disputeReason: "Неверная сумма платежа"
      },
      {
        id: "3",
        numericId: 10003,
        amount: 22000,
        currency: "RUB",
        status: "READY",
        clientName: "Михаил Козлов",
        assetOrBank: "ВТБ",
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        acceptedAt: new Date(Date.now() - 1500000).toISOString(),
        expired_at: new Date(Date.now() - 600000).toISOString(),
        isNew: false,
        requisiteId: "1",
        deviceId: "1",
        cardNumber: "4276 3800 5847 1234",
        merchantName: "Wildberries",
        disputeStatus: "resolved",
        disputeReason: "Ошибка в адресе доставки"
      },
      {
        id: "4",
        numericId: 10004,
        amount: 5600,
        currency: "RUB",
        status: "IN_PROGRESS",
        clientName: "Елена Волкова",
        assetOrBank: "Альфа-Банк",
        createdAt: new Date(Date.now() - 600000).toISOString(),
        acceptedAt: new Date(Date.now() - 480000).toISOString(),
        expired_at: new Date(Date.now() + 600000).toISOString(),
        isNew: false,
        requisiteId: "2",
        deviceId: "1",
        cardNumber: "5469 3700 1234 5678",
        merchantName: "Ozon",
        disputeStatus: "rejected",
        disputeReason: "Необоснованная претензия"
      }
    ])
  }, [])
  
  const fetchTransactions = async () => {
    try {
      const response = await traderApi.getTransactions()
      const txData = response.data || response.transactions || []
      
      // Filter only transactions with disputes
      const disputedTxData = txData.filter((tx: Transaction) => tx.disputeStatus)
      
      setTransactions(disputedTxData)
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
      if (loading) {
        toast.error("Не удалось загрузить споры")
      }
    } finally {
      setLoading(false)
    }
  }
  
  const fetchTraderProfile = async () => {
    try {
      const response = await traderApi.getProfile()
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    }
  }
  
  
  const getDisputeStatusColor = (status?: Transaction["disputeStatus"]) => {
    switch (status) {
      case "open":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "in_review":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getDisputeStatusText = (status?: Transaction["disputeStatus"]) => {
    switch (status) {
      case "open":
        return "Открыт"
      case "in_review":
        return "На рассмотрении"
      case "resolved":
        return "Решен"
      case "rejected":
        return "Отклонен"
      default:
        return status
    }
  }
  
  const getFilteredTransactions = () => {
    let filtered = transactions
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.numericId.toString().includes(searchQuery) ||
        t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assetOrBank.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.disputeReason && t.disputeReason.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    
    // Status filter
    if (filterStatus !== "all") {
      switch (filterStatus) {
        case "not_credited":
          filtered = filtered.filter(t => t.status === "CREATED" || t.status === "EXPIRED" || t.status === "CANCELED")
          break
        case "credited":
          filtered = filtered.filter(t => t.status === "READY")
          break
        case "in_progress":
          filtered = filtered.filter(t => t.status === "IN_PROGRESS")
          break
      }
    }
    
    // Dispute status filter
    if (filterDisputeStatus !== "all") {
      filtered = filtered.filter(t => t.disputeStatus === filterDisputeStatus)
    }
    
    // Amount filter
    if (filterAmountType === "exact" && filterAmount.exact) {
      filtered = filtered.filter(t => t.amount === parseFloat(filterAmount.exact))
    } else if (filterAmountType === "range") {
      if (filterAmount.min) {
        filtered = filtered.filter(t => t.amount >= parseFloat(filterAmount.min))
      }
      if (filterAmount.max) {
        filtered = filtered.filter(t => t.amount <= parseFloat(filterAmount.max))
      }
    }
    
    // Device filter
    if (filterDevice !== "all") {
      filtered = filtered.filter(t => t.deviceId === filterDevice)
    }
    
    // Requisite filter
    if (filterRequisite !== "all") {
      filtered = filtered.filter(t => t.requisiteId === filterRequisite)
    }
    
    // Date filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom)
      filtered = filtered.filter(t => new Date(t.createdAt) >= fromDate)
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(t => new Date(t.createdAt) <= toDate)
    }
    
    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "amount_desc":
          return b.amount - a.amount
        case "amount_asc":
          return a.amount - b.amount
        default:
          return 0
      }
    })
    
    return filtered
  }
  
  const filteredTransactions = getFilteredTransactions()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header with user info */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Споры по сделкам</h1>
        
        <TraderHeader />
      </div>
      
      {/* Stats Blocks */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Open Disputes Stats */}
        <Card className="p-4 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm text-gray-600 mb-2">Открытые споры</h3>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-gray-900">
                  {transactions.filter(t => t.disputeStatus === "open" || t.disputeStatus === "in_review").length}
                </div>
                <div className="text-sm text-gray-500">Всего споров: {transactions.length}</div>
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
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    За сегодня
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    За вчера
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    За неделю
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    За месяц
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </Card>

        {/* Resolved Disputes Stats */}
        <Card className="p-4 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm text-gray-600 mb-2">Решенные споры</h3>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-green-600">
                  {transactions.filter(t => t.disputeStatus === "resolved").length}
                </div>
                <div className="text-sm text-gray-500">
                  Отклонено: {transactions.filter(t => t.disputeStatus === "rejected").length}
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
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    За сегодня
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    За вчера
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    За неделю
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    За месяц
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Поиск по ID, ФИО, банку, причине спора..."
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
              {(filterStatus !== "all" || filterDisputeStatus !== "all" || filterAmount.exact || filterAmount.min || filterAmount.max || filterDevice !== "all" || filterRequisite !== "all" || filterDateFrom || filterDateTo) && (
                <Badge className="ml-1 bg-[#006039] text-white">
                  {[filterStatus !== "all", filterDisputeStatus !== "all", filterAmount.exact || filterAmount.min || filterAmount.max, filterDevice !== "all", filterRequisite !== "all", filterDateFrom || filterDateTo].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Фильтры</h4>
              
              {/* Dispute Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Статус спора</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      {filterDisputeStatus === "all" ? "Все споры" : 
                       filterDisputeStatus === "open" ? "споры на рассмотрение трейдером" :
                       filterDisputeStatus === "in_review" ? "проверяется администрации" :
                       filterDisputeStatus === "resolved" ? "принятой споры" :
                       "отклоненные споры"}
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDisputeStatus("all")}
                      >
                        Все споры
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDisputeStatus("open")}
                      >
                        споры на рассмотрение трейдером
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDisputeStatus("in_review")}
                      >
                        проверяется администрации
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDisputeStatus("resolved")}
                      >
                        принятой споры
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDisputeStatus("rejected")}
                      >
                        отклоненные споры
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Статус сделки</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      {filterStatus === "all" ? "Все сделки" : 
                       filterStatus === "not_credited" ? "Не зачисленные сделки" :
                       filterStatus === "credited" ? "Зачисленные сделки" :
                       "Сделки выполняются"}
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="amount-exact"
                      checked={filterAmountType === "exact"}
                      onChange={() => setFilterAmountType("exact")}
                      className="h-4 w-4 text-[#006039]"
                    />
                    <Label htmlFor="amount-exact" className="text-sm font-normal">Точное значение</Label>
                  </div>
                  {filterAmountType === "exact" && (
                    <Input
                      type="number"
                      placeholder="Введите сумму"
                      value={filterAmount.exact}
                      onChange={(e) => setFilterAmount({ ...filterAmount, exact: e.target.value })}
                      className="ml-6"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="amount-range"
                      checked={filterAmountType === "range"}
                      onChange={() => setFilterAmountType("range")}
                      className="h-4 w-4 text-[#006039]"
                    />
                    <Label htmlFor="amount-range" className="text-sm font-normal">Диапазон</Label>
                  </div>
                  {filterAmountType === "range" && (
                    <div className="flex gap-2 ml-6">
                      <Input
                        type="number"
                        placeholder="От"
                        value={filterAmount.min}
                        onChange={(e) => setFilterAmount({ ...filterAmount, min: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="До"
                        value={filterAmount.max}
                        onChange={(e) => setFilterAmount({ ...filterAmount, max: e.target.value })}
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
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      {filterDevice === "all" ? "Все устройства" : 
                       transactions.find(t => t.deviceId === filterDevice) ? "Chrome на Windows" : "Все устройства"}
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
                        <Smartphone className="mr-2 h-4 w-4" />
                        Chrome на Windows
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDevice("2")}
                      >
                        <Smartphone className="mr-2 h-4 w-4" />
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
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      {filterRequisite === "all" ? "Все реквизиты" : 
                       filterRequisite === "1" ? "Основная карта" : "Резервная карта"}
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
                        <CreditCard className="mr-2 h-4 w-4" />
                        Основная карта (Сбербанк)
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterRequisite("2")}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
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
                    <Label htmlFor="date-from" className="text-xs text-gray-500">От</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="date-to" className="text-xs text-gray-500">До</Label>
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
                    setFilterStatus("all")
                    setFilterDisputeStatus("all")
                    setFilterAmount({ exact: "", min: "", max: "" })
                    setFilterAmountType("range")
                    setFilterDevice("all")
                    setFilterRequisite("all")
                    setFilterDateFrom("")
                    setFilterDateTo("")
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
              Споры не найдены
            </Card>
          ) : (
            <>
              {filteredTransactions.map((transaction) => {
                const getStatusIcon = () => {
                  switch (transaction.status) {
                    case "CREATED":
                    case "IN_PROGRESS":
                      return (
                        <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                      )
                    case "READY":
                      return (
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                      )
                    case "EXPIRED":
                    case "CANCELED":
                      return (
                        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                          <X className="h-6 w-6 text-red-600" />
                        </div>
                      )
                    default:
                      return null
                  }
                }

                const getPaymentStatus = () => {
                  switch (transaction.status) {
                    case "READY":
                      return "Платеж зачислен"
                    case "CREATED":
                    case "IN_PROGRESS":
                      return "Платеж ожидает зачисления"
                    default:
                      return "Платеж не зачислен"
                  }
                }

                const getStatusBadgeText = () => {
                  switch (transaction.status) {
                    case "READY":
                      return "Зачислен"
                    case "CREATED":
                    case "IN_PROGRESS":
                      return "Ожидает"
                    case "EXPIRED":
                      return "Истекло"
                    case "CANCELED":
                      return "Отменено"
                    default:
                      return "Не зачислен"
                  }
                }

                const getStatusBadgeColor = () => {
                  switch (transaction.status) {
                    case "READY":
                      return "bg-green-100 text-green-700 border-green-200"
                    case "CREATED":
                    case "IN_PROGRESS":
                      return "bg-yellow-100 text-yellow-700 border-yellow-200"
                    default:
                      return "bg-red-100 text-red-700 border-red-200"
                  }
                }

                // Calculate USDT amount (assuming 1 USDT = 95 RUB)
                const usdtAmount = (transaction.amount / 95).toFixed(2)

                return (
                  <Card 
                    key={transaction.id} 
                    className={cn(
                      "p-4 hover:shadow-md transition-all duration-300 cursor-pointer",
                      transaction.isNew && "flash-once"
                    )}
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {getStatusIcon()}
                      </div>

                      {/* Payment Status and Date */}
                      <div className="w-48 flex-shrink-0">
                        <div className="text-sm font-medium text-gray-900">{getPaymentStatus()}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Создан {format(new Date(transaction.createdAt), "HH:mm dd.MM.yyyy")}
                        </div>
                      </div>

                      {/* Bank and Requisites */}
                      <div className="w-56 flex-shrink-0">
                        <div className="flex items-start gap-3">
                          {bankLogos[transaction.assetOrBank] && (
                            <img 
                              src={bankLogos[transaction.assetOrBank]} 
                              alt={transaction.assetOrBank}
                              className="h-12 w-12 rounded object-contain flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.cardNumber || "4276 **** **** 1234"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{transaction.clientName}</div>
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="w-32 flex-shrink-0">
                        <div className="text-sm font-semibold text-gray-900">{usdtAmount} USDT</div>
                        <div className="text-xs text-gray-500 mt-1">{transaction.amount.toLocaleString('ru-RU')} ₽</div>
                      </div>

                      {/* Device */}
                      <div className="w-40 flex-shrink-0">
                        <div className="text-sm text-gray-700">
                          {transaction.deviceId === "1" ? "Chrome на Windows" : "Safari на iPhone"}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-1">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "px-4 py-2 text-sm font-medium border rounded-xl",
                            getStatusBadgeColor()
                          )}
                        >
                          {getStatusBadgeText()}
                        </Badge>
                      </div>

                      {/* Dispute Status Badge */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "px-3 py-1 text-xs font-medium border rounded-lg",
                            getDisputeStatusColor(transaction.disputeStatus)
                          )}
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {getDisputeStatusText(transaction.disputeStatus)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDispute({
                              id: transaction.id,
                              type: "deal",
                              status: transaction.disputeStatus === "open" ? "OPEN" : 
                                     transaction.disputeStatus === "in_review" ? "IN_PROGRESS" :
                                     transaction.disputeStatus === "resolved" ? "RESOLVED_SUCCESS" : "RESOLVED_FAIL",
                              amount: transaction.amount,
                              currency: transaction.currency,
                              transactionId: transaction.numericId,
                              reason: transaction.disputeReason,
                              createdAt: transaction.createdAt,
                              merchantName: transaction.merchantName
                            });
                            setShowDisputeDialog(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>

                    </div>
                  </Card>
                )
              })}
              
              {/* Count */}
              <div className="text-sm text-gray-600 mt-4">
                Найдено {filteredTransactions.length} споров
              </div>
            </>
          )}
      </div>
      
      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">
                {selectedTransaction?.numericId}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTransaction(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Детальная информация о спорной транзакции
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6 mt-6">
              {/* Dispute Info */}
              <Card className="p-6 border-red-200 bg-red-50">
                <h3 className="font-medium mb-4 flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  Информация о споре
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Статус спора</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "border font-medium",
                        getDisputeStatusColor(selectedTransaction.disputeStatus)
                      )}
                    >
                      {getDisputeStatusText(selectedTransaction.disputeStatus)}
                    </Badge>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-600">Причина спора</span>
                    <div className="text-sm font-medium text-right max-w-xs">
                      {selectedTransaction.disputeReason}
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Status and Timing */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Статус платежа</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "border font-medium",
                      statusConfig[selectedTransaction.status as keyof typeof statusConfig]?.color
                    )}
                  >
                    {statusConfig[selectedTransaction.status as keyof typeof statusConfig]?.label}
                  </Badge>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Истекает</span>
                  </div>
                  <div className="font-medium">
                    {format(new Date(selectedTransaction.expired_at), "HH:mm:ss dd.MM.yyyy", { locale: ru })}
                  </div>
                </Card>
              </div>
              
              {/* Main Info */}
              <Card className="p-6">
                <h3 className="font-medium mb-4">Основная информация</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Сумма</span>
                    <div className="font-medium text-lg">
                      {selectedTransaction.amount.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Клиент</span>
                    <div className="font-medium">{selectedTransaction.clientName}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Мерчант</span>
                    <div className="font-medium">{selectedTransaction.merchantName || "—"}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Создано</span>
                    <div className="font-medium">
                      {format(new Date(selectedTransaction.createdAt), "HH:mm:ss dd.MM.yyyy")}
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Requisite Info */}
              <Card className="p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Реквизит
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Банк</span>
                    <div className="flex items-center gap-2">
                      {bankLogos[selectedTransaction.assetOrBank] && (
                        <img 
                          src={bankLogos[selectedTransaction.assetOrBank]} 
                          alt={selectedTransaction.assetOrBank}
                          className="h-8 w-8 rounded object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <span className="font-medium">{selectedTransaction.assetOrBank}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Номер карты</span>
                    <div className="font-mono font-medium">
                      {selectedTransaction.cardNumber || "—"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">ID реквизита</span>
                    <div className="font-medium">
                      {selectedTransaction.requisiteId || "—"}
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Device Info */}
              <Card className="p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Устройство
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">ID устройства</span>
                    <div className="font-medium">
                      {selectedTransaction.deviceId || "—"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Статус</span>
                    <Badge className="bg-green-50 text-green-600 border-0">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Активно
                    </Badge>
                  </div>
                </div>
              </Card>
              
              {/* Actions */}
              <div className="flex gap-3">
                <Button className="flex-1 bg-[#006039] hover:bg-[#006039]/90">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Открыть спор в чате
                </Button>
                <Button variant="outline" className="flex-1">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Закрыть спор
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dispute Detail Dialog */}
      <DisputeDetailDialog
        open={showDisputeDialog}
        onOpenChange={setShowDisputeDialog}
        dispute={selectedDispute}
      />
    </div>
  )
}