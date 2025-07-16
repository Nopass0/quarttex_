'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useAdminAuth } from '@/stores/auth'
import { RefreshCw, Send, Shuffle } from 'lucide-react'

interface TestMerchantTransactionsProps {
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

export function TestMerchantTransactions({ merchantId, merchantToken, merchantMethods }: TestMerchantTransactionsProps) {
  const { token: adminToken } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [useRandomData, setUseRandomData] = useState(true)
  
  // Form data
  const [transactionType, setTransactionType] = useState<'IN' | 'OUT'>('IN')
  const [methodId, setMethodId] = useState('')
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState('')
  const [orderId, setOrderId] = useState('')
  const [userIp, setUserIp] = useState('')
  const [callbackUri, setCallbackUri] = useState('')
  
  // Auto-creation state - separate for IN and OUT
  const [autoCreateEnabled, setAutoCreateEnabled] = useState<{ IN: boolean; OUT: boolean }>({ IN: false, OUT: false })
  const [minDelay, setMinDelay] = useState<{ IN: string; OUT: string }>({ IN: '5', OUT: '5' })
  const [maxDelay, setMaxDelay] = useState<{ IN: string; OUT: string }>({ IN: '30', OUT: '30' })
  const [autoCreateInterval, setAutoCreateInterval] = useState<{ IN: NodeJS.Timeout | null; OUT: NodeJS.Timeout | null }>({ IN: null, OUT: null })
  const autoCreateEnabledRef = useRef(autoCreateEnabled)
  
  // Update ref when state changes
  useEffect(() => {
    autoCreateEnabledRef.current = autoCreateEnabled
  }, [autoCreateEnabled])
  
  const activeMethods = merchantMethods.filter(m => m.isEnabled)
  
  const generateRandomData = () => {
    const randomAmount = Math.floor(Math.random() * 9000) + 1000
    const randomRate = (95 + Math.random() * 10).toFixed(2)
    const randomOrderId = `TEST_${transactionType}_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const randomIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    
    setAmount(randomAmount.toString())
    setRate(randomRate)
    setOrderId(randomOrderId)
    setUserIp(randomIp)
  }
  
  const createTransaction = async () => {
    if (!methodId) {
      toast.error('Выберите метод оплаты')
      return
    }
    
    try {
      setIsLoading(true)
      
      const data: any = {
        methodId,
        amount: useRandomData ? Math.floor(Math.random() * 9000) + 1000 : Number(amount),
        rate: useRandomData ? 95 + Math.random() * 10 : Number(rate),
        orderId: useRandomData ? `TEST_${transactionType}_${Date.now()}_${Math.random().toString(36).substring(7)}` : orderId,
        expired_at: new Date(Date.now() + 3600000).toISOString(),
        userIp: useRandomData ? `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` : userIp,
      }
      
      // Добавляем callbackUri только если он задан
      if (callbackUri) {
        data.callbackUri = callbackUri;
      }
      
      const endpoint = transactionType === 'IN' ? 'in' : 'out'
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant/transactions/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-api-key': merchantToken
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Транзакция ${transactionType} создана успешно`, {
          description: `ID: ${result.id}, Сумма: ${result.amount} ₽`
        })
        
        // Reset form if using custom data
        if (!useRandomData) {
          setAmount('')
          setOrderId('')
          setUserIp('')
        }
      } else {
        toast.error('Ошибка создания транзакции', {
          description: result.error || 'Неизвестная ошибка'
        })
      }
    } catch (error) {
      toast.error('Ошибка при отправке запроса')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const createBatchTransactions = async (count: number) => {
    setIsLoading(true)
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < count; i++) {
      try {
        const randomMethodId = activeMethods[Math.floor(Math.random() * activeMethods.length)]?.method.id
        if (!randomMethodId) continue
        
        const data: any = {
          methodId: randomMethodId,
          amount: Math.floor(Math.random() * 9000) + 1000,
          rate: 95 + Math.random() * 10,
          orderId: `BATCH_${transactionType}_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`,
          expired_at: new Date(Date.now() + 3600000).toISOString(),
          userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        }
        
        // Добавляем callbackUri только если он задан
        if (callbackUri) {
          data.callbackUri = callbackUri;
        }
        
        console.log('Sending transaction data:', data)
        
        const endpoint = transactionType === 'IN' ? 'in' : 'out'
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant/transactions/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-merchant-api-key': merchantToken
          },
          body: JSON.stringify(data)
        })
        
        if (response.ok) {
          successCount++
        } else {
          errorCount++
          const error = await response.json()
          console.error('Transaction creation failed:', error)
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        errorCount++
      }
    }
    
    setIsLoading(false)
    toast.success('Пакетное создание завершено', {
      description: `Успешно: ${successCount}, Ошибок: ${errorCount}`
    })
  }
  
  // Auto-creation functions
  const startAutoCreate = (type: 'IN' | 'OUT') => {
    if (!methodId && activeMethods.length === 0) {
      toast.error('Выберите метод оплаты или активируйте хотя бы один метод')
      return
    }
    
    setAutoCreateEnabled(prev => ({ ...prev, [type]: true }))
    scheduleNextTransaction(type)
  }
  
  const stopAutoCreate = (type: 'IN' | 'OUT') => {
    setAutoCreateEnabled(prev => ({ ...prev, [type]: false }))
    if (autoCreateInterval[type]) {
      clearTimeout(autoCreateInterval[type])
      setAutoCreateInterval(prev => ({ ...prev, [type]: null }))
    }
  }
  
  const scheduleNextTransaction = (type: 'IN' | 'OUT') => {
    const min = parseInt(minDelay[type]) * 1000
    const max = parseInt(maxDelay[type]) * 1000
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    
    console.log(`Scheduling next ${type} transaction in ${delay}ms`)
    
    const timeout = setTimeout(async () => {
      console.log(`Auto-create timer fired for ${type}, enabled:`, autoCreateEnabledRef.current[type])
      if (autoCreateEnabledRef.current[type]) {
        await createAutoTransaction(type)
        scheduleNextTransaction(type)
      }
    }, delay)
    
    setAutoCreateInterval(prev => ({ ...prev, [type]: timeout }))
  }
  
  const createAutoTransaction = async (type: 'IN' | 'OUT') => {
    try {
      const selectedMethodId = methodId || activeMethods[Math.floor(Math.random() * activeMethods.length)]?.method.id
      if (!selectedMethodId) return
      
      const data: any = {
        methodId: selectedMethodId,
        amount: Math.floor(Math.random() * 9000) + 1000,
        rate: 95 + Math.random() * 10,
        orderId: `AUTO_${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        expired_at: new Date(Date.now() + 3600000).toISOString(),
        userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      }
      
      if (callbackUri) {
        data.callbackUri = callbackUri;
      }
      
      const endpoint = type === 'IN' ? 'in' : 'out'
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant/transactions/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-api-key': merchantToken
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Авто-транзакция ${type} создана`, {
          description: `ID: ${result.id}, Сумма: ${result.amount} ₽`
        })
      } else {
        console.error(`Auto-transaction ${type} failed:`, result)
      }
    } catch (error) {
      console.error(`Auto-transaction ${type} error:`, error)
    }
  }
  
  // Cleanup on unmount or when auto-create is disabled
  useEffect(() => {
    return () => {
      if (autoCreateInterval.IN) {
        clearTimeout(autoCreateInterval.IN)
      }
      if (autoCreateInterval.OUT) {
        clearTimeout(autoCreateInterval.OUT)
      }
    }
  }, [autoCreateInterval])
  
  // Fix for autoCreateEnabled state in closure
  useEffect(() => {
    if (!autoCreateEnabled.IN && autoCreateInterval.IN) {
      clearTimeout(autoCreateInterval.IN)
      setAutoCreateInterval(prev => ({ ...prev, IN: null }))
    }
    if (!autoCreateEnabled.OUT && autoCreateInterval.OUT) {
      clearTimeout(autoCreateInterval.OUT)
      setAutoCreateInterval(prev => ({ ...prev, OUT: null }))
    }
  }, [autoCreateEnabled, autoCreateInterval])
  
  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="dark:text-white">Тестовые транзакции</CardTitle>
        <CardDescription className="dark:text-gray-400">
          Создание тестовых транзакций для эмуляции работы мерчанта
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="random-mode" className="dark:text-gray-300">Использовать случайные данные</Label>
          <Switch
            id="random-mode"
            checked={useRandomData}
            onCheckedChange={setUseRandomData}
            className="dark:bg-gray-700"
          />
        </div>
        
        <Tabs value={transactionType} onValueChange={(v) => setTransactionType(v as 'IN' | 'OUT')}>
          <TabsList className="grid w-full grid-cols-2 dark:bg-gray-700">
            <TabsTrigger value="IN" className="dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-white">Входящие (IN)</TabsTrigger>
            <TabsTrigger value="OUT" className="dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-white">Исходящие (OUT)</TabsTrigger>
          </TabsList>
          
          <TabsContent value={transactionType} className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="method" className="dark:text-gray-300">Метод оплаты</Label>
                <Select value={methodId} onValueChange={setMethodId}>
                  <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Выберите метод" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                    {activeMethods.map((mm) => (
                      <SelectItem key={mm.method.id} value={mm.method.id} className="dark:text-gray-200 dark:hover:bg-gray-600">
                        {mm.method.name} ({mm.method.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {!useRandomData && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount" className="dark:text-gray-300">Сумма (₽)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="5000"
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rate" className="dark:text-gray-300">Курс USDT/RUB</Label>
                      <Input
                        id="rate"
                        type="number"
                        step="0.01"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        placeholder="95.5"
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="orderId" className="dark:text-gray-300">Order ID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="orderId"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        placeholder="TEST_ORDER_123"
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setOrderId(`TEST_${transactionType}_${Date.now()}_${Math.random().toString(36).substring(7)}`)}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                      >
                        <Shuffle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="userIp" className="dark:text-gray-300">IP пользователя</Label>
                    <div className="flex gap-2">
                      <Input
                        id="userIp"
                        value={userIp}
                        onChange={(e) => setUserIp(e.target.value)}
                        placeholder="192.168.1.1"
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setUserIp(`192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`)}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                      >
                        <Shuffle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
              
              <div>
                <Label htmlFor="callbackUri" className="dark:text-gray-300">Callback URL (опционально)</Label>
                <Input
                  id="callbackUri"
                  value={callbackUri}
                  onChange={(e) => setCallbackUri(e.target.value)}
                  placeholder="https://example.com/webhook"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                onClick={createTransaction}
                disabled={isLoading || !methodId || (!useRandomData && (!amount || !rate || !orderId))}
                className="flex-1"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Создать транзакцию
              </Button>
              
              {!useRandomData && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateRandomData}
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Заполнить случайными
                </Button>
              )}
            </div>
            
            {useRandomData && (
              <div className="border-t dark:border-gray-700 pt-4 space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Быстрое создание пакета транзакций</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createBatchTransactions(5)}
                    disabled={isLoading}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
                  >
                    Создать 5
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createBatchTransactions(10)}
                    disabled={isLoading}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
                  >
                    Создать 10
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createBatchTransactions(20)}
                    disabled={isLoading}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
                  >
                    Создать 20
                  </Button>
                </div>
                
                {/* Auto-creation section */}
                <div className="border dark:border-gray-700 rounded-lg p-4 space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm dark:text-gray-200">Автоматическое создание</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Создание транзакций с случайной задержкой
                      </p>
                    </div>
                    <Switch
                      checked={autoCreateEnabled[transactionType]}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          startAutoCreate(transactionType)
                        } else {
                          stopAutoCreate(transactionType)
                        }
                      }}
                      className="dark:bg-gray-700"
                    />
                  </div>
                  
                  {autoCreateEnabled[transactionType] && (
                    <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                      Автосоздание {transactionType} активно
                    </Badge>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs dark:text-gray-300">Мин. задержка (сек)</Label>
                      <Input
                        type="number"
                        value={minDelay[transactionType]}
                        onChange={(e) => setMinDelay(prev => ({ ...prev, [transactionType]: e.target.value }))}
                        min="1"
                        max="300"
                        disabled={autoCreateEnabled[transactionType]}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs dark:text-gray-300">Макс. задержка (сек)</Label>
                      <Input
                        type="number"
                        value={maxDelay[transactionType]}
                        onChange={(e) => setMaxDelay(prev => ({ ...prev, [transactionType]: e.target.value }))}
                        min="1"
                        max="300"
                        disabled={autoCreateEnabled[transactionType]}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Транзакции {transactionType} будут создаваться автоматически с задержкой от {minDelay[transactionType]} до {maxDelay[transactionType]} секунд
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}