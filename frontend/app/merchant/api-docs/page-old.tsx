'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Play, Code, FileText, AlertCircle, Check } from 'lucide-react'
import { useMerchantAuth } from '@/stores/merchant-auth'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown } from 'lucide-react'

type ApiEndpoint = {
  id: string
  method: string
  path: string
  description: string
  category: string
  parameters: Array<{
    name: string
    type: string
    required: boolean
    description: string
    example: any
    in?: string
  }>
  response: {
    example: any
  }
}

type ApiDocs = {
  baseUrl: string
  authentication: {
    type: string
    name: string
    description: string
    example: string
  }
  endpoints: ApiEndpoint[]
  webhooks: any
  errors: Record<string, string>
}

const methodColors: Record<string, string> = {
  GET: 'bg-blue-500',
  POST: 'bg-green-500',
  PUT: 'bg-yellow-500',
  PATCH: 'bg-orange-500',
  DELETE: 'bg-red-500',
}

export default function MerchantApiDocsPage() {
  const { sessionToken } = useMerchantAuth()
  const [docs, setDocs] = useState<ApiDocs | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null)
  const [testParams, setTestParams] = useState<Record<string, any>>({})
  const [testResponse, setTestResponse] = useState<any>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchDocs()
  }, [])

  const fetchDocs = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant/api-docs/endpoints`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch documentation')
      
      const data = await response.json()
      setDocs(data)
      
      // Select first endpoint by default
      if (data.endpoints.length > 0) {
        setSelectedEndpoint(data.endpoints[0])
      }
    } catch (error) {
      toast.error('Не удалось загрузить документацию')
    } finally {
      setIsLoading(false)
    }
  }

  const testEndpoint = async () => {
    if (!selectedEndpoint || !docs) return
    
    try {
      setIsTesting(true)
      
      // Build request body
      const body: any = {
        method: selectedEndpoint.method,
        path: selectedEndpoint.path,
      }
      
      // Replace path parameters
      let finalPath = selectedEndpoint.path
      selectedEndpoint.parameters
        .filter(p => p.in === 'path')
        .forEach(param => {
          finalPath = finalPath.replace(`:${param.name}`, testParams[param.name] || '')
        })
      body.path = finalPath
      
      // Add query parameters
      const queryParams = selectedEndpoint.parameters
        .filter(p => p.in === 'query' && testParams[p.name])
        .map(p => `${p.name}=${encodeURIComponent(testParams[p.name])}`)
        .join('&')
      
      if (queryParams) {
        body.path += `?${queryParams}`
      }
      
      // Add body parameters
      if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method)) {
        const bodyParams: any = {}
        selectedEndpoint.parameters
          .filter(p => !p.in || p.in === 'body')
          .forEach(param => {
            if (testParams[param.name] !== undefined) {
              bodyParams[param.name] = testParams[param.name]
            }
          })
        
        if (Object.keys(bodyParams).length > 0) {
          body.body = bodyParams
        }
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant/api-docs/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) throw new Error('Test request failed')
      
      const result = await response.json()
      setTestResponse(result)
    } catch (error) {
      toast.error('Ошибка при тестировании API')
    } finally {
      setIsTesting(false)
    }
  }

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

  const generateCurlCommand = (endpoint: ApiEndpoint) => {
    if (!docs) return ''
    
    let curl = `curl -X ${endpoint.method} \\\n`
    curl += `  "${docs.baseUrl}${endpoint.path}" \\\n`
    curl += `  -H "x-merchant-api-key: ${docs.authentication.example}" \\\n`
    curl += `  -H "Content-Type: application/json"`
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      curl += ` \\\n  -d '${JSON.stringify(endpoint.response.example, null, 2)}'`
    }
    
    return curl
  }

  const categories = ['all', ...new Set(docs?.endpoints.map(e => e.category) || [])]
  const filteredEndpoints = docs?.endpoints.filter(e => 
    selectedCategory === 'all' || e.category === selectedCategory
  ) || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96" />
          <div className="md:col-span-2">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  if (!docs) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">API Документация</h1>
        <p className="text-gray-600 mt-2">
          Полное руководство по интеграции с API мерчанта
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>API Ключ:</strong> Используйте заголовок <code className="bg-gray-100 px-1 rounded">x-merchant-api-key</code> для аутентификации.
          Ваш ключ: <code className="bg-gray-100 px-1 rounded">{docs.authentication.example}</code>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-6 px-2"
            onClick={() => copyToClipboard(docs.authentication.example, 'api-key')}
          >
            {copiedId === 'api-key' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Endpoints List */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Методы API</CardTitle>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'Все категории' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredEndpoints.map(endpoint => (
                <button
                  key={endpoint.id}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedEndpoint?.id === endpoint.id ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedEndpoint(endpoint)
                    setTestParams({})
                    setTestResponse(null)
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      className={`${methodColors[endpoint.method]} text-white`}
                      variant="secondary"
                    >
                      {endpoint.method}
                    </Badge>
                    <span className="text-xs text-gray-500">{endpoint.category}</span>
                  </div>
                  <div className="text-sm font-mono">{endpoint.path}</div>
                  <div className="text-xs text-gray-600 mt-1">{endpoint.description}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Endpoint Details */}
        {selectedEndpoint && (
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Badge 
                        className={`${methodColors[selectedEndpoint.method]} text-white`}
                        variant="secondary"
                      >
                        {selectedEndpoint.method}
                      </Badge>
                      {selectedEndpoint.path}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {selectedEndpoint.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="docs" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="docs">
                      <FileText className="h-4 w-4 mr-2" />
                      Документация
                    </TabsTrigger>
                    <TabsTrigger value="test">
                      <Play className="h-4 w-4 mr-2" />
                      Тестирование
                    </TabsTrigger>
                    <TabsTrigger value="code">
                      <Code className="h-4 w-4 mr-2" />
                      Примеры кода
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="docs" className="space-y-4">
                    {/* Parameters */}
                    {selectedEndpoint.parameters.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Параметры</h3>
                        <div className="space-y-2">
                          {selectedEndpoint.parameters.map(param => (
                            <div key={param.name} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                    {param.name}
                                  </code>
                                  <Badge variant={param.required ? 'destructive' : 'secondary'}>
                                    {param.required ? 'Обязательный' : 'Опциональный'}
                                  </Badge>
                                  <Badge variant="outline">{param.type}</Badge>
                                  {param.in && (
                                    <Badge variant="outline">{param.in}</Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mt-2">{param.description}</p>
                              {param.example !== undefined && (
                                <div className="mt-2">
                                  <span className="text-xs text-gray-500">Пример: </span>
                                  <code className="text-xs bg-gray-100 px-1 rounded">
                                    {JSON.stringify(param.example)}
                                  </code>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response Example */}
                    <div>
                      <h3 className="font-semibold mb-3">Пример ответа</h3>
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm">
                          {JSON.stringify(selectedEndpoint.response.example, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="test" className="space-y-4">
                    {/* Test Parameters */}
                    {selectedEndpoint.parameters.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Параметры запроса</h3>
                        <div className="space-y-3">
                          {selectedEndpoint.parameters.map(param => (
                            <div key={param.name}>
                              <Label htmlFor={param.name}>
                                {param.name}
                                {param.required && <span className="text-red-500 ml-1">*</span>}
                                <span className="text-xs text-gray-500 ml-2">({param.type})</span>
                              </Label>
                              <Input
                                id={param.name}
                                placeholder={param.example?.toString() || param.description}
                                value={testParams[param.name] || ''}
                                onChange={(e) => setTestParams({
                                  ...testParams,
                                  [param.name]: param.type === 'number' 
                                    ? Number(e.target.value) 
                                    : e.target.value
                                })}
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={testEndpoint} 
                      disabled={isTesting}
                      className="w-full"
                    >
                      {isTesting ? (
                        <>Выполняется...</>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Выполнить запрос
                        </>
                      )}
                    </Button>

                    {/* Test Response */}
                    {testResponse && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-3">Запрос</h3>
                          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                            <pre className="text-sm">
{`${testResponse.request.method} ${testResponse.request.url}

Headers:
${JSON.stringify(testResponse.request.headers, null, 2)}
${testResponse.request.body ? `\nBody:\n${JSON.stringify(testResponse.request.body, null, 2)}` : ''}`}
                            </pre>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-3">
                            Ответ
                            <Badge 
                              className="ml-2"
                              variant={testResponse.response.status < 400 ? 'default' : 'destructive'}
                            >
                              {testResponse.response.status} {testResponse.response.statusText}
                            </Badge>
                          </h3>
                          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                            <pre className="text-sm">
                              {JSON.stringify(testResponse.response.body, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="code" className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">cURL</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generateCurlCommand(selectedEndpoint), 'curl')}
                        >
                          {copiedId === 'curl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm">{generateCurlCommand(selectedEndpoint)}</pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">JavaScript (Fetch)</h3>
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm">{`const response = await fetch("${docs.baseUrl}${selectedEndpoint.path}", {
  method: "${selectedEndpoint.method}",
  headers: {
    "x-merchant-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }${['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) ? `,
  body: JSON.stringify(${JSON.stringify(selectedEndpoint.response.example, null, 4).replace(/\n/g, '\n  ')})` : ''}
});

const data = await response.json();
console.log(data);`}</pre>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Errors Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Коды ошибок</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(docs.errors).map(([code, description]) => (
                    <div key={code} className="flex items-start gap-3">
                      <Badge variant="outline">{code}</Badge>
                      <span className="text-sm text-gray-600">{description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}