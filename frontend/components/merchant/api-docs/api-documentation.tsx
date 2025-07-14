"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Copy, 
  Play, 
  Code, 
  FileJson,
  Key,
  AlertCircle,
  Check,
  ChevronRight,
  Server,
  Shield,
  Zap,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Link,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMerchantAuth } from "@/stores/merchant-auth";

interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  category: string;
  headers?: Record<string, string>;
  params?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
  }[];
  body?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
  }[];
  responses: {
    status: number;
    description: string;
    example: any;
  }[];
}

const API_ENDPOINTS: ApiEndpoint[] = [
  // Authentication
  {
    method: "POST",
    path: "/api/merchant/auth",
    category: "auth",
    description: "Аутентификация мерчанта и получение API ключа",
    body: [
      {
        name: "email",
        type: "string",
        required: true,
        description: "Email мерчанта",
        example: "merchant@example.com"
      },
      {
        name: "password",
        type: "string",
        required: true,
        description: "Пароль мерчанта",
        example: "password123"
      }
    ],
    responses: [
      {
        status: 200,
        description: "Успешная аутентификация",
        example: {
          success: true,
          merchant: {
            id: "123",
            name: "Test Merchant",
            email: "merchant@example.com",
            apiKey: "mk_live_abcdef123456",
            webhookUrl: "https://example.com/webhook"
          }
        }
      }
    ]
  },

  // Transactions
  {
    method: "POST",
    path: "/api/merchant/transactions",
    category: "transactions",
    description: "Создание новой транзакции для приема платежа",
    headers: {
      "x-merchant-api-key": "YOUR_API_KEY"
    },
    body: [
      {
        name: "amount",
        type: "number",
        required: true,
        description: "Сумма платежа в рублях",
        example: 1000
      },
      {
        name: "orderId",
        type: "string",
        required: true,
        description: "Уникальный ID заказа в вашей системе",
        example: "ORDER-123"
      },
      {
        name: "customerEmail",
        type: "string",
        required: false,
        description: "Email клиента для уведомлений",
        example: "customer@example.com"
      },
      {
        name: "description",
        type: "string",
        required: false,
        description: "Описание платежа",
        example: "Оплата заказа #123"
      },
      {
        name: "methodId",
        type: "string",
        required: false,
        description: "ID конкретного метода оплаты",
        example: "method_123"
      },
      {
        name: "callbackUrl",
        type: "string",
        required: false,
        description: "URL для редиректа после оплаты",
        example: "https://example.com/success"
      }
    ],
    responses: [
      {
        status: 200,
        description: "Транзакция создана успешно",
        example: {
          success: true,
          transaction: {
            id: "tx_123",
            numericId: 10001,
            amount: 1000,
            status: "CREATED",
            paymentUrl: "https://pay.example.com/tx_123",
            expiresAt: "2024-01-01T12:00:00Z"
          }
        }
      }
    ]
  },

  {
    method: "GET",
    path: "/api/merchant/transactions/:id",
    category: "transactions",
    description: "Получение информации о транзакции",
    headers: {
      "x-merchant-api-key": "YOUR_API_KEY"
    },
    params: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "ID транзакции",
        example: "tx_123"
      }
    ],
    responses: [
      {
        status: 200,
        description: "Информация о транзакции",
        example: {
          success: true,
          transaction: {
            id: "tx_123",
            numericId: 10001,
            amount: 1000,
            status: "READY",
            orderId: "ORDER-123",
            createdAt: "2024-01-01T10:00:00Z",
            completedAt: "2024-01-01T10:05:00Z",
            method: {
              name: "Сбербанк",
              type: "CARD"
            }
          }
        }
      }
    ]
  },

  {
    method: "GET",
    path: "/api/merchant/transactions",
    category: "transactions",
    description: "Получение списка транзакций с фильтрацией",
    headers: {
      "x-merchant-api-key": "YOUR_API_KEY"
    },
    params: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "Номер страницы (по умолчанию 1)",
        example: 1
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "Количество записей на странице (по умолчанию 20)",
        example: 20
      },
      {
        name: "status",
        type: "string",
        required: false,
        description: "Фильтр по статусу: CREATED, IN_PROGRESS, READY, EXPIRED, CANCELED",
        example: "READY"
      },
      {
        name: "from",
        type: "string",
        required: false,
        description: "Дата начала периода (ISO 8601)",
        example: "2024-01-01T00:00:00Z"
      },
      {
        name: "to",
        type: "string",
        required: false,
        description: "Дата конца периода (ISO 8601)",
        example: "2024-01-31T23:59:59Z"
      }
    ],
    responses: [
      {
        status: 200,
        description: "Список транзакций",
        example: {
          success: true,
          transactions: [
            {
              id: "tx_123",
              numericId: 10001,
              amount: 1000,
              status: "READY",
              orderId: "ORDER-123",
              createdAt: "2024-01-01T10:00:00Z"
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 100,
            totalPages: 5
          }
        }
      }
    ]
  },

  // Methods
  {
    method: "GET",
    path: "/api/merchant/methods",
    category: "methods",
    description: "Получение доступных методов оплаты",
    headers: {
      "x-merchant-api-key": "YOUR_API_KEY"
    },
    responses: [
      {
        status: 200,
        description: "Список методов оплаты",
        example: {
          success: true,
          methods: [
            {
              id: "method_123",
              name: "Сбербанк",
              type: "CARD",
              minAmount: 100,
              maxAmount: 100000,
              commission: 2.5,
              isActive: true
            }
          ]
        }
      }
    ]
  },

  // Balance
  {
    method: "GET",
    path: "/api/merchant/balance",
    category: "balance",
    description: "Получение текущего баланса",
    headers: {
      "x-merchant-api-key": "YOUR_API_KEY"
    },
    responses: [
      {
        status: 200,
        description: "Информация о балансе",
        example: {
          success: true,
          balance: {
            available: 50000,
            pending: 5000,
            frozen: 0,
            currency: "RUB"
          }
        }
      }
    ]
  },

  // Webhooks
  {
    method: "POST",
    path: "/api/merchant/webhook/test",
    category: "webhooks",
    description: "Тестирование webhook уведомлений",
    headers: {
      "x-merchant-api-key": "YOUR_API_KEY"
    },
    body: [
      {
        name: "url",
        type: "string",
        required: true,
        description: "URL для тестового webhook",
        example: "https://example.com/webhook"
      }
    ],
    responses: [
      {
        status: 200,
        description: "Webhook отправлен успешно",
        example: {
          success: true,
          message: "Test webhook sent successfully"
        }
      }
    ]
  },

  // Disputes
  {
    method: "GET",
    path: "/api/merchant/disputes",
    category: "disputes",
    description: "Получение списка споров",
    headers: {
      "x-merchant-api-key": "YOUR_API_KEY"
    },
    params: [
      {
        name: "status",
        type: "string",
        required: false,
        description: "Фильтр по статусу: OPEN, IN_PROGRESS, RESOLVED_SUCCESS, RESOLVED_FAIL",
        example: "OPEN"
      }
    ],
    responses: [
      {
        status: 200,
        description: "Список споров",
        example: {
          success: true,
          disputes: [
            {
              id: "dispute_123",
              transactionId: "tx_123",
              status: "OPEN",
              reason: "Платеж не получен",
              createdAt: "2024-01-01T12:00:00Z"
            }
          ]
        }
      }
    ]
  }
];

const CATEGORIES = [
  { id: "auth", name: "Аутентификация", icon: Key },
  { id: "transactions", name: "Транзакции", icon: CreditCard },
  { id: "methods", name: "Методы оплаты", icon: Zap },
  { id: "balance", name: "Баланс", icon: DollarSign },
  { id: "webhooks", name: "Webhooks", icon: Link },
  { id: "disputes", name: "Споры", icon: AlertCircle }
];

export function ApiDocumentation() {
  const { merchant } = useMerchantAuth();
  const [selectedCategory, setSelectedCategory] = useState("auth");
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testParams, setTestParams] = useState<Record<string, any>>({});
  const [testBody, setTestBody] = useState<string>("{}");
  const [testResponse, setTestResponse] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const filteredEndpoints = API_ENDPOINTS.filter(e => e.category === selectedCategory);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Скопировано в буфер обмена");
    setTimeout(() => setCopied(null), 2000);
  };

  const testEndpoint = async (endpoint: ApiEndpoint) => {
    try {
      setTestingEndpoint(endpoint.path);
      setTestResponse(null);

      // Build URL
      let url = `http://localhost:3000${endpoint.path}`;
      
      // Replace path params
      if (endpoint.params) {
        endpoint.params.forEach(param => {
          if (param.name in testParams) {
            url = url.replace(`:${param.name}`, testParams[param.name]);
          }
        });
      }

      // Add query params
      const queryParams = endpoint.params?.filter(p => !endpoint.path.includes(`:${p.name}`)) || [];
      if (queryParams.length > 0) {
        const query = new URLSearchParams();
        queryParams.forEach(param => {
          if (param.name in testParams && testParams[param.name]) {
            query.append(param.name, testParams[param.name]);
          }
        });
        const queryString = query.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      // Build request
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...endpoint.headers
      };

      if (headers["x-merchant-api-key"] && merchant?.apiKey) {
        headers["x-merchant-api-key"] = merchant.apiKey;
      }

      const options: RequestInit = {
        method: endpoint.method,
        headers
      };

      if (["POST", "PUT", "PATCH"].includes(endpoint.method)) {
        try {
          options.body = JSON.stringify(JSON.parse(testBody));
        } catch {
          toast.error("Некорректный JSON в теле запроса");
          return;
        }
      }

      const response = await fetch(url, options);
      const data = await response.json();

      setTestResponse({
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries())
      });

    } catch (error: any) {
      setTestResponse({
        error: error.message || "Ошибка выполнения запроса"
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "POST": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "PUT": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "DELETE": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "PATCH": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">API Документация</h1>
        <p className="text-muted-foreground">
          Полная документация по API для интеграции с платежной системой
        </p>
      </div>

      {/* API Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Server className="h-4 w-4 mr-2 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Base URL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <code className="text-xs bg-muted px-2 py-1 rounded">
                https://api.example.com
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => copyToClipboard("https://api.example.com", "base-url")}
              >
                {copied === "base-url" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Аутентификация</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Используйте заголовок <code>x-merchant-api-key</code>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Версия API</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>v1.0</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Categories */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Категории</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;
                const count = API_ENDPOINTS.filter(e => e.category === category.id).length;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSelectedEndpoint(null);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent transition-colors",
                      selectedCategory === category.id && "bg-accent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <div className="md:col-span-3 space-y-4">
          {!selectedEndpoint ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {CATEGORIES.find(c => c.id === selectedCategory)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredEndpoints.map((endpoint) => (
                    <button
                      key={`${endpoint.method}-${endpoint.path}`}
                      onClick={() => setSelectedEndpoint(endpoint)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                    >
                      <Badge className={cn("font-mono", getMethodColor(endpoint.method))}>
                        {endpoint.method}
                      </Badge>
                      <code className="flex-1 text-sm">{endpoint.path}</code>
                      <p className="text-sm text-muted-foreground">
                        {endpoint.description}
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={cn("font-mono", getMethodColor(selectedEndpoint.method))}>
                      {selectedEndpoint.method}
                    </Badge>
                    <code className="text-lg">{selectedEndpoint.path}</code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEndpoint(null)}
                  >
                    Назад
                  </Button>
                </div>
                <CardDescription>{selectedEndpoint.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="docs">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="docs">Документация</TabsTrigger>
                    <TabsTrigger value="test">Тестирование</TabsTrigger>
                  </TabsList>

                  {/* Documentation Tab */}
                  <TabsContent value="docs" className="space-y-6">
                    {/* Headers */}
                    {selectedEndpoint.headers && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Заголовки</h3>
                        <div className="bg-muted rounded-lg p-3">
                          {Object.entries(selectedEndpoint.headers).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <code className="text-sm">
                                {key}: {value}
                              </code>
                              {key === "x-merchant-api-key" && merchant?.apiKey && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(merchant.apiKey, `header-${key}`)}
                                >
                                  {copied === `header-${key}` ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parameters */}
                    {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Параметры</h3>
                        <div className="space-y-2">
                          {selectedEndpoint.params.map((param) => (
                            <div key={param.name} className="border rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm font-medium">{param.name}</code>
                                <Badge variant={param.required ? "default" : "secondary"} className="text-xs">
                                  {param.type}
                                </Badge>
                                {param.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    обязательный
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{param.description}</p>
                              {param.example && (
                                <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                                  {JSON.stringify(param.example)}
                                </code>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Body */}
                    {selectedEndpoint.body && selectedEndpoint.body.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Тело запроса</h3>
                        <div className="space-y-2">
                          {selectedEndpoint.body.map((field) => (
                            <div key={field.name} className="border rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm font-medium">{field.name}</code>
                                <Badge variant={field.required ? "default" : "secondary"} className="text-xs">
                                  {field.type}
                                </Badge>
                                {field.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    обязательный
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{field.description}</p>
                              {field.example && (
                                <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                                  {JSON.stringify(field.example)}
                                </code>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Example body */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Пример запроса:</h4>
                          <div className="relative">
                            <pre className="bg-muted rounded-lg p-3 text-sm overflow-x-auto">
                              {JSON.stringify(
                                selectedEndpoint.body.reduce((acc, field) => {
                                  acc[field.name] = field.example || `<${field.type}>`;
                                  return acc;
                                }, {} as any),
                                null,
                                2
                              )}
                            </pre>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="absolute top-2 right-2 h-6 w-6"
                              onClick={() => copyToClipboard(
                                JSON.stringify(
                                  selectedEndpoint.body?.reduce((acc, field) => {
                                    acc[field.name] = field.example || "";
                                    return acc;
                                  }, {} as any),
                                  null,
                                  2
                                ),
                                "example-body"
                              )}
                            >
                              {copied === "example-body" ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Responses */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Ответы</h3>
                      <div className="space-y-3">
                        {selectedEndpoint.responses.map((response, idx) => (
                          <div key={idx} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={response.status < 400 ? "default" : "destructive"}>
                                {response.status}
                              </Badge>
                              <span className="text-sm">{response.description}</span>
                            </div>
                            <pre className="bg-muted rounded p-2 text-xs overflow-x-auto">
                              {JSON.stringify(response.example, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Test Tab */}
                  <TabsContent value="test" className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Тестовые запросы отправляются на реальный API. Будьте осторожны!
                      </AlertDescription>
                    </Alert>

                    {/* Test Parameters */}
                    {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Параметры</h3>
                        <div className="space-y-2">
                          {selectedEndpoint.params.map((param) => (
                            <div key={param.name}>
                              <Label htmlFor={param.name}>
                                {param.name}
                                {param.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              <Input
                                id={param.name}
                                placeholder={param.example?.toString() || param.description}
                                value={testParams[param.name] || ""}
                                onChange={(e) => setTestParams({
                                  ...testParams,
                                  [param.name]: e.target.value
                                })}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Test Body */}
                    {["POST", "PUT", "PATCH"].includes(selectedEndpoint.method) && (
                      <div>
                        <Label htmlFor="test-body">Тело запроса (JSON)</Label>
                        <Textarea
                          id="test-body"
                          className="font-mono text-sm"
                          rows={10}
                          value={testBody}
                          onChange={(e) => setTestBody(e.target.value)}
                          placeholder={JSON.stringify(
                            selectedEndpoint.body?.reduce((acc, field) => {
                              acc[field.name] = field.example || "";
                              return acc;
                            }, {} as any),
                            null,
                            2
                          )}
                        />
                      </div>
                    )}

                    {/* Test Button */}
                    <Button
                      onClick={() => testEndpoint(selectedEndpoint)}
                      disabled={testingEndpoint === selectedEndpoint.path}
                      className="w-full"
                    >
                      {testingEndpoint === selectedEndpoint.path ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Выполняется...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Выполнить запрос
                        </>
                      )}
                    </Button>

                    {/* Test Response */}
                    {testResponse && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Ответ</h3>
                        <div className="border rounded-lg p-3">
                          {testResponse.error ? (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{testResponse.error}</AlertDescription>
                            </Alert>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={testResponse.status < 400 ? "default" : "destructive"}>
                                  {testResponse.status}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {testResponse.headers["content-type"]}
                                </span>
                              </div>
                              <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">
                                {JSON.stringify(testResponse.data, null, 2)}
                              </pre>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Примеры кода</CardTitle>
          <CardDescription>
            Примеры интеграции на популярных языках программирования
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>

            <TabsContent value="curl">
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X POST https://api.example.com/api/merchant/transactions \\
  -H "Content-Type: application/json" \\
  -H "x-merchant-api-key: YOUR_API_KEY" \\
  -d '{
    "amount": 1000,
    "orderId": "ORDER-123",
    "description": "Оплата заказа #123"
  }'`}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(
                    `curl -X POST https://api.example.com/api/merchant/transactions \\
  -H "Content-Type: application/json" \\
  -H "x-merchant-api-key: YOUR_API_KEY" \\
  -d '{
    "amount": 1000,
    "orderId": "ORDER-123",
    "description": "Оплата заказа #123"
  }'`,
                    "curl-example"
                  )}
                >
                  {copied === "curl-example" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="javascript">
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`const response = await fetch('https://api.example.com/api/merchant/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-merchant-api-key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    amount: 1000,
    orderId: 'ORDER-123',
    description: 'Оплата заказа #123'
  })
});

const data = await response.json();
console.log(data);`}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(
                    `const response = await fetch('https://api.example.com/api/merchant/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-merchant-api-key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    amount: 1000,
    orderId: 'ORDER-123',
    description: 'Оплата заказа #123'
  })
});

const data = await response.json();
console.log(data);`,
                    "js-example"
                  )}
                >
                  {copied === "js-example" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="php">
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`<?php
$data = [
    'amount' => 1000,
    'orderId' => 'ORDER-123',
    'description' => 'Оплата заказа #123'
];

$ch = curl_init('https://api.example.com/api/merchant/transactions');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-merchant-api-key: YOUR_API_KEY'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
print_r($result);`}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(
                    `<?php
$data = [
    'amount' => 1000,
    'orderId' => 'ORDER-123',
    'description' => 'Оплата заказа #123'
];

$ch = curl_init('https://api.example.com/api/merchant/transactions');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-merchant-api-key: YOUR_API_KEY'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
print_r($result);`,
                    "php-example"
                  )}
                >
                  {copied === "php-example" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="python">
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`import requests
import json

url = 'https://api.example.com/api/merchant/transactions'
headers = {
    'Content-Type': 'application/json',
    'x-merchant-api-key': 'YOUR_API_KEY'
}
data = {
    'amount': 1000,
    'orderId': 'ORDER-123',
    'description': 'Оплата заказа #123'
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result)`}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(
                    `import requests
import json

url = 'https://api.example.com/api/merchant/transactions'
headers = {
    'Content-Type': 'application/json',
    'x-merchant-api-key': 'YOUR_API_KEY'
}
data = {
    'amount': 1000,
    'orderId': 'ORDER-123',
    'description': 'Оплата заказа #123'
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result)`,
                    "python-example"
                  )}
                >
                  {copied === "python-example" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}