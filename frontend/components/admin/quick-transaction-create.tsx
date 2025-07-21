'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAdminAuth } from '@/stores/auth'
import { Send, Zap, RefreshCw } from 'lucide-react'

interface QuickTransactionCreateProps {
  merchantId: string
  merchantToken: string
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

export function QuickTransactionCreate({ merchantId, merchantToken, merchantMethods }: QuickTransactionCreateProps) {
  const { token: adminToken } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isBatchLoading, setIsBatchLoading] = useState(false)
  const [transactionType, setTransactionType] = useState<'IN' | 'OUT'>('IN')
  const [methodId, setMethodId] = useState('')
  const [amount, setAmount] = useState('')

  const createQuickTransaction = async () => {
    if (!methodId) {
      toast.error('Выберите метод оплаты')
      return
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Укажите корректную сумму')
      return
    }
    
    try {
      setIsLoading(true)
      
      const data = {
        methodId,
        amount: parseFloat(amount),
        rate: 95 + Math.random() * 10,
        orderId: `QUICK_${transactionType}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        expired_at: new Date(Date.now() + 3600000).toISOString(),
        userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      }
      
      const endpoint = transactionType === 'IN' ? 'in' : 'out'
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/transactions/test/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || ''
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Транзакция ${transactionType} создана`, {
          description: `ID: ${result.id}, Сумма: ${result.amount} ₽`
        })
        
        // Reset form
        setAmount('')
      } else {
        toast.error('Ошибка создания транзакции', {
          description: result.error || 'Неизвестная ошибка'
        })
      }
    } catch (error) {
      toast.error('Ошибка при отправке запроса')
    } finally {
      setIsLoading(false)
    }
  }

  const createBatchTransactions = async (count: number) => {
    if (!methodId && merchantMethods.length === 0) {
      toast.error('Выберите метод оплаты или активируйте хотя бы один метод')
      return
    }
    
    setIsBatchLoading(true)
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < count; i++) {
      try {
        const selectedMethodId = methodId || merchantMethods[Math.floor(Math.random() * merchantMethods.length)]?.method.id
        if (!selectedMethodId) continue
        
        const data = {
          methodId: selectedMethodId,
          amount: Math.floor(Math.random() * 9000) + 1000,
          rate: 95 + Math.random() * 10,
          orderId: `BATCH_${transactionType}_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`,
          expired_at: new Date(Date.now() + 3600000).toISOString(),
          userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        }
        
        const endpoint = transactionType === 'IN' ? 'in' : 'out'
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/transactions/test/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminToken || ''
          },
          body: JSON.stringify(data)
        })
        
        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        errorCount++
      }
    }
    
    setIsBatchLoading(false)
    toast.success('Пакетное создание завершено', {
      description: `Успешно: ${successCount}, Ошибок: ${errorCount}`
    })
  }

  if (merchantMethods.length === 0) {
    return null
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-yellow-500" />
          Быстрое создание транзакции
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Создать одну транзакцию для тестирования
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-sm">Тип</Label>
            <Select value={transactionType} onValueChange={(v) => setTransactionType(v as 'IN' | 'OUT')}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                <SelectItem value="IN" className="dark:text-gray-200 dark:hover:bg-gray-600">Входящая (IN)</SelectItem>
                <SelectItem value="OUT" className="dark:text-gray-200 dark:hover:bg-gray-600">Исходящая (OUT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm">Метод оплаты</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                <SelectValue placeholder="Выберите" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                {merchantMethods.map((mm) => (
                  <SelectItem key={mm.method.id} value={mm.method.id} className="dark:text-gray-200 dark:hover:bg-gray-600">
                    {mm.method.name} ({mm.method.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm">Сумма (₽)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={createQuickTransaction}
              disabled={isLoading || !methodId || !amount}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Создать
            </Button>
          </div>
        </div>
        
        {/* Batch creation buttons */}
        <div className="border-t dark:border-gray-700 pt-4 mt-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">Быстрое создание пакета транзакций</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => createBatchTransactions(5)}
              disabled={isBatchLoading}
              className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
            >
              {isBatchLoading && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
              Создать 5
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => createBatchTransactions(10)}
              disabled={isBatchLoading}
              className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
            >
              {isBatchLoading && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
              Создать 10
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => createBatchTransactions(20)}
              disabled={isBatchLoading}
              className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
            >
              {isBatchLoading && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
              Создать 20
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}