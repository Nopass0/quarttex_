'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, ArrowLeft, RefreshCw, Activity, DollarSign } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { toast } from 'sonner'
import { formatAmount } from '@/lib/utils'
import { MerchantMilkDeals } from '@/components/admin/merchant-milk-deals'
import { MerchantExtraSettlements } from '@/components/admin/merchant-extra-settlements'

type Merchant = {
  id: string
  name: string
  token: string
  disabled: boolean
  banned: boolean
  balanceUsdt: number
  createdAt: string
  merchantMethods: Array<{
    id: string
    isEnabled: boolean
    method: {
      id: string
      code: string
      name: string
      type: string
      currency: string
    }
  }>
}

export default function MerchantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const merchantId = params.merchantId as string
  const { token: adminToken } = useAdminAuth()
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchMerchant()
  }, [merchantId])

  const fetchMerchant = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${merchantId}`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch merchant')
      }
      const data = await response.json()
      setMerchant(data)
    } catch (error) {
      toast.error('Не удалось загрузить данные мерчанта')
      router.push('/admin/merchants')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, message: string = 'Скопировано в буфер обмена') => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  if (isLoading || !merchant) {
    return (
      <ProtectedRoute variant="admin">
        <AuthLayout variant="admin">
          <div className="flex justify-center items-center h-[50vh]">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </AuthLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/admin/merchants')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{merchant.name}</h1>
                <p className="text-gray-600 mt-1">
                  ID: <code className="text-sm bg-gray-100 px-2 py-1 rounded">{merchant.id}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(merchant.id, 'ID скопирован')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={merchant.disabled ? 'secondary' : 'default'}>
                {merchant.disabled ? 'Отключен' : 'Активен'}
              </Badge>
              <Badge variant={merchant.banned ? 'destructive' : 'outline'}>
                {merchant.banned ? 'Заблокирован' : 'Не заблокирован'}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchMerchant}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Баланс USDT</p>
                  <p className="text-2xl font-bold text-[#006039]">
                    ${formatAmount(merchant.balanceUsdt)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Активных методов</p>
                  <p className="text-2xl font-bold">
                    {merchant.merchantMethods.filter(m => m.isEnabled).length}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <div>
                <p className="text-sm text-gray-600 mb-2">API ключ</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                    {merchant.token}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(merchant.token, 'API ключ скопирован')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="milk-deals" className="space-y-4">
            <TabsList>
              <TabsTrigger value="milk-deals">Проблемные платежи</TabsTrigger>
              <TabsTrigger value="extra-settlements">Дополнительные расчеты</TabsTrigger>
              <TabsTrigger value="methods">Методы оплаты</TabsTrigger>
            </TabsList>
            
            <TabsContent value="milk-deals">
              <MerchantMilkDeals merchantId={merchantId} />
            </TabsContent>
            
            <TabsContent value="extra-settlements">
              <MerchantExtraSettlements merchantId={merchantId} />
            </TabsContent>
            
            <TabsContent value="methods">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Подключенные методы оплаты</h3>
                {merchant.merchantMethods.length > 0 ? (
                  <div className="space-y-3">
                    {merchant.merchantMethods.map((mm) => (
                      <div key={mm.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{mm.method.name}</div>
                          <div className="text-sm text-gray-500">
                            {mm.method.code} • {mm.method.type} • {mm.method.currency.toUpperCase()}
                          </div>
                        </div>
                        <Badge variant={mm.isEnabled ? 'default' : 'secondary'}>
                          {mm.isEnabled ? 'Активен' : 'Отключен'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Нет подключенных методов</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}