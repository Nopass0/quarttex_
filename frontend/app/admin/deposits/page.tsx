'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
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
import { toast } from 'sonner'
import { adminApi } from '@/services/api'
import { formatDate, formatAmount } from '@/lib/utils'
import { 
  RefreshCw, 
  Search, 
  Loader2, 
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Wallet,
  Settings
} from 'lucide-react'

interface DepositRequest {
  id: string
  traderId: string
  trader: {
    name: string
    email: string
  }
  amountUSDT: number
  address: string
  status: string
  txHash: string | null
  confirmations: number
  createdAt: string
  confirmedAt: string | null
  processedAt: string | null
}

interface DepositSettings {
  deposit_wallet_address: string
  min_deposit_amount: string
  deposit_confirmations_required: string
  deposit_expiry_minutes: string
}

const statusIcons = {
  PENDING: Clock,
  CHECKING: AlertCircle,
  CONFIRMED: CheckCircle,
  FAILED: XCircle,
  EXPIRED: XCircle,
}

const statusColors = {
  PENDING: 'default',
  CHECKING: 'warning',
  CONFIRMED: 'success',
  FAILED: 'destructive',
  EXPIRED: 'secondary',
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<DepositRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [settings, setSettings] = useState<DepositSettings | null>(null)
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)

  useEffect(() => {
    fetchDeposits()
    fetchSettings()
  }, [])

  const fetchDeposits = async () => {
    try {
      setIsLoading(true)
      const response = await adminApi.getDepositRequests({
        status: selectedStatus !== 'all' ? selectedStatus : undefined
      })
      setDeposits(response.data || [])
    } catch (error) {
      toast.error('Не удалось загрузить список депозитов')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await adminApi.getSystemConfig()
      const configSettings: DepositSettings = {
        deposit_wallet_address: '',
        min_deposit_amount: '10',
        deposit_confirmations_required: '3',
        deposit_expiry_minutes: '60'
      }
      
      response.forEach((config: { key: string; value: string }) => {
        if (config.key in configSettings) {
          (configSettings as any)[config.key] = config.value
        }
      })
      
      setSettings(configSettings)
    } catch (error) {
      toast.error('Не удалось загрузить настройки')
    }
  }

  const updateSettings = async () => {
    if (!settings) return

    try {
      setIsUpdatingSettings(true)
      
      await Promise.all([
        adminApi.updateSystemConfig('deposit_wallet_address', settings.deposit_wallet_address),
        adminApi.updateSystemConfig('min_deposit_amount', settings.min_deposit_amount),
        adminApi.updateSystemConfig('deposit_confirmations_required', settings.deposit_confirmations_required),
        adminApi.updateSystemConfig('deposit_expiry_minutes', settings.deposit_expiry_minutes),
      ])

      toast.success('Настройки обновлены')
      setShowSettingsDialog(false)
    } catch (error) {
      toast.error('Не удалось обновить настройки')
    } finally {
      setIsUpdatingSettings(false)
    }
  }

  const confirmDeposit = async (depositId: string, txHash: string) => {
    try {
      await adminApi.confirmDeposit(depositId, txHash)
      toast.success('Депозит подтвержден')
      fetchDeposits()
    } catch (error) {
      toast.error('Не удалось подтвердить депозит')
    }
  }

  const rejectDeposit = async (depositId: string, reason: string) => {
    try {
      await adminApi.rejectDeposit(depositId, reason)
      toast.success('Депозит отклонен')
      fetchDeposits()
    } catch (error) {
      toast.error('Не удалось отклонить депозит')
    }
  }

  const filteredDeposits = deposits.filter(deposit => {
    const matchesSearch = 
      deposit.trader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deposit.trader.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deposit.txHash?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  const StatusIcon = ({ status }: { status: string }) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock
    return <Icon className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Управление депозитами</h1>
          <p className="text-gray-500 mt-1">Просмотр и управление депозитами трейдеров</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSettingsDialog(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Настройки
          </Button>
          <Button
            variant="outline"
            onClick={fetchDeposits}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Всего депозитов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deposits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ожидают подтверждения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {deposits.filter(d => d.status === 'PENDING' || d.status === 'CHECKING').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Подтверждено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {deposits.filter(d => d.status === 'CONFIRMED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Общая сумма</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(deposits.reduce((sum, d) => sum + d.amountUSDT, 0))} USDT
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Поиск по трейдеру или транзакции..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {['all', 'PENDING', 'CHECKING', 'CONFIRMED', 'FAILED'].map(status => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedStatus(status)
                  fetchDeposits()
                }}
              >
                {status === 'all' ? 'Все' : status}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deposits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список депозитов</CardTitle>
          <CardDescription>
            Все заявки на пополнение баланса от трейдеров
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Трейдер</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>TX Hash</TableHead>
                  <TableHead>Подтверждения</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeposits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Депозиты не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{deposit.trader.name}</p>
                          <p className="text-sm text-gray-500">{deposit.trader.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatAmount(deposit.amountUSDT)} USDT
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={statusColors[deposit.status as keyof typeof statusColors] as any}
                          className="flex items-center gap-1 w-fit"
                        >
                          <StatusIcon status={deposit.status} />
                          {deposit.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {deposit.txHash ? (
                          <span className="truncate max-w-[150px] inline-block">
                            {deposit.txHash}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {deposit.confirmations} / {settings?.deposit_confirmations_required || 3}
                      </TableCell>
                      <TableCell>
                        {formatDate(deposit.createdAt)}
                      </TableCell>
                      <TableCell>
                        {(deposit.status === 'PENDING' || deposit.status === 'CHECKING') && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const txHash = prompt('Введите TX Hash:')
                                if (txHash) {
                                  confirmDeposit(deposit.id, txHash)
                                }
                              }}
                            >
                              Подтвердить
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const reason = prompt('Причина отклонения:')
                                if (reason) {
                                  rejectDeposit(deposit.id, reason)
                                }
                              }}
                            >
                              Отклонить
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройки депозитов</DialogTitle>
            <DialogDescription>
              Настройте параметры приема депозитов
            </DialogDescription>
          </DialogHeader>
          
          {settings && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wallet">Адрес кошелька для депозитов</Label>
                <Input
                  id="wallet"
                  value={settings.deposit_wallet_address}
                  onChange={(e) => setSettings({ ...settings, deposit_wallet_address: e.target.value })}
                  placeholder="TRC-20 адрес"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="min-amount">Минимальная сумма депозита (USDT)</Label>
                <Input
                  id="min-amount"
                  type="number"
                  value={settings.min_deposit_amount}
                  onChange={(e) => setSettings({ ...settings, min_deposit_amount: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmations">Количество подтверждений</Label>
                <Input
                  id="confirmations"
                  type="number"
                  value={settings.deposit_confirmations_required}
                  onChange={(e) => setSettings({ ...settings, deposit_confirmations_required: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expiry">Время жизни заявки (минуты)</Label>
                <Input
                  id="expiry"
                  type="number"
                  value={settings.deposit_expiry_minutes}
                  onChange={(e) => setSettings({ ...settings, deposit_expiry_minutes: e.target.value })}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={updateSettings}
              disabled={isUpdatingSettings}
            >
              {isUpdatingSettings ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}