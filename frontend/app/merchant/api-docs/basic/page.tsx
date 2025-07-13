'use client'

import { useState } from 'react'
import { MerchantProtectedRoute } from '@/components/auth/merchant-protected-route'
import { MerchantLayout } from '@/components/layouts/merchant-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Check } from 'lucide-react'
import { useMerchantAuth } from '@/stores/merchant-auth'
import { toast } from 'sonner'

export default function BasicApiDocsPage() {
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
            <h1 className="text-3xl font-bold text-gray-900">Основные методы API</h1>
            <p className="text-gray-600 mt-2">
              Базовые методы для работы с API платежной системы
            </p>
          </div>

      {/* Connect Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-500 text-white">GET</Badge>
            <CardTitle>/api/merchant/connect</CardTitle>
          </div>
          <CardDescription>
            Получение информации о мерчанте и статистики транзакций
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
{`curl ${baseUrl}/api/merchant/connect \\
  --header 'x-merchant-api-key: ${apiKey}'`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `curl ${baseUrl}/api/merchant/connect --header 'x-merchant-api-key: ${apiKey}'`,
                  'connect-curl'
                )}
              >
                {copiedId === 'connect-curl' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="js" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const response = await fetch('${baseUrl}/api/merchant/connect', {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const data = await response.json()
console.log(data)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const response = await fetch('${baseUrl}/api/merchant/connect', {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const data = await response.json()
console.log(data)`,
                  'connect-js'
                )}
              >
                {copiedId === 'connect-js' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="response">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "id": "merchant123",
  "name": "Название мерчанта",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "totalTx": 150,
  "paidTx": 120
}`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Balance Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-500 text-white">GET</Badge>
            <CardTitle>/api/merchant/balance</CardTitle>
          </div>
          <CardDescription>
            Получение текущего баланса мерчанта в USDT
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
{`curl ${baseUrl}/api/merchant/balance \\
  --header 'x-merchant-api-key: ${apiKey}'`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `curl ${baseUrl}/api/merchant/balance --header 'x-merchant-api-key: ${apiKey}'`,
                  'balance-curl'
                )}
              >
                {copiedId === 'balance-curl' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="js" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const response = await fetch('${baseUrl}/api/merchant/balance', {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const data = await response.json()
console.log('Balance:', data.balance)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const response = await fetch('${baseUrl}/api/merchant/balance', {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const data = await response.json()
console.log('Balance:', data.balance)`,
                  'balance-js'
                )}
              >
                {copiedId === 'balance-js' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="response">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "balance": 5000.50
}`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Methods List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-500 text-white">GET</Badge>
            <CardTitle>/api/merchant/methods</CardTitle>
          </div>
          <CardDescription>
            Получение списка доступных методов платежа с параметрами и комиссиями
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
{`curl ${baseUrl}/api/merchant/methods \\
  --header 'x-merchant-api-key: ${apiKey}'`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `curl ${baseUrl}/api/merchant/methods --header 'x-merchant-api-key: ${apiKey}'`,
                  'methods-curl'
                )}
              >
                {copiedId === 'methods-curl' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="js" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const response = await fetch('${baseUrl}/api/merchant/methods', {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const methods = await response.json()
console.log('Available methods:', methods)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const response = await fetch('${baseUrl}/api/merchant/methods', {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const methods = await response.json()
console.log('Available methods:', methods)`,
                  'methods-js'
                )}
              >
                {copiedId === 'methods-js' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="response">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`[
  {
    "id": "method1",
    "code": "sbp",
    "name": "СБП",
    "type": "sbp",
    "currency": "usdt",
    "commissionPayin": 1.5,
    "commissionPayout": 2.0,
    "maxPayin": 100000,
    "minPayin": 100,
    "maxPayout": 50000,
    "minPayout": 500,
    "isEnabled": true
  },
  {
    "id": "method2",
    "code": "c2c",
    "name": "Card to Card",
    "type": "c2c",
    "currency": "usdt",
    "commissionPayin": 2.0,
    "commissionPayout": 2.5,
    "maxPayin": 50000,
    "minPayin": 500,
    "maxPayout": 30000,
    "minPayout": 1000,
    "isEnabled": true
  }
]`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Enums */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-500 text-white">GET</Badge>
            <CardTitle>/api/merchant/enums</CardTitle>
          </div>
          <CardDescription>
            Получение всех возможных значений для enum полей
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
{`curl ${baseUrl}/api/merchant/enums \\
  --header 'x-merchant-api-key: ${apiKey}'`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `curl ${baseUrl}/api/merchant/enums --header 'x-merchant-api-key: ${apiKey}'`,
                  'enums-curl'
                )}
              >
                {copiedId === 'enums-curl' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="js" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const response = await fetch('${baseUrl}/api/merchant/enums', {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const enums = await response.json()
console.log('Available enums:', enums)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const response = await fetch('${baseUrl}/api/merchant/enums', {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const enums = await response.json()
console.log('Available enums:', enums)`,
                  'enums-js'
                )}
              >
                {copiedId === 'enums-js' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="response">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "status": [
    "CREATED",
    "IN_PROGRESS",
    "DISPUTE",
    "EXPIRED",
    "READY",
    "MILK",
    "CANCELED"
  ],
  "transactionType": ["IN", "OUT"],
  "methodType": [
    "upi",
    "c2ckz",
    "c2cuz",
    "c2caz",
    "c2c",
    "sbp",
    "spay",
    "tpay",
    "vpay",
    "apay"
  ],
  "currency": ["rub", "usdt"]
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