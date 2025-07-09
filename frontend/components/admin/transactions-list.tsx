'use client'

import React, { useState, useEffect } from 'react'
import './transactions-list.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  Search, 
  Edit, 
  RefreshCw, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Ban, 
  Hourglass, 
  Copy, 
  Phone, 
  CreditCard, 
  Calendar, 
  ArrowUpDown,
  ChevronDown,
  X,
  CircleX,
  CalendarIcon,
  Send
} from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'

type TransactionType = 'IN' | 'OUT'
type Status = 'CREATED' | 'IN_PROGRESS' | 'READY' | 'CANCELED' | 'EXPIRED' | 'DISPUTE' | 'MILK'
type SortField = 'createdAt' | 'amount' | 'status' | 'orderId'
type SortOrder = 'asc' | 'desc'

type Transaction = {
  id: string
  merchantId: string
  amount: number
  assetOrBank: string
  orderId: string
  methodId: string
  currency?: string
  userId: string
  userIp?: string
  callbackUri: string
  successUri: string
  failUri: string
  type: TransactionType
  expired_at: string
  commission: number
  clientName: string
  status: Status
  rate?: number
  isMock: boolean
  createdAt: string
  updatedAt: string
  isNew?: boolean
  merchant: {
    id: string
    name: string
    token: string
    createdAt: string
  }
  method: {
    id: string
    code: string
    name: string
    type: string
    currency: string
  }
  trader?: {
    id: string
    email: string
    name?: string
    banned: boolean
    createdAt: string
  }
  requisites?: {
    id: string
    bankType: string
    cardNumber: string
    phoneNumber?: string
    recipientName: string
  }
}

type Meta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

const statusIcons: Record<Status, any> = {
  CREATED: Clock,
  IN_PROGRESS: Hourglass,
  READY: CheckCircle,
  CANCELED: XCircle,
  EXPIRED: Ban,
  DISPUTE: AlertCircle,
  MILK: CircleX,
}

const statusColors: Record<Status, string> = {
  CREATED: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  READY: 'bg-green-100 text-green-700',
  CANCELED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  DISPUTE: 'bg-purple-100 text-purple-700',
  MILK: 'bg-pink-100 text-pink-700',
}

const statusLabels: Record<Status, string> = {
  CREATED: 'Создана',
  IN_PROGRESS: 'В процессе',
  READY: 'Готова',
  CANCELED: 'Отменена',
  EXPIRED: 'Истекла',
  DISPUTE: 'Спор',
  MILK: 'Ошибка',
}

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`
  }
  return phone
}

const formatCardNumber = (cardNumber: string) => {
  return cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')
}

const getBankName = (cardNumber: string) => {
  const firstDigits = cardNumber.substring(0, 6)
  const bankMap: Record<string, string> = {
    '427683': 'Сбербанк',
    '427901': 'Сбербанк',
    '427644': 'Сбербанк',
    '554386': 'Тинькофф',
    '521324': 'Тинькофф',
    '437773': 'Тинькофф',
    '220220': 'Альфа-Банк',
    '415428': 'Альфа-Банк',
    '548673': 'Альфа-Банк',
  }
  
  for (const [prefix, bank] of Object.entries(bankMap)) {
    if (firstDigits.startsWith(prefix)) return bank
  }
  
  return 'Банк'
}

export function TransactionsList() {
  const [activeTab, setActiveTab] = useState<'all' | 'deals' | 'payouts'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 0 })
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null)
  const { token: adminToken } = useAdminAuth()
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    merchantId: '',
    methodId: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
  })
  
  const [formData, setFormData] = useState({
    status: '' as Status,
    amount: 0,
    clientName: '',
    traderId: '',
  })

  useEffect(() => {
    fetchTransactions()
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchTransactions()
    }, 3000) // Update every 3 seconds
    
    return () => clearInterval(interval)
  }, [activeTab, meta.page, filters, sortField, sortOrder])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: meta.page.toString(),
        limit: meta.limit.toString(),
        sortBy: sortField,
        sortOrder: sortOrder,
        ...(activeTab === 'deals' && { type: 'IN' }),
        ...(activeTab === 'payouts' && { type: 'OUT' }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.merchantId && { merchantId: filters.merchantId }),
        ...(filters.methodId && { methodId: filters.methodId }),
        ...(filters.dateFrom && { createdFrom: filters.dateFrom.toISOString() }),
        ...(filters.dateTo && { createdTo: filters.dateTo.toISOString() }),
        ...(searchQuery && { search: searchQuery }),
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/transactions/list?${params}`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch transactions')
      const data = await response.json()
      
      // Mark new transactions
      setTransactions(currentTransactions => {
        const existingIds = new Set(currentTransactions.map(t => t.id))
        const newTransactions: Transaction[] = []
        
        const updatedData = data.data.map((tx: Transaction) => {
          if (!existingIds.has(tx.id) && !isLoading) {
            // New transaction - mark it and add to list
            newTransactions.push(tx)
            return { ...tx, isNew: true }
          }
          return { ...tx, isNew: false }
        })
        
        // Show toast for new transactions
        if (newTransactions.length > 0 && !isLoading) {
          newTransactions.forEach(tx => {
            toast.success(`Новая транзакция #${tx.orderId}`, {
              description: `${tx.amount.toLocaleString('ru-RU')} ₽ от ${tx.clientName}`
            })
          })
          
          // Remove "new" flag after animation
          setTimeout(() => {
            setTransactions(prev => prev.map(tx => ({ ...tx, isNew: false })))
          }, 500)
        }
        
        return updatedData
      })
      
      setMeta(data.meta)
    } catch (error) {
      toast.error('Не удалось загрузить список транзакций')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  const sendCallback = async (url: string, transaction: Transaction) => {
    if (!url || url === '') {
      toast.error('URL для колбэка не указан')
      return
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          orderId: transaction.orderId,
          status: transaction.status,
          amount: transaction.amount,
          currency: transaction.currency || 'RUB',
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        toast.success('Колбэк успешно отправлен')
      } else {
        toast.error(`Ошибка отправки колбэка: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      toast.error('Не удалось отправить колбэк: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    }
  }

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/transactions/${selectedTransaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          status: formData.status,
          amount: formData.amount,
          clientName: formData.clientName,
          traderId: formData.traderId || null,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update transaction')
      
      setIsEditDialogOpen(false)
      setSelectedTransaction(null)
      await fetchTransactions()
      toast.success('Транзакция обновлена')
    } catch (error) {
      toast.error('Не удалось обновить транзакцию')
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setFormData({
      status: transaction.status,
      amount: transaction.amount,
      clientName: transaction.clientName,
      traderId: transaction.trader?.id || '',
    })
    setIsEditDialogOpen(true)
  }

  const renderRequisites = (requisites: Transaction['requisites']) => {
    if (!requisites) return <span className="text-gray-400">-</span>

    if (requisites.phoneNumber) {
      return (
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 text-[#006039]" />
          <button
            onClick={() => copyToClipboard(requisites.phoneNumber!, 'Номер телефона скопирован')}
            className="text-sm hover:text-[#006039] transition-colors"
          >
            {formatPhoneNumber(requisites.phoneNumber)}
          </button>
        </div>
      )
    }

    if (requisites.cardNumber) {
      const bankName = getBankName(requisites.cardNumber)
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 rounded px-2 py-1 flex items-center gap-2">
              <CreditCard className="h-3 w-3 text-[#006039]" />
              <div>
                <button
                  onClick={() => copyToClipboard(requisites.cardNumber, 'Номер карты скопирован')}
                  className="text-xs font-mono hover:text-[#006039] transition-colors"
                >
                  {formatCardNumber(requisites.cardNumber)}
                </button>
                <div className="text-[10px] text-gray-500">{bankName}</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500">{requisites.recipientName}</div>
        </div>
      )
    }

    return <span className="text-gray-400">-</span>
  }

  const renderTransactionRow = (transaction: Transaction) => {
    const StatusIcon = statusIcons[transaction.status]
    const isDetailsOpen = detailsOpen === transaction.id

    return (
      <React.Fragment key={transaction.id}>
        <TableRow
          className={cn(
            "cursor-pointer hover:bg-gray-50 transition-all duration-300",
            transaction.isNew && "flash-once"
          )}
          onClick={() => setDetailsOpen(isDetailsOpen ? null : transaction.id)}
        >
          <TableCell className="w-12">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", statusColors[transaction.status])}>
              <StatusIcon className="h-4 w-4" />
            </div>
          </TableCell>
          <TableCell>
            <button
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(transaction.orderId, 'Order ID скопирован')
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {transaction.orderId.slice(0, 8)}...
            </button>
          </TableCell>
          <TableCell>
            <div>
              <div className="font-medium">{transaction.merchant.name}</div>
              <div className="text-xs text-gray-500">{transaction.merchant.id.slice(0, 8)}...</div>
            </div>
          </TableCell>
          <TableCell>
            <div>
              <div>{transaction.clientName}</div>
              <div className="text-xs text-gray-500">{transaction.userIp || 'Нет IP'}</div>
            </div>
          </TableCell>
          <TableCell>
            <div>
              <div className="font-medium">{formatAmount(transaction.amount)} {transaction.assetOrBank}</div>
              <div className="text-xs text-gray-500">{transaction.method.name}</div>
            </div>
          </TableCell>
          <TableCell>
            {transaction.trader ? (
              <div>
                <div className="text-sm">{transaction.trader.name || transaction.trader.email}</div>
                <div className="text-xs text-gray-500">{transaction.trader.email}</div>
              </div>
            ) : (
              <span className="text-gray-400">Не назначен</span>
            )}
          </TableCell>
          <TableCell>{renderRequisites(transaction.requisites)}</TableCell>
          <TableCell>
            <div className="text-xs">
              <div>{formatDateTime(transaction.createdAt)}</div>
              <div className="text-gray-500">обн. {formatDateTime(transaction.updatedAt)}</div>
            </div>
          </TableCell>
          <TableCell>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                openEditDialog(transaction)
              }}
              disabled={isLoading}
            >
              <Edit className="h-4 w-4 text-[#006039]" />
            </Button>
          </TableCell>
        </TableRow>
        {isDetailsOpen && (
          <TableRow>
            <TableCell colSpan={9} className="bg-gray-50 p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">ID транзакции:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-gray-200 px-2 py-1 rounded">{transaction.id}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transaction.id, 'ID скопирован')}
                      >
                        <Copy className="h-3 w-3 text-[#006039]" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Order ID:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-gray-200 px-2 py-1 rounded">{transaction.orderId}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transaction.orderId, 'Order ID скопирован')}
                      >
                        <Copy className="h-3 w-3 text-[#006039]" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Тип операции:</span>
                    <div className="mt-1">{transaction.type === 'IN' ? 'Входящая' : 'Исходящая'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Курс:</span>
                    <div className="mt-1">{transaction.rate || 'Не установлен'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Комиссия:</span>
                    <div className="mt-1">{transaction.commission}%</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Истекает:</span>
                    <div className="mt-1">{formatDateTime(transaction.expired_at)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Callback URI:</span>
                    <div className="mt-1">
                      <div className="text-xs break-all">{transaction.callbackUri || 'Не указан'}</div>
                      {transaction.callbackUri && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => sendCallback(transaction.callbackUri, transaction)}
                        >
                          <Send className="h-3 w-3 mr-1 text-[#006039]" />
                          Отправить
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Success URI:</span>
                    <div className="mt-1">
                      <div className="text-xs break-all">{transaction.successUri || 'Не указан'}</div>
                      {transaction.successUri && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => sendCallback(transaction.successUri, transaction)}
                        >
                          <Send className="h-3 w-3 mr-1 text-[#006039]" />
                          Отправить
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Fail URI:</span>
                    <div className="mt-1">
                      <div className="text-xs break-all">{transaction.failUri || 'Не указан'}</div>
                      {transaction.failUri && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => sendCallback(transaction.failUri, transaction)}
                        >
                          <Send className="h-3 w-3 mr-1 text-[#006039]" />
                          Отправить
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#006039]" />
            <Input
              placeholder="Поиск по ID, OrderID, клиенту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2 text-[#006039]" />
            Фильтры
            {Object.values(filters).some(v => v && v !== 'all') && (
              <span className="ml-2 bg-[#006039] text-white rounded-full px-2 py-0.5 text-xs">
                {Object.values(filters).filter(v => v && v !== 'all').length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchTransactions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 text-[#006039] ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Статус</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="CREATED">Создана</SelectItem>
                  <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                  <SelectItem value="READY">Готова</SelectItem>
                  <SelectItem value="CANCELED">Отменена</SelectItem>
                  <SelectItem value="EXPIRED">Истекла</SelectItem>
                  <SelectItem value="DISPUTE">Спор</SelectItem>
                  <SelectItem value="MILK">Ошибка</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Дата от</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#006039]" />
                    {filters.dateFrom ? format(filters.dateFrom, "PPP", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateFrom || undefined}
                    onSelect={(date) => setFilters({ ...filters, dateFrom: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label>Дата до</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#006039]" />
                    {filters.dateTo ? format(filters.dateTo, "PPP", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateTo || undefined}
                    onSelect={(date) => setFilters({ ...filters, dateTo: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({
                  status: 'all',
                  merchantId: '',
                  methodId: '',
                  dateFrom: null,
                  dateTo: null,
                })}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2 text-[#006039]" />
                Сбросить
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="deals">Сделки (IN)</TabsTrigger>
          <TabsTrigger value="payouts">Выплаты (OUT)</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          {isLoading && transactions.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-[#006039]" />
            </div>
          ) : (
            <>
              <Table>
                <TableCaption>
                  Показано {transactions.length} из {meta.total} транзакций
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Статус</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-gray-900"
                        onClick={() => handleSort('orderId')}
                      >
                        Order ID
                        <ArrowUpDown className="h-3 w-3 text-[#006039]" />
                      </button>
                    </TableHead>
                    <TableHead>Мерчант</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-gray-900"
                        onClick={() => handleSort('amount')}
                      >
                        Сумма
                        <ArrowUpDown className="h-3 w-3 text-[#006039]" />
                      </button>
                    </TableHead>
                    <TableHead>Трейдер</TableHead>
                    <TableHead>Реквизиты</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-gray-900"
                        onClick={() => handleSort('createdAt')}
                      >
                        Дата
                        <ArrowUpDown className="h-3 w-3 text-[#006039]" />
                      </button>
                    </TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(renderTransactionRow)}
                </TableBody>
              </Table>

              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Страница {meta.page} из {meta.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMeta({ ...meta, page: meta.page - 1 })}
                      disabled={meta.page === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4 text-[#006039]" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMeta({ ...meta, page: meta.page + 1 })}
                      disabled={meta.page === meta.totalPages || isLoading}
                    >
                      <ChevronRight className="h-4 w-4 text-[#006039]" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать транзакцию</DialogTitle>
            <DialogDescription>
              Измените данные транзакции
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID транзакции</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{selectedTransaction.id}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedTransaction.id, 'ID скопирован')}
                    >
                      <Copy className="h-3 w-3 text-[#006039]" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Order ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{selectedTransaction.orderId}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedTransaction.orderId, 'Order ID скопирован')}
                    >
                      <Copy className="h-3 w-3 text-[#006039]" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Статус
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Status })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREATED">Создана</SelectItem>
                    <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                    <SelectItem value="READY">Готова</SelectItem>
                    <SelectItem value="CANCELED">Отменена</SelectItem>
                    <SelectItem value="EXPIRED">Истекла</SelectItem>
                    <SelectItem value="DISPUTE">Спор</SelectItem>
                    <SelectItem value="MILK">Ошибка</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Сумма
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="clientName" className="text-right">
                  Имя клиента
                </Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="traderId" className="text-right">
                  ID трейдера
                </Label>
                <Input
                  id="traderId"
                  value={formData.traderId}
                  onChange={(e) => setFormData({ ...formData, traderId: e.target.value })}
                  className="col-span-3"
                  placeholder="Оставьте пустым для отмены назначения"
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Дополнительная информация</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Мерчант: {selectedTransaction.merchant.name}</div>
                  <div>Метод: {selectedTransaction.method.name}</div>
                  <div>Валюта: {selectedTransaction.currency || selectedTransaction.assetOrBank}</div>
                  <div>Курс: {selectedTransaction.rate || 'Не установлен'}</div>
                  <div>Комиссия: {selectedTransaction.commission}%</div>
                  <div>IP: {selectedTransaction.userIp || 'Нет'}</div>
                  <div>Тип: {selectedTransaction.type === 'IN' ? 'Входящая' : 'Исходящая'}</div>
                  <div>Истекает: {formatDateTime(selectedTransaction.expired_at)}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={handleUpdateTransaction}
              className="bg-[#006039] hover:bg-[#005030]"
              disabled={isLoading}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}