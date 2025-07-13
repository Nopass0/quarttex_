'use client'

import { useState } from 'react'
import { MerchantProtectedRoute } from '@/components/auth/merchant-protected-route'
import { MerchantLayout } from '@/components/layouts/merchant-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Check, AlertCircle } from 'lucide-react'
import { useMerchantAuth } from '@/stores/merchant-auth'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TransactionsApiDocsPage() {
  const { merchant } = useMerchantAuth()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      toast.success('Скопировано в буфер обмена')
    } catch (error) {
      toast.error('Не удалось скопировать')
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com'
  const apiKey = merchant?.token || 'YOUR_API_KEY'

  return (
    <MerchantProtectedRoute>
      <MerchantLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API методы для работы с транзакциями</h1>
            <p className="text-gray-600 mt-2">
              Создание, получение статуса и управление транзакциями
            </p>
          </div>

      <Alert>
        <AlertCircle className="h-4 w-4 text-[#006039]" />
        <AlertDescription>
          Все транзакции имеют время жизни, указанное в параметре <code className="bg-gray-100 px-1 rounded">expired_at</code>. 
          После истечения этого времени транзакция автоматически отменяется.
        </AlertDescription>
      </Alert>

      {/* Create Transaction */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-500 text-white">POST</Badge>
            <CardTitle>/api/merchant/transactions/create</CardTitle>
          </div>
          <CardDescription>
            Создание новой транзакции. При создании входящей транзакции (IN) автоматически подбираются реквизиты.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
              <TabsTrigger value="params">Параметры</TabsTrigger>
              <TabsTrigger value="response">Response</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`curl ${baseUrl}/api/merchant/transactions/create \\
  --request POST \\
  --header 'x-merchant-api-key: ${apiKey}' \\
  --header 'Content-Type: application/json' \\
  --data '{
    "amount": 5000,
    "orderId": "ORDER-12345",
    "methodId": "method1",
    "rate": 95.5,
    "expired_at": "2024-01-01T12:00:00.000Z",
    "userIp": "192.168.1.1",
    "type": "IN",
    "callbackUri": "https://example.com/webhook"
  }'`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `curl ${baseUrl}/api/merchant/transactions/create --request POST --header 'x-merchant-api-key: ${apiKey}' --header 'Content-Type: application/json' --data '{"amount": 5000, "orderId": "ORDER-12345", "methodId": "method1", "rate": 95.5, "expired_at": "2024-01-01T12:00:00.000Z", "userIp": "192.168.1.1", "type": "IN", "callbackUri": "https://example.com/webhook"}'`,
                  'create-curl'
                )}
              >
                {copiedId === 'create-curl' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="js" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const response = await fetch('${baseUrl}/api/merchant/transactions/create', {
  method: 'POST',
  headers: {
    'x-merchant-api-key': '${apiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 5000,
    orderId: 'ORDER-12345',
    methodId: 'method1',
    rate: 95.5,
    expired_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
    userIp: '192.168.1.1',
    type: 'IN',
    callbackUri: 'https://example.com/webhook'
  })
})

const transaction = await response.json()
console.log('Created transaction:', transaction)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const response = await fetch('${baseUrl}/api/merchant/transactions/create', {
  method: 'POST',
  headers: {
    'x-merchant-api-key': '${apiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 5000,
    orderId: 'ORDER-12345',
    methodId: 'method1',
    rate: 95.5,
    expired_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    userIp: '192.168.1.1',
    type: 'IN',
    callbackUri: 'https://example.com/webhook'
  })
})

const transaction = await response.json()
console.log('Created transaction:', transaction)`,
                  'create-js'
                )}
              >
                {copiedId === 'create-js' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="params">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Обязательные параметры</h4>
                  <div className="space-y-2 text-sm">
                    <div><code className="bg-gray-100 px-1 rounded">amount</code> (number) - Сумма транзакции в рублях</div>
                    <div><code className="bg-gray-100 px-1 rounded">orderId</code> (string) - Уникальный ID заказа от мерчанта</div>
                    <div><code className="bg-gray-100 px-1 rounded">methodId</code> (string) - ID метода платежа</div>
                    <div><code className="bg-gray-100 px-1 rounded">rate</code> (number) - Курс USDT/RUB</div>
                    <div><code className="bg-gray-100 px-1 rounded">expired_at</code> (string) - ISO дата истечения транзакции</div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Опциональные параметры</h4>
                  <div className="space-y-2 text-sm">
                    <div><code className="bg-gray-100 px-1 rounded">userIp</code> (string) - IP адрес пользователя</div>
                    <div><code className="bg-gray-100 px-1 rounded">userId</code> (string) - ID пользователя (генерируется автоматически)</div>
                    <div><code className="bg-gray-100 px-1 rounded">type</code> (string) - Тип транзакции: IN или OUT (по умолчанию IN)</div>
                    <div><code className="bg-gray-100 px-1 rounded">callbackUri</code> (string) - URL для webhook уведомлений</div>
                    <div><code className="bg-gray-100 px-1 rounded">successUri</code> (string) - URL для редиректа при успехе</div>
                    <div><code className="bg-gray-100 px-1 rounded">failUri</code> (string) - URL для редиректа при ошибке</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="response">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "id": "tx123",
  "numericId": 1001,
  "amount": 5000,
  "crypto": 52.36,
  "status": "IN_PROGRESS",
  "traderId": "trader123",
  "requisites": {
    "id": "req123",
    "bankType": "SBERBANK",
    "cardNumber": "2202 **** **** 1234",
    "recipientName": "Иван И.",
    "traderName": "Trader Name"
  },
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z",
  "expired_at": "2024-01-01T12:00:00.000Z",
  "method": {
    "id": "method1",
    "code": "sbp",
    "name": "СБП",
    "type": "sbp",
    "currency": "usdt"
  }
}`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Get Transaction Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-500 text-white">GET</Badge>
            <CardTitle>/api/merchant/transactions/status/{`{id}`}</CardTitle>
          </div>
          <CardDescription>
            Получение текущего статуса транзакции по её ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
              <TabsTrigger value="response">Response</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`curl ${baseUrl}/api/merchant/transactions/status/tx123 \\
  --header 'x-merchant-api-key: ${apiKey}'`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `curl ${baseUrl}/api/merchant/transactions/status/tx123 --header 'x-merchant-api-key: ${apiKey}'`,
                  'status-curl'
                )}
              >
                {copiedId === 'status-curl' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="js" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const transactionId = 'tx123'
const response = await fetch(\`${baseUrl}/api/merchant/transactions/status/\${transactionId}\`, {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const status = await response.json()
console.log('Transaction status:', status)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const transactionId = 'tx123'
const response = await fetch(\`${baseUrl}/api/merchant/transactions/status/\${transactionId}\`, {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const status = await response.json()
console.log('Transaction status:', status)`,
                  'status-js'
                )}
              >
                {copiedId === 'status-js' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="response">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "id": "tx123",
  "orderId": "ORDER-12345",
  "amount": 5000,
  "status": "READY",
  "type": "IN",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:05:00.000Z",
  "method": {
    "id": "method1",
    "code": "sbp",
    "name": "СБП",
    "type": "sbp",
    "currency": "usdt"
  }
}`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Get Transaction by Order ID */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-500 text-white">GET</Badge>
            <CardTitle>/api/merchant/transactions/by-order-id/{`{orderId}`}</CardTitle>
          </div>
          <CardDescription>
            Получение полной информации о транзакции включая реквизиты по orderId
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
              <TabsTrigger value="response">Response</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`curl ${baseUrl}/api/merchant/transactions/by-order-id/ORDER-12345 \\
  --header 'x-merchant-api-key: ${apiKey}'`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `curl ${baseUrl}/api/merchant/transactions/by-order-id/ORDER-12345 --header 'x-merchant-api-key: ${apiKey}'`,
                  'byorder-curl'
                )}
              >
                {copiedId === 'byorder-curl' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="js" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const orderId = 'ORDER-12345'
const response = await fetch(\`${baseUrl}/api/merchant/transactions/by-order-id/\${orderId}\`, {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const transaction = await response.json()
console.log('Transaction details:', transaction)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const orderId = 'ORDER-12345'
const response = await fetch(\`${baseUrl}/api/merchant/transactions/by-order-id/\${orderId}\`, {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const transaction = await response.json()
console.log('Transaction details:', transaction)`,
                  'byorder-js'
                )}
              >
                {copiedId === 'byorder-js' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="response">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "id": "tx123",
  "orderId": "ORDER-12345",
  "amount": 5000,
  "status": "READY",
  "type": "IN",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:05:00.000Z",
  "isMock": false,
  "method": {
    "id": "method1",
    "code": "sbp",
    "name": "СБП",
    "type": "sbp",
    "currency": "usdt"
  },
  "requisites": {
    "id": "req123",
    "bankType": "SBERBANK",
    "cardNumber": "2202 **** **** 1234",
    "recipientName": "Иван И.",
    "traderId": "trader123",
    "traderName": "Trader Name"
  }
}`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cancel Transaction */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className="bg-orange-500 text-white">PATCH</Badge>
            <CardTitle>/api/merchant/transactions/by-order-id/{`{orderId}`}/cancel</CardTitle>
          </div>
          <CardDescription>
            Отмена транзакции. Возможна только для транзакций в статусах CREATED или IN_PROGRESS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
              <TabsTrigger value="response">Response</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`curl ${baseUrl}/api/merchant/transactions/by-order-id/ORDER-12345/cancel \\
  --request PATCH \\
  --header 'x-merchant-api-key: ${apiKey}'`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `curl ${baseUrl}/api/merchant/transactions/by-order-id/ORDER-12345/cancel --request PATCH --header 'x-merchant-api-key: ${apiKey}'`,
                  'cancel-curl'
                )}
              >
                {copiedId === 'cancel-curl' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="js" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const orderId = 'ORDER-12345'
const response = await fetch(\`${baseUrl}/api/merchant/transactions/by-order-id/\${orderId}/cancel\`, {
  method: 'PATCH',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const result = await response.json()
console.log('Cancel result:', result)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const orderId = 'ORDER-12345'
const response = await fetch(\`${baseUrl}/api/merchant/transactions/by-order-id/\${orderId}/cancel\`, {
  method: 'PATCH',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const result = await response.json()
console.log('Cancel result:', result)`,
                  'cancel-js'
                )}
              >
                {copiedId === 'cancel-js' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="response">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "transaction": {
    "id": "tx123",
    "status": "CANCELED",
    "orderId": "ORDER-12345",
    "amount": 5000,
    "updatedAt": "2024-01-01T10:10:00.000Z"
  }
}`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* List Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-500 text-white">GET</Badge>
            <CardTitle>/api/merchant/transactions/list</CardTitle>
          </div>
          <CardDescription>
            Получение списка транзакций с фильтрацией и пагинацией
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
              <TabsTrigger value="params">Параметры</TabsTrigger>
              <TabsTrigger value="response">Response</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`curl '${baseUrl}/api/merchant/transactions/list?page=1&limit=10&status=READY&type=IN' \\
  --header 'x-merchant-api-key: ${apiKey}'`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `curl '${baseUrl}/api/merchant/transactions/list?page=1&limit=10&status=READY&type=IN' --header 'x-merchant-api-key: ${apiKey}'`,
                  'list-curl'
                )}
              >
                {copiedId === 'list-curl' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="js" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const params = new URLSearchParams({
  page: '1',
  limit: '10',
  status: 'READY',
  type: 'IN'
})

const response = await fetch(\`${baseUrl}/api/merchant/transactions/list?\${params}\`, {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const data = await response.json()
console.log('Transactions:', data)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const params = new URLSearchParams({
  page: '1',
  limit: '10',
  status: 'READY',
  type: 'IN'
})

const response = await fetch(\`${baseUrl}/api/merchant/transactions/list?\${params}\`, {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const data = await response.json()
console.log('Transactions:', data)`,
                  'list-js'
                )}
              >
                {copiedId === 'list-js' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="params">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Query параметры</h4>
                  <div className="space-y-2 text-sm">
                    <div><code className="bg-gray-100 px-1 rounded">page</code> (number) - Номер страницы (по умолчанию 1)</div>
                    <div><code className="bg-gray-100 px-1 rounded">limit</code> (number) - Количество записей (по умолчанию 10, макс 100)</div>
                    <div><code className="bg-gray-100 px-1 rounded">status</code> (string) - Фильтр по статусу</div>
                    <div><code className="bg-gray-100 px-1 rounded">type</code> (string) - Фильтр по типу: IN, OUT</div>
                    <div><code className="bg-gray-100 px-1 rounded">methodId</code> (string) - Фильтр по ID метода</div>
                    <div><code className="bg-gray-100 px-1 rounded">orderId</code> (string) - Поиск по orderId (частичное совпадение)</div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Возможные статусы</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><Badge variant="secondary">CREATED</Badge> - Создана</div>
                    <div><Badge variant="default">IN_PROGRESS</Badge> - В процессе</div>
                    <div><Badge variant="success">READY</Badge> - Завершена</div>
                    <div><Badge variant="destructive">EXPIRED</Badge> - Истекла</div>
                    <div><Badge variant="destructive">CANCELED</Badge> - Отменена</div>
                    <div><Badge variant="warning">DISPUTE</Badge> - Спор</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="response">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "data": [
    {
      "id": "tx123",
      "orderId": "ORDER-12345",
      "amount": 5000,
      "status": "READY",
      "type": "IN",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:05:00.000Z",
      "isMock": false,
      "method": {
        "id": "method1",
        "code": "sbp",
        "name": "СБП",
        "type": "sbp",
        "currency": "usdt"
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
      </MerchantLayout>
    </MerchantProtectedRoute>
  )
}