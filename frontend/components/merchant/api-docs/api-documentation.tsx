"use client";

import { useState } from "react";
import * as React from "react";
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
  ExternalLink,
  Loader2
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
  // Общие
  { method: "GET", path: "/api/merchant/connect", category: "general", description: "Информация о мерчанте", headers: { "x-merchant-api-key": "API_KEY" }, responses: [{ status: 200, description: "OK", example: { id: "m1", name: "Shop" } }] },
  { method: "GET", path: "/api/merchant/balance", category: "general", description: "Текущий баланс", headers: { "x-merchant-api-key": "API_KEY" }, responses: [{ status: 200, description: "OK", example: { balance: 0 } }] },
  { method: "GET", path: "/api/merchant/methods", category: "general", description: "Доступные методы", headers: { "x-merchant-api-key": "API_KEY" }, responses: [{ status: 200, description: "OK", example: [] }] },
  { method: "GET", path: "/api/merchant/enums", category: "general", description: "Enum значения", headers: { "x-merchant-api-key": "API_KEY" }, responses: [{ status: 200, description: "OK", example: {} }] },
  { method: "GET", path: "/api/merchant/traders/stats", category: "general", description: "Статистика трейдеров", headers: { "x-merchant-api-key": "API_KEY" }, responses: [{ status: 200, description: "OK", example: { success: true } }] },

  // Транзакции
  { 
    method: "POST", 
    path: "/api/merchant/transactions/in", 
    category: "transactions", 
    description: "Создание входящей транзакции (IN) с автоматическим подбором реквизита", 
    headers: { "x-merchant-api-key": "API_KEY" }, 
    body: [
      { name: "amount", type: "number", required: true, description: "Сумма транзакции в рублях" },
      { name: "orderId", type: "string", required: true, description: "Уникальный ID заказа от мерчанта" },
      { name: "methodId", type: "string", required: true, description: "ID метода платежа" },
      { name: "rate", type: "number", required: true, description: "Курс USDT/RUB" },
      { name: "expired_at", type: "string", required: true, description: "ISO дата истечения транзакции" },
      { name: "userIp", type: "string", required: false, description: "IP адрес пользователя" },
      { name: "callbackUri", type: "string", required: false, description: "URL для callback уведомлений" }
    ], 
    responses: [{ status: 201, description: "Успешно создана IN транзакция", example: { id: "tx123", numericId: 1001, amount: 1000, status: "IN_PROGRESS", requisites: { cardNumber: "4111111111111111" } } }] 
  },
  { 
    method: "POST", 
    path: "/api/merchant/transactions/out", 
    category: "transactions", 
    description: "Создание исходящей транзакции (OUT)", 
    headers: { "x-merchant-api-key": "API_KEY" }, 
    body: [
      { name: "amount", type: "number", required: true, description: "Сумма транзакции в рублях" },
      { name: "orderId", type: "string", required: true, description: "Уникальный ID заказа от мерчанта" },
      { name: "methodId", type: "string", required: true, description: "ID метода платежа" },
      { name: "rate", type: "number", required: true, description: "Курс USDT/RUB" },
      { name: "expired_at", type: "string", required: true, description: "ISO дата истечения транзакции" },
      { name: "userIp", type: "string", required: false, description: "IP адрес пользователя" },
      { name: "callbackUri", type: "string", required: false, description: "URL для callback уведомлений" }
    ], 
    responses: [{ status: 201, description: "Успешно создана OUT транзакция", example: { id: "tx123", numericId: 1001, amount: 1000, status: "IN_PROGRESS", requisites: null } }] 
  },
  { method: "GET", path: "/api/merchant/transactions/list", category: "transactions", description: "Список транзакций", headers: { "x-merchant-api-key": "API_KEY" }, params: [{ name: "page", type: "number", required: false, description: "Страница" }], responses: [{ status: 200, description: "OK", example: { data: [] } }] },
  { method: "GET", path: "/api/merchant/transactions/by-order-id/:orderId", category: "transactions", description: "Транзакция по orderId", headers: { "x-merchant-api-key": "API_KEY" }, params: [{ name: "orderId", type: "string", required: true, description: "ID заказа" }], responses: [{ status: 200, description: "OK", example: { id: "tx" } }] },
  { method: "PATCH", path: "/api/merchant/transactions/by-order-id/:orderId/cancel", category: "transactions", description: "Отмена транзакции", headers: { "x-merchant-api-key": "API_KEY" }, params: [{ name: "orderId", type: "string", required: true, description: "ID заказа" }], responses: [{ status: 200, description: "OK", example: { success: true } }] },
  { method: "GET", path: "/api/merchant/transactions/status/:id", category: "transactions", description: "Статус транзакции", headers: { "x-merchant-api-key": "API_KEY" }, params: [{ name: "id", type: "string", required: true, description: "ID" }], responses: [{ status: 200, description: "OK", example: { status: "READY" } }] },
  { method: "POST", path: "/api/merchant/transactions/:id/receipt", category: "transactions", description: "Загрузка чека", headers: { "x-merchant-api-key": "API_KEY" }, params: [{ name: "id", type: "string", required: true, description: "ID" }], body: [{ name: "fileData", type: "string", required: true, description: "base64" }], responses: [{ status: 201, description: "OK", example: { id: "r" } }] },
  { method: "GET", path: "/api/merchant/transactions/:id/receipts", category: "transactions", description: "Получение чеков", headers: { "x-merchant-api-key": "API_KEY" }, params: [{ name: "id", type: "string", required: true, description: "ID" }], responses: [{ status: 200, description: "OK", example: [] }] },

  // Выплаты
  { method: "POST", path: "/api/merchant/payouts", category: "payouts", description: "Создать выплату", headers: { "x-api-key": "API_KEY" }, body: [{ name: "amount", type: "number", required: true, description: "Сумма" }], responses: [{ status: 200, description: "OK", example: { success: true } }] },
  { method: "GET", path: "/api/merchant/payouts/:id", category: "payouts", description: "Получить выплату", headers: { "x-api-key": "API_KEY" }, params: [{ name: "id", type: "string", required: true, description: "ID" }], responses: [{ status: 200, description: "OK", example: { success: true } }] },
  { method: "POST", path: "/api/merchant/payouts/:id/approve", category: "payouts", description: "Подтвердить выплату", headers: { "x-api-key": "API_KEY" }, params: [{ name: "id", type: "string", required: true, description: "ID" }], responses: [{ status: 200, description: "OK", example: { success: true } }] },
  { method: "POST", path: "/api/merchant/payouts/:id/dispute", category: "payouts", description: "Создать спор по выплате", headers: { "x-api-key": "API_KEY" }, params: [{ name: "id", type: "string", required: true, description: "ID" }], body: [{ name: "message", type: "string", required: true, description: "Сообщение" }], responses: [{ status: 200, description: "OK", example: { success: true } }] },
  { method: "PATCH", path: "/api/merchant/payouts/:id/cancel", category: "payouts", description: "Отмена выплаты", headers: { "x-api-key": "API_KEY" }, params: [{ name: "id", type: "string", required: true, description: "ID" }], body: [{ name: "reasonCode", type: "string", required: true, description: "Причина" }], responses: [{ status: 200, description: "OK", example: { success: true } }] },
  { method: "PATCH", path: "/api/merchant/payouts/:id/rate", category: "payouts", description: "Изменить курс", headers: { "x-api-key": "API_KEY" }, params: [{ name: "id", type: "string", required: true, description: "ID" }], body: [{ name: "merchantRate", type: "number", required: false, description: "Курс" }], responses: [{ status: 200, description: "OK", example: { success: true } }] },
  { method: "GET", path: "/api/merchant/payouts", category: "payouts", description: "Список выплат", headers: { "x-api-key": "API_KEY" }, params: [{ name: "page", type: "number", required: false, description: "Страница" }], responses: [{ status: 200, description: "OK", example: { data: [] } }] },

  // Споры по выплатам
  { method: "POST", path: "/api/merchant/disputes/payout/:payoutId", category: "disputes", description: "Создать спор по выплате", headers: { Authorization: "Bearer" }, params: [{ name: "payoutId", type: "string", required: true, description: "ID" }], body: [{ name: "message", type: "string", required: true, description: "Сообщение" }], responses: [{ status: 200, description: "OK", example: { success: true } }] },
  { method: "GET", path: "/api/merchant/disputes", category: "disputes", description: "Список споров", headers: { Authorization: "Bearer" }, params: [{ name: "page", type: "number", required: false, description: "Страница" }], responses: [{ status: 200, description: "OK", example: { data: [] } }] },
  { method: "GET", path: "/api/merchant/disputes/:disputeId", category: "disputes", description: "Получить спор", headers: { Authorization: "Bearer" }, params: [{ name: "disputeId", type: "string", required: true, description: "ID" }], responses: [{ status: 200, description: "OK", example: { data: {} } }] },
  { method: "POST", path: "/api/merchant/disputes/:disputeId/messages", category: "disputes", description: "Сообщение в споре", headers: { Authorization: "Bearer" }, params: [{ name: "disputeId", type: "string", required: true, description: "ID" }], body: [{ name: "message", type: "string", required: true, description: "Сообщение" }], responses: [{ status: 200, description: "OK", example: { success: true } }] },

  // Споры по сделкам
  { method: "GET", path: "/api/merchant/deal-disputes/test", category: "deal-disputes", description: "Тест" , headers: { Authorization: "Bearer" }, responses: [{ status: 200, description: "OK", example: { message: "Deal disputes routes are working!" } }] },
  { method: "POST", path: "/api/merchant/deal-disputes/deal/:dealId", category: "deal-disputes", description: "Создать спор по сделке", headers: { Authorization: "Bearer" }, params: [{ name: "dealId", type: "string", required: true, description: "ID" }], body: [{ name: "message", type: "string", required: true, description: "Сообщение" }], responses: [{ status: 200, description: "OK", example: { success: true } }] },
  { method: "GET", path: "/api/merchant/deal-disputes", category: "deal-disputes", description: "Список споров по сделкам", headers: { Authorization: "Bearer" }, params: [{ name: "page", type: "number", required: false, description: "Страница" }], responses: [{ status: 200, description: "OK", example: { data: [] } }] },
  { method: "GET", path: "/api/merchant/deal-disputes/:disputeId", category: "deal-disputes", description: "Получить спор по сделке", headers: { Authorization: "Bearer" }, params: [{ name: "disputeId", type: "string", required: true, description: "ID" }], responses: [{ status: 200, description: "OK", example: { data: {} } }] },
  { method: "POST", path: "/api/merchant/deal-disputes/:disputeId/messages", category: "deal-disputes", description: "Сообщение в споре по сделке", headers: { Authorization: "Bearer" }, params: [{ name: "disputeId", type: "string", required: true, description: "ID" }], body: [{ name: "message", type: "string", required: true, description: "Сообщение" }], responses: [{ status: 200, description: "OK", example: { success: true } }] },

];

const CATEGORIES = [
  { id: "general", name: "Общие", icon: Server },
  { id: "transactions", name: "Транзакции", icon: CreditCard },
  { id: "payouts", name: "Выплаты", icon: DollarSign },
  { id: "disputes", name: "Споры", icon: AlertCircle },
  { id: "deal-disputes", name: "Споры по сделкам", icon: AlertCircle }
];

export function ApiDocumentation() {
  const { merchant, token } = useMerchantAuth();
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testParams, setTestParams] = useState<Record<string, any>>({});
  const [testBody, setTestBody] = useState<string>("{}");
  const [testResponse, setTestResponse] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>("");

  // Set base URL based on environment
  React.useEffect(() => {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      setBaseUrl("http://localhost:3000");
    } else {
      setBaseUrl(`https://${host}`);
    }
  }, []);

  const filteredEndpoints = API_ENDPOINTS.filter(e => e.category === selectedCategory);

  // Generate random test data
  const generateRandomData = (endpoint: ApiEndpoint) => {
    const data: Record<string, any> = {};
    
    if (endpoint.body) {
      endpoint.body.forEach(field => {
        switch (field.name) {
          case "amount":
            data[field.name] = Math.floor(Math.random() * 10000) + 100;
            break;
          case "orderId":
            data[field.name] = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            break;
          case "methodId":
            data[field.name] = "method_1"; // This should be replaced with actual method ID
            break;
          case "rate":
            data[field.name] = 95.5 + Math.random() * 5;
            break;
          case "expired_at":
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 24);
            data[field.name] = futureDate.toISOString();
            break;
          case "userIp":
            data[field.name] = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
            break;
          case "userId":
            data[field.name] = `user_${Math.random().toString(36).substr(2, 9)}`;
            break;
          case "type":
            data[field.name] = Math.random() > 0.5 ? "IN" : "OUT";
            break;
          case "callbackUri":
          case "successUri":
          case "failUri":
            data[field.name] = `https://example.com/${field.name.replace("Uri", "")}`;
            break;
          case "message":
          case "reason":
            data[field.name] = "Тестовое сообщение";
            break;
          case "token":
            data[field.name] = token || "your-api-token-here";
            break;
          case "reasonCode":
            data[field.name] = "MERCHANT_REQUEST";
            break;
          case "merchantRate":
            data[field.name] = 95.5 + Math.random() * 5;
            break;
          case "fileData":
            data[field.name] = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
            break;
          default:
            data[field.name] = field.example || `test_${field.name}`;
        }
      });
    }
    
    return JSON.stringify(data, null, 2);
  };

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
      let url = `${baseUrl}${endpoint.path}`;
      
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

      // Автоматически подставляем API токен мерчанта
      if (headers["x-merchant-api-key"]) {
        headers["x-merchant-api-key"] = token || "YOUR_API_KEY_HERE";
      }
      if (headers["x-api-key"]) {
        headers["x-api-key"] = token || "YOUR_API_KEY_HERE";
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
    <div className="py-6 space-y-6">
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
                {baseUrl}
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => copyToClipboard(baseUrl, "base-url")}
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
            <p className="text-xs text-muted-foreground mb-2">
              Используйте заголовок <code>x-merchant-api-key</code>
            </p>
            {token && (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                  {token}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(token, "api-key")}
                >
                  {copied === "api-key" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}
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
                      onClick={() => {
                        setSelectedEndpoint(endpoint);
                        setTestParams({});
                        if (["POST", "PUT", "PATCH"].includes(endpoint.method)) {
                          setTestBody(generateRandomData(endpoint));
                        } else {
                          setTestBody("{}");
                        }
                      }}
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
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="test-body">Тело запроса (JSON)</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTestBody(generateRandomData(selectedEndpoint))}
                          >
                            <Zap className="mr-2 h-3 w-3" />
                            Сгенерировать данные
                          </Button>
                        </div>
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