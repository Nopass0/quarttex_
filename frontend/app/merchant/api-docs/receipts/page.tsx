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

export default function ReceiptsApiDocsPage() {
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
            <h1 className="text-3xl font-bold text-gray-900">API методы для работы с чеками</h1>
            <p className="text-gray-600 mt-2">
              Загрузка и получение чеков для подтверждения транзакций
            </p>
          </div>

      <Alert>
        <AlertCircle className="h-4 w-4 text-[#006039]" />
        <AlertDescription>
          Чеки используются для подтверждения оплаты. Файлы должны быть в формате base64 и не превышать 10 МБ.
        </AlertDescription>
      </Alert>

      {/* Upload Receipt */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-500 text-white">POST</Badge>
            <CardTitle>/api/merchant/transactions/{`{id}`}/receipt</CardTitle>
          </div>
          <CardDescription>
            Загрузка чека для транзакции. Можно опционально обновить статус транзакции.
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
{`curl ${baseUrl}/api/merchant/transactions/tx123/receipt \\
  --request POST \\
  --header 'x-merchant-api-key: ${apiKey}' \\
  --header 'Content-Type: application/json' \\
  --data '{
    "fileData": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "fileName": "receipt.png",
    "updateStatus": "READY"
  }'`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `curl ${baseUrl}/api/merchant/transactions/tx123/receipt --request POST --header 'x-merchant-api-key: ${apiKey}' --header 'Content-Type: application/json' --data '{"fileData": "data:image/png;base64,iVBORw0KGgoAAAANS...", "fileName": "receipt.png", "updateStatus": "READY"}'`,
                  'upload-curl'
                )}
              >
                {copiedId === 'upload-curl' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="js" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`// Функция для конвертации файла в base64
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

// Загрузка чека
const file = document.getElementById('file-input').files[0]
const base64 = await fileToBase64(file)

const response = await fetch(\`${baseUrl}/api/merchant/transactions/tx123/receipt\`, {
  method: 'POST',
  headers: {
    'x-merchant-api-key': '${apiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileData: base64,
    fileName: file.name,
    updateStatus: 'READY' // опционально
  })
})

const receipt = await response.json()
console.log('Uploaded receipt:', receipt)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `// Функция для конвертации файла в base64
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

// Загрузка чека
const file = document.getElementById('file-input').files[0]
const base64 = await fileToBase64(file)

const response = await fetch(\`${baseUrl}/api/merchant/transactions/tx123/receipt\`, {
  method: 'POST',
  headers: {
    'x-merchant-api-key': '${apiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileData: base64,
    fileName: file.name,
    updateStatus: 'READY'
  })
})

const receipt = await response.json()
console.log('Uploaded receipt:', receipt)`,
                  'upload-js'
                )}
              >
                {copiedId === 'upload-js' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="params">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Path параметры</h4>
                  <div className="space-y-2 text-sm">
                    <div><code className="bg-gray-100 px-1 rounded">id</code> (string) - ID транзакции</div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Body параметры</h4>
                  <div className="space-y-2 text-sm">
                    <div><code className="bg-gray-100 px-1 rounded">fileData</code> (string, обязательный) - Файл в формате base64</div>
                    <div><code className="bg-gray-100 px-1 rounded">fileName</code> (string, обязательный) - Имя файла</div>
                    <div><code className="bg-gray-100 px-1 rounded">updateStatus</code> (string, опциональный) - Обновить статус транзакции</div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Поддерживаемые форматы</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>• PNG</div>
                    <div>• JPG/JPEG</div>
                    <div>• PDF</div>
                    <div>• WEBP</div>
                    <div>• GIF</div>
                    <div>• BMP</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="response">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "id": "receipt123",
  "fileName": "receipt.png",
  "isChecked": false,
  "isFake": false,
  "isAuto": false,
  "createdAt": "2024-01-01T10:00:00.000Z"
}`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Get Receipts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-500 text-white">GET</Badge>
            <CardTitle>/api/merchant/transactions/{`{id}`}/receipts</CardTitle>
          </div>
          <CardDescription>
            Получение всех загруженных чеков для транзакции
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
{`curl ${baseUrl}/api/merchant/transactions/tx123/receipts \\
  --header 'x-merchant-api-key: ${apiKey}'`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `curl ${baseUrl}/api/merchant/transactions/tx123/receipts --header 'x-merchant-api-key: ${apiKey}'`,
                  'get-curl'
                )}
              >
                {copiedId === 'get-curl' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="js" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const transactionId = 'tx123'
const response = await fetch(\`${baseUrl}/api/merchant/transactions/\${transactionId}/receipts\`, {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const receipts = await response.json()
console.log('Transaction receipts:', receipts)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const transactionId = 'tx123'
const response = await fetch(\`${baseUrl}/api/merchant/transactions/\${transactionId}/receipts\`, {
  method: 'GET',
  headers: {
    'x-merchant-api-key': '${apiKey}'
  }
})

const receipts = await response.json()
console.log('Transaction receipts:', receipts)`,
                  'get-js'
                )}
              >
                {copiedId === 'get-js' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="response">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`[
  {
    "id": "receipt123",
    "fileName": "receipt.png",
    "isChecked": true,
    "isFake": false,
    "isAuto": false,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:05:00.000Z"
  },
  {
    "id": "receipt124",
    "fileName": "receipt2.jpg",
    "isChecked": false,
    "isFake": false,
    "isAuto": true,
    "createdAt": "2024-01-01T10:10:00.000Z",
    "updatedAt": "2024-01-01T10:10:00.000Z"
  }
]`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Receipt Statuses */}
      <Card>
        <CardHeader>
          <CardTitle>Статусы чеков</CardTitle>
          <CardDescription>
            Описание полей статуса чека
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Поля статуса</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <code className="bg-gray-100 px-1 rounded">isChecked</code> - 
                  <span className="text-gray-600 ml-2">Чек был проверен администратором</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-1 rounded">isFake</code> - 
                  <span className="text-gray-600 ml-2">Чек помечен как поддельный</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-1 rounded">isAuto</code> - 
                  <span className="text-gray-600 ml-2">Чек был загружен автоматически системой</span>
                </div>
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4 text-[#006039]" />
              <AlertDescription>
                Если чек помечен как <code className="bg-gray-100 px-1 rounded">isFake = true</code>, 
                транзакция может быть переведена в статус спора.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
      </MerchantLayout>
    </MerchantProtectedRoute>
  )
}