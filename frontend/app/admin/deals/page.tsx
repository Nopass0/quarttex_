'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { adminApi as api } from '@/services/api'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount, formatDate, formatDateTime } from '@/lib/utils'
import { 
  CreditCard, 
  Search, 
  Loader2, 
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  MessageSquare,
  RefreshCw,
  Send,
  Copy
} from 'lucide-react'

interface CallbackHistory {
  id: string
  transactionId: string
  url: string
  payload: any
  response: string | null
  statusCode: number | null
  error: string | null
  createdAt: string
}

interface Transaction {
  id: string
  numericId: number
  amount: number
  status: string
  type: string
  assetOrBank: string
  orderId: string
  clientName: string
  rate?: number
  commission: number
  createdAt: string
  updatedAt: string
  acceptedAt?: string
  expiredAt: string
  expired_at?: string
  error?: string
  currency?: string
  userId: string
  userIp?: string
  callbackUri: string
  successUri: string
  failUri: string
  merchantId: string
  methodId: string
  isMock?: boolean
  merchant?: {
    id: string
    name: string
    token?: string
  }
  trader?: {
    id: string
    numericId: number
    email: string
    name?: string
    banned?: boolean
  }
  method?: {
    id: string
    name: string
    code: string
    type?: string
    currency?: string
  }
  requisites?: {
    id?: string
    cardNumber: string
    bankType: string
    recipientName: string
    phoneNumber?: string
  }
  dealDispute?: {
    id: string
    status: string
  }
}

interface TransactionAttempt {
  id: string
  transactionId: string | null
  transactionNumericId: number | null
  merchantId: string
  merchantName: string | null
  methodId: string
  methodName: string | null
  amount: number
  success: boolean
  status: string | null
  errorCode?: string | null
  message?: string | null
  createdAt: string
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  CREATED: { label: 'Создана', color: 'bg-blue-100 text-blue-800', icon: Clock },
  IN_PROGRESS: { label: 'В работе', color: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
  DISPUTE: { label: 'Спор', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  EXPIRED: { label: 'Истекла', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  READY: { label: 'Готова', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  MILK: { label: 'Слив', color: 'bg-purple-100 text-purple-800', icon: AlertCircle },
  CANCELED: { label: 'Отменена', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function AdminDealsPage() {
  const adminToken = useAdminAuth((state) => state.token)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [attempts, setAttempts] = useState<TransactionAttempt[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [callbackHistory, setCallbackHistory] = useState<CallbackHistory[]>([])
  const [loadingCallbacks, setLoadingCallbacks] = useState(false)

  useEffect(() => {
    if (activeTab === 'requests') {
      loadAttempts()
    } else {
      loadTransactions()
    }
  }, [statusFilter, typeFilter, currentPage, activeTab])

  const loadTransactions = async () => {
    setIsLoading(true)
    try {
      const params: any = {
        limit: 20,
        page: currentPage,
      }
      
      // Apply status filter based on active tab
      if (activeTab === 'disputes') {
        params.status = 'DISPUTE'
      } else if (activeTab === 'active') {
        params.status = 'IN_PROGRESS'
      } else if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      
      if (typeFilter !== 'all') {
        params.type = typeFilter
      }
      
      if (search) {
        params.search = search
      }

      const response = await api.getTransactionDeals(params)
      setTransactions(response.data || response.transactions || [])
      setTotalPages(response.meta?.totalPages || response.totalPages || 1)
    } catch (error: any) {
      toast.error('Ошибка загрузки сделок')
      console.error('Failed to load transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAttempts = async () => {
    setIsLoading(true)
    try {
      const params: any = {
        limit: 20,
        page: currentPage,
      }
      const response = await api.getTransactionAttempts(params)
      setAttempts(response.data || [])
      setTotalPages(response.pagination?.totalPages || 1)
    } catch (error: any) {
      toast.error('Ошибка загрузки запросов')
      console.error('Failed to load attempts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testApiConnection = async () => {
    try {
      const response = await fetch('/api/health')
      console.log('[Debug] API Health check:', response.status, await response.json())
    } catch (error) {
      console.error('[Debug] API Health check failed:', error)
    }
  }

  const loadCallbackHistory = async (transactionId: string) => {
    setLoadingCallbacks(true)
    try {
      const token = adminToken || ''
      console.log('[Debug] Loading callback history for transaction:', transactionId)
      console.log('[Debug] Using admin token:', token ? `${token.substring(0, 10)}...` : 'EMPTY')
      
      const response = await fetch(`/api/admin/transactions/${transactionId}/callbacks`, {
        headers: {
          'X-Admin-Key': token
        }
      })
      
      console.log('[Debug] Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[Debug] Callback history data:', data)
        setCallbackHistory(data.callbackHistory || [])
        toast.success(`Загружено ${data.callbackHistory?.length || 0} записей истории колбэков`)
      } else {
        const errorData = await response.text()
        console.error('[Debug] Error response:', errorData)
        toast.error(`Ошибка загрузки истории колбэков: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to load callback history:', error)
      toast.error('Ошибка загрузки истории колбэков: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    } finally {
      setLoadingCallbacks(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadTransactions()
  }

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status]
    const Icon = config?.icon || FileText
    return <Icon className="h-4 w-4" />
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <Badge className={`${config.color} gap-1`}>
        {getStatusIcon(status)}
        {config.label}
      </Badge>
    )
  }

  const handleUpdateStatus = async (transactionId: string, newStatus: string) => {
    try {
      await api.updateTransactionStatus(transactionId, newStatus)
      toast.success('Статус сделки обновлен')
      loadTransactions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка при обновлении статуса')
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
      // Используем прокси-эндпоинт для отправки callback через бэкенд
      const response = await fetch('/api/callback-proxy/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          data: {
            id: transaction.orderId,
            amount: transaction.amount,
            status: transaction.status
          },
          headers: {
            'X-Merchant-Token': transaction.merchant?.token || undefined
          },
          transactionId: transaction.id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Колбэк успешно отправлен')
      } else {
        toast.error(`Ошибка отправки колбэка: ${result.status} ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      toast.error('Не удалось отправить колбэк: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    }
  }

  const openTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    loadCallbackHistory(transaction.id)
  }

  const TransactionDetailsDialog = () => {
    if (!selectedTransaction) return null

    return (
      <Dialog open={!!selectedTransaction} onOpenChange={() => {
        setSelectedTransaction(null)
        setCallbackHistory([])
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали сделки #{selectedTransaction.numericId}</DialogTitle>
            <DialogDescription>Полная информация о транзакции</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Основная информация */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-600">ID транзакции</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedTransaction.id}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedTransaction.id, 'ID скопирован')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-gray-600">Order ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedTransaction.orderId}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedTransaction.orderId, 'Order ID скопирован')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-gray-600">Статус</Label>
                <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Мерчант</Label>
                <p className="font-medium">{selectedTransaction.merchant?.name || 'N/A'}</p>
                {selectedTransaction.merchantId && (
                  <p className="text-xs text-gray-500">ID: {selectedTransaction.merchantId}</p>
                )}
              </div>
              <div>
                <Label className="text-gray-600">Трейдер</Label>
                <p className="font-medium">
                  {selectedTransaction.trader ? 
                    `${selectedTransaction.trader.name || selectedTransaction.trader.email}` : 
                    'Не назначен'}
                </p>
                {selectedTransaction.trader && (
                  <p className="text-xs text-gray-500">ID: {selectedTransaction.trader.id}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-600">Клиент</Label>
                <p className="font-medium">{selectedTransaction.clientName}</p>
              </div>
              <div>
                <Label className="text-gray-600">IP адрес</Label>
                <div className="mt-1">
                  <button
                    onClick={() => copyToClipboard(selectedTransaction.userIp || '', 'IP адрес скопирован')}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {selectedTransaction.userIp || 'Не указан'}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-gray-600">Тип операции</Label>
                <div className="mt-1">
                  <Badge variant={selectedTransaction.type === 'IN' ? 'default' : 'secondary'}>
                    {selectedTransaction.type === 'IN' ? 'Входящая' : 'Исходящая'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-600">Сумма</Label>
                <p className="text-lg font-medium">{formatAmount(selectedTransaction.amount)} {selectedTransaction.currency || 'RUB'}</p>
              </div>
              <div>
                <Label className="text-gray-600">Курс</Label>
                <p className="font-medium">{selectedTransaction.rate || 'Не установлен'}</p>
              </div>
              <div>
                <Label className="text-gray-600">Комиссия</Label>
                <p className="font-medium">{selectedTransaction.commission}%</p>
              </div>
            </div>

            <div>
              <Label className="text-gray-600">Метод оплаты</Label>
              <p className="font-medium">
                {selectedTransaction.method?.name || 'N/A'} ({selectedTransaction.method?.code || 'N/A'})
              </p>
              {selectedTransaction.methodId && (
                <p className="text-xs text-gray-500">ID: {selectedTransaction.methodId}</p>
              )}
            </div>

            {selectedTransaction.requisites && (
              <div className="bg-gray-50 p-3 rounded-md">
                <Label className="text-gray-600">Реквизиты</Label>
                <div className="mt-2">
                  <p className="font-medium">{selectedTransaction.requisites.cardNumber}</p>
                  <p className="text-sm text-gray-600">
                    {selectedTransaction.requisites.bankType} • {selectedTransaction.requisites.recipientName}
                  </p>
                  {selectedTransaction.requisites.phoneNumber && (
                    <p className="text-sm text-gray-600">Телефон: {selectedTransaction.requisites.phoneNumber}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-600">Создано</Label>
                <p className="font-medium">{formatDate(selectedTransaction.createdAt)}</p>
              </div>
              <div>
                <Label className="text-gray-600">Обновлено</Label>
                <p className="font-medium">{formatDate(selectedTransaction.updatedAt)}</p>
              </div>
              <div>
                <Label className="text-gray-600">Истекает</Label>
                <p className="font-medium">{formatDate(selectedTransaction.expired_at || selectedTransaction.expiredAt)}</p>
              </div>
            </div>

            {/* Callback URLs */}
            <div className="space-y-3">
              <Label className="text-gray-600">Callback URLs</Label>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium">Callback URI</div>
                      <div className="text-xs text-gray-600 break-all mt-1">{selectedTransaction.callbackUri || 'Не указан'}</div>
                    </div>
                    {selectedTransaction.callbackUri && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendCallback(selectedTransaction.callbackUri, selectedTransaction)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Отправить
                      </Button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium">Success URI</div>
                      <div className="text-xs text-gray-600 break-all mt-1">{selectedTransaction.successUri || 'Не указан'}</div>
                    </div>
                    {selectedTransaction.successUri && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendCallback(selectedTransaction.successUri, selectedTransaction)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Отправить
                      </Button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium">Fail URI</div>
                      <div className="text-xs text-gray-600 break-all mt-1">{selectedTransaction.failUri || 'Не указан'}</div>
                    </div>
                    {selectedTransaction.failUri && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendCallback(selectedTransaction.failUri, selectedTransaction)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Отправить
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* История колбэков */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-600">История колбэков</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testApiConnection}
                  >
                    Test API
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadCallbackHistory(selectedTransaction.id)}
                    disabled={loadingCallbacks}
                  >
                    {loadingCallbacks ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Обновить
                  </Button>
                </div>
              </div>
              
              {loadingCallbacks ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : callbackHistory.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {callbackHistory.map((callback) => (
                    <div key={callback.id} className="bg-gray-50 p-3 rounded-md border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {formatDate(callback.createdAt)}
                          </div>
                          <div className="text-xs text-gray-600 break-all">{callback.url}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {callback.statusCode ? (
                            <Badge className={
                              callback.statusCode >= 200 && callback.statusCode < 300
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }>
                              {callback.statusCode}
                            </Badge>
                          ) : null}
                          {callback.error && (
                            <Badge className="bg-red-100 text-red-800">
                              Ошибка
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">Отправлено:</div>
                          <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                            {JSON.stringify(callback.payload, null, 2)}
                          </pre>
                        </div>
                        
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">Ответ:</div>
                          <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                            {callback.response || (callback.error ? callback.error : 'Нет ответа')}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  История колбэков пуста
                </div>
              )}
            </div>

            {/* Дополнительная информация */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Дополнительная информация</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>User ID: {selectedTransaction.userId}</div>
                <div>Тестовая: {selectedTransaction.isMock ? 'Да' : 'Нет'}</div>
                <div>Актив/Банк: {selectedTransaction.assetOrBank}</div>
                <div>Валюта: {selectedTransaction.currency || 'RUB'}</div>
              </div>
            </div>

            {selectedTransaction.acceptedAt && (
              <div>
                <Label className="text-gray-600">Принята в работу</Label>
                <p className="font-medium">{formatDate(selectedTransaction.acceptedAt)}</p>
              </div>
            )}

            {selectedTransaction.error && (
              <div className="bg-red-50 p-3 rounded-md">
                <Label className="text-gray-600">Ошибка</Label>
                <p className="text-red-600 mt-1">{selectedTransaction.error}</p>
              </div>
            )}

            {selectedTransaction.dealDispute && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <Label className="text-gray-600">Информация о споре</Label>
                <div className="mt-2">
                  <Badge className="bg-orange-100 text-orange-800">
                    Статус спора: {selectedTransaction.dealDispute.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2"
                    onClick={() => window.location.href = `/admin/disputes/deal/${selectedTransaction.dealDispute?.id}`}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Перейти к спору
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              {selectedTransaction.status === 'IN_PROGRESS' && (
                <>
                  <Button
                    variant="outline"
                    className="text-green-600 hover:text-green-700"
                    onClick={() => handleUpdateStatus(selectedTransaction.id, 'READY')}
                  >
                    Завершить сделку
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleUpdateStatus(selectedTransaction.id, 'CANCELED')}
                  >
                    Отменить сделку
                  </Button>
                </>
              )}
              {selectedTransaction.status === 'CREATED' && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleUpdateStatus(selectedTransaction.id, 'EXPIRED')}
                >
                  Пометить как истекшую
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const TransactionsTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Мерчант</TableHead>
            <TableHead>Трейдер</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Метод</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Создана</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-mono">
                #{transaction.numericId}
              </TableCell>
              <TableCell>
                {transaction.merchant?.name || 'N/A'}
              </TableCell>
              <TableCell>
                {transaction.trader ? (
                  <span className="font-mono">
                    #{transaction.trader.numericId}
                  </span>
                ) : (
                  <span className="text-gray-500">Не назначен</span>
                )}
              </TableCell>
              <TableCell>
                {formatAmount(transaction.amount)} ₽
              </TableCell>
              <TableCell>
                {transaction.method?.name || 'N/A'}
              </TableCell>
              <TableCell>
                {getStatusBadge(transaction.status)}
              </TableCell>
              <TableCell>
                <Badge variant={transaction.type === 'IN' ? 'default' : 'secondary'}>
                  {transaction.type}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(transaction.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openTransactionDetails(transaction)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {transaction.dealDispute && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-orange-600 hover:text-orange-700"
                      onClick={() => window.location.href = `/admin/disputes/deal/${transaction.dealDispute.id}`}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    )

    const AttemptsTable = () => (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Мерчант</TableHead>
              <TableHead>Метод</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Ошибка</TableHead>
              <TableHead>Сделка</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.map(a => (
              <TableRow key={a.id}>
                <TableCell>{formatDateTime(a.createdAt)}</TableCell>
                <TableCell>{a.merchantName || a.merchantId}</TableCell>
                <TableCell>{a.methodName || a.methodId}</TableCell>
                <TableCell>{formatAmount(a.amount)} ₽</TableCell>
                <TableCell>{a.success ? 'Успех' : 'Ошибка'}</TableCell>
                <TableCell>{a.errorCode || '-'}</TableCell>
                <TableCell>{a.transactionNumericId ? `#${a.transactionNumericId}` : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )

    return (
      <ProtectedRoute variant="admin">
        <AuthLayout variant="admin">
        <div className="space-y-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CreditCard className="h-8 w-8" />
              Управление сделками
            </h1>
            <p className="text-gray-600 mt-2">
              Просмотр и управление всеми транзакциями в системе
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Фильтры</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Поиск по ID, сумме или имени клиента"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                {activeTab === 'all' && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="CREATED">Создана</SelectItem>
                        <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                        <SelectItem value="DISPUTE">Спор</SelectItem>
                        <SelectItem value="READY">Готова</SelectItem>
                        <SelectItem value="EXPIRED">Истекла</SelectItem>
                        <SelectItem value="CANCELED">Отменена</SelectItem>
                        <SelectItem value="MILK">Слив</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Тип" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="IN">Входящие (IN)</SelectItem>
                        <SelectItem value="OUT">Исходящие (OUT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full sm:w-auto">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList>
              <TabsTrigger value="all">Все сделки</TabsTrigger>
              <TabsTrigger value="active">
                Активные
                {transactions.filter(t => t.status === 'IN_PROGRESS').length > 0 && (
                  <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                    {transactions.filter(t => t.status === 'IN_PROGRESS').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="disputes">
                Споры
                {transactions.filter(t => t.status === 'DISPUTE').length > 0 && (
                  <Badge className="ml-2 bg-orange-100 text-orange-800">
                    {transactions.filter(t => t.status === 'DISPUTE').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests">Запросы</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>Все сделки</CardTitle>
                  <CardDescription>
                    Всего найдено: {transactions.length} сделок
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <TransactionsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active">
              <Card>
                <CardHeader>
                  <CardTitle>Активные сделки</CardTitle>
                  <CardDescription>
                    Сделки, находящиеся в работе
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <TransactionsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

              <TabsContent value="disputes">
                <Card>
                  <CardHeader>
                    <CardTitle>Спорные сделки</CardTitle>
                    <CardDescription>
                      Сделки с открытыми спорами
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <TransactionsTable />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="requests">
                <Card>
                  <CardHeader>
                    <CardTitle>Запросы на сделки</CardTitle>
                    <CardDescription>
                      Всего найдено: {attempts.length} запросов
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <AttemptsTable />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Назад
              </Button>
              <span className="flex items-center px-4">
                Страница {currentPage} из {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Вперед
              </Button>
            </div>
          )}
        </div>

        <TransactionDetailsDialog />
      </AuthLayout>
    </ProtectedRoute>
  )
}
