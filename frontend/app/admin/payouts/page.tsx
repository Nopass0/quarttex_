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
import { toast } from 'sonner'
import { adminApi as api } from '@/services/api'
import { formatAmount, formatDate } from '@/lib/utils'
import { 
  DollarSign, 
  Search, 
  Loader2, 
  Download,
  Eye,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText
} from 'lucide-react'

interface Payout {
  id: string
  numericId: number
  amount: number
  amountUsdt: number
  total: number
  totalUsdt: number
  rate: number
  rateDelta: number
  feePercent: number
  wallet: string
  bank: string
  isCard: boolean
  status: string
  direction: string
  expireAt: string
  createdAt: string
  acceptedAt?: string
  confirmedAt?: string
  cancelledAt?: string
  traderId?: string
  merchantId: string
  externalReference?: string
  cancelReason?: string
  disputeMessage?: string
  merchant?: {
    name: string
  }
  trader?: {
    numericId: number
    email: string
  }
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  CREATED: { label: 'Создан', color: 'bg-blue-100 text-blue-800', icon: Clock },
  ACTIVE: { label: 'Активен', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  CHECKING: { label: 'Проверка', color: 'bg-purple-100 text-purple-800', icon: Eye },
  COMPLETED: { label: 'Завершен', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: 'Отменен', color: 'bg-red-100 text-red-800', icon: XCircle },
  EXPIRED: { label: 'Истек', color: 'bg-gray-100 text-gray-800', icon: Clock },
  DISPUTED: { label: 'Спор', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [directionFilter, setDirectionFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)

  useEffect(() => {
    loadPayouts()
  }, [statusFilter, directionFilter, currentPage])

  const loadPayouts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: ((currentPage - 1) * 20).toString(),
      })
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      if (directionFilter !== 'all') {
        params.append('direction', directionFilter)
      }
      
      if (search) {
        params.append('search', search)
      }

      const response = await api.get(`/admin/payouts?${params}`)
      setPayouts(response.data.payouts)
      setTotalPages(Math.ceil(response.data.total / 20))
    } catch (error: any) {
      toast.error('Ошибка загрузки выплат')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadPayouts()
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

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <DollarSign className="h-8 w-8" />
          Управление выплатами
        </h1>
        <p className="text-gray-600 mt-2">
          Просмотр и управление всеми выплатами в системе
        </p>
      </div>

      <div className="mb-6 flex gap-4">
        <Button 
          onClick={() => window.location.href = '/admin/payout-settings'}
          variant="outline"
        >
          <Settings className="h-4 w-4 mr-2" />
          Настройки лимитов
        </Button>
        <Button 
          onClick={() => window.location.href = '/admin/rate-settings'}
          variant="outline"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Настройки ставок
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по ID, кошельку или сумме"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="CREATED">Создан</SelectItem>
                <SelectItem value="ACTIVE">Активен</SelectItem>
                <SelectItem value="CHECKING">Проверка</SelectItem>
                <SelectItem value="COMPLETED">Завершен</SelectItem>
                <SelectItem value="CANCELLED">Отменен</SelectItem>
                <SelectItem value="EXPIRED">Истек</SelectItem>
                <SelectItem value="DISPUTED">Спор</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Направление" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все направления</SelectItem>
                <SelectItem value="IN">Входящие (IN)</SelectItem>
                <SelectItem value="OUT">Исходящие (OUT)</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Выплаты</CardTitle>
          <CardDescription>
            Всего найдено: {payouts.length} выплат
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Мерчант</TableHead>
                    <TableHead>Трейдер</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Кошелек</TableHead>
                    <TableHead>Банк</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Направление</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-mono">
                        #{payout.numericId}
                      </TableCell>
                      <TableCell>
                        {payout.merchant?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {payout.trader ? (
                          <span className="font-mono">
                            #{payout.trader.numericId}
                          </span>
                        ) : (
                          <span className="text-gray-500">Не назначен</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{formatAmount(payout.amount)} ₽</div>
                          <div className="text-xs text-gray-500">
                            {payout.amountUsdt.toFixed(2)} USDT
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payout.wallet}
                      </TableCell>
                      <TableCell>
                        {payout.bank} {payout.isCard ? '(Карта)' : ''}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payout.status)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payout.direction === 'IN' ? 'default' : 'secondary'}>
                          {payout.direction}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(payout.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedPayout(payout)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
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
        </CardContent>
      </Card>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}