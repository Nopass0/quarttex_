'use client'

import { useState } from 'react'
import { MerchantProtectedRoute } from '@/components/auth/merchant-protected-route'
import { MerchantLayout } from '@/components/layouts/merchant-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Check } from 'lucide-react'
import { useMerchantAuth } from '@/stores/merchant-auth'
import { toast } from 'sonner'

export default function ExamplesApiDocsPage() {
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
            <h1 className="text-3xl font-bold text-gray-900">Примеры интеграции</h1>
            <p className="text-gray-600 mt-2">
              Готовые примеры кода для быстрой интеграции с API
            </p>
          </div>

      {/* Complete Payment Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Полный процесс оплаты</CardTitle>
          <CardDescription>
            Пример создания транзакции и отслеживания её статуса
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="nodejs">
            <TabsList>
              <TabsTrigger value="nodejs">Node.js</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
            </TabsList>

            <TabsContent value="nodejs" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const axios = require('axios')

class PaymentClient {
  constructor(apiKey, baseUrl = '${baseUrl}') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async createPayment(amount, orderId) {
    try {
      // 1. Получаем доступные методы
      const methods = await this.getMethods()
      const sbpMethod = methods.find(m => m.code === 'sbp')
      
      if (!sbpMethod) {
        throw new Error('SBP method not available')
      }

      // 2. Создаем транзакцию
      const transaction = await axios.post(
        \`\${this.baseUrl}/api/merchant/transactions/create\`,
        {
          amount,
          orderId,
          methodId: sbpMethod.id,
          rate: 95.5, // Получите актуальный курс из вашей системы
          expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 минут
          type: 'IN',
          callbackUri: 'https://yourdomain.com/webhook/payment'
        },
        {
          headers: {
            'x-merchant-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      )

      return {
        transactionId: transaction.data.id,
        paymentUrl: \`https://payment.system/pay/\${transaction.data.id}\`,
        requisites: transaction.data.requisites,
        amount: transaction.data.amount,
        crypto: transaction.data.crypto,
        expiresAt: transaction.data.expired_at
      }
    } catch (error) {
      console.error('Payment creation error:', error.response?.data || error.message)
      throw error
    }
  }

  async checkPaymentStatus(transactionId) {
    try {
      const response = await axios.get(
        \`\${this.baseUrl}/api/merchant/transactions/status/\${transactionId}\`,
        {
          headers: {
            'x-merchant-api-key': this.apiKey
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('Status check error:', error.response?.data || error.message)
      throw error
    }
  }

  async getMethods() {
    try {
      const response = await axios.get(
        \`\${this.baseUrl}/api/merchant/methods\`,
        {
          headers: {
            'x-merchant-api-key': this.apiKey
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('Get methods error:', error.response?.data || error.message)
      throw error
    }
  }

  async cancelPayment(orderId) {
    try {
      const response = await axios.patch(
        \`\${this.baseUrl}/api/merchant/transactions/by-order-id/\${orderId}/cancel\`,
        {},
        {
          headers: {
            'x-merchant-api-key': this.apiKey
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('Cancel payment error:', error.response?.data || error.message)
      throw error
    }
  }
}

// Использование
async function processOrder(orderData) {
  const client = new PaymentClient('${apiKey}')
  
  try {
    // Создаем платеж
    const payment = await client.createPayment(
      orderData.amount,
      orderData.orderId
    )
    
    console.log('Payment created:', payment)
    
    // Отправляем пользователя на страницу оплаты
    // redirect(payment.paymentUrl)
    
    // Проверяем статус через 5 минут (в реальности используйте webhooks)
    setTimeout(async () => {
      const status = await client.checkPaymentStatus(payment.transactionId)
      console.log('Payment status:', status)
      
      if (status.status === 'READY') {
        console.log('Payment successful!')
      } else if (status.status === 'EXPIRED') {
        console.log('Payment expired')
      }
    }, 5 * 60 * 1000)
    
  } catch (error) {
    console.error('Payment error:', error)
    // Обработка ошибки
  }
}

// Запуск примера
processOrder({
  amount: 5000,
  orderId: 'ORDER-' + Date.now()
})`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const axios = require('axios')

class PaymentClient {
  constructor(apiKey, baseUrl = '${baseUrl}') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async createPayment(amount, orderId) {
    try {
      // 1. Получаем доступные методы
      const methods = await this.getMethods()
      const sbpMethod = methods.find(m => m.code === 'sbp')
      
      if (!sbpMethod) {
        throw new Error('SBP method not available')
      }

      // 2. Создаем транзакцию
      const transaction = await axios.post(
        \`\${this.baseUrl}/api/merchant/transactions/create\`,
        {
          amount,
          orderId,
          methodId: sbpMethod.id,
          rate: 95.5, // Получите актуальный курс из вашей системы
          expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 минут
          type: 'IN',
          callbackUri: 'https://yourdomain.com/webhook/payment'
        },
        {
          headers: {
            'x-merchant-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      )

      return {
        transactionId: transaction.data.id,
        paymentUrl: \`https://payment.system/pay/\${transaction.data.id}\`,
        requisites: transaction.data.requisites,
        amount: transaction.data.amount,
        crypto: transaction.data.crypto,
        expiresAt: transaction.data.expired_at
      }
    } catch (error) {
      console.error('Payment creation error:', error.response?.data || error.message)
      throw error
    }
  }

  async checkPaymentStatus(transactionId) {
    try {
      const response = await axios.get(
        \`\${this.baseUrl}/api/merchant/transactions/status/\${transactionId}\`,
        {
          headers: {
            'x-merchant-api-key': this.apiKey
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('Status check error:', error.response?.data || error.message)
      throw error
    }
  }

  async getMethods() {
    try {
      const response = await axios.get(
        \`\${this.baseUrl}/api/merchant/methods\`,
        {
          headers: {
            'x-merchant-api-key': this.apiKey
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('Get methods error:', error.response?.data || error.message)
      throw error
    }
  }

  async cancelPayment(orderId) {
    try {
      const response = await axios.patch(
        \`\${this.baseUrl}/api/merchant/transactions/by-order-id/\${orderId}/cancel\`,
        {},
        {
          headers: {
            'x-merchant-api-key': this.apiKey
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('Cancel payment error:', error.response?.data || error.message)
      throw error
    }
  }
}

// Использование
async function processOrder(orderData) {
  const client = new PaymentClient('${apiKey}')
  
  try {
    // Создаем платеж
    const payment = await client.createPayment(
      orderData.amount,
      orderData.orderId
    )
    
    console.log('Payment created:', payment)
    
    // Отправляем пользователя на страницу оплаты
    // redirect(payment.paymentUrl)
    
    // Проверяем статус через 5 минут (в реальности используйте webhooks)
    setTimeout(async () => {
      const status = await client.checkPaymentStatus(payment.transactionId)
      console.log('Payment status:', status)
      
      if (status.status === 'READY') {
        console.log('Payment successful!')
      } else if (status.status === 'EXPIRED') {
        console.log('Payment expired')
      }
    }, 5 * 60 * 1000)
    
  } catch (error) {
    console.error('Payment error:', error)
    // Обработка ошибки
  }
}

// Запуск примера
processOrder({
  amount: 5000,
  orderId: 'ORDER-' + Date.now()
})`,
                  'nodejs-complete'
                )}
              >
                {copiedId === 'nodejs-complete' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="python" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`import requests
import datetime
import time

class PaymentClient:
    def __init__(self, api_key, base_url='${baseUrl}'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'x-merchant-api-key': api_key,
            'Content-Type': 'application/json'
        }
    
    def create_payment(self, amount, order_id):
        try:
            # 1. Получаем доступные методы
            methods = self.get_methods()
            sbp_method = next((m for m in methods if m['code'] == 'sbp'), None)
            
            if not sbp_method:
                raise Exception('SBP method not available')
            
            # 2. Создаем транзакцию
            expired_at = (datetime.datetime.utcnow() + datetime.timedelta(minutes=30)).isoformat() + 'Z'
            
            response = requests.post(
                f"{self.base_url}/api/merchant/transactions/create",
                json={
                    'amount': amount,
                    'orderId': order_id,
                    'methodId': sbp_method['id'],
                    'rate': 95.5,  # Получите актуальный курс из вашей системы
                    'expired_at': expired_at,
                    'type': 'IN',
                    'callbackUri': 'https://yourdomain.com/webhook/payment'
                },
                headers=self.headers
            )
            
            if response.status_code != 201:
                raise Exception(f"Error creating payment: {response.text}")
            
            transaction = response.json()
            
            return {
                'transactionId': transaction['id'],
                'paymentUrl': f"https://payment.system/pay/{transaction['id']}",
                'requisites': transaction['requisites'],
                'amount': transaction['amount'],
                'crypto': transaction['crypto'],
                'expiresAt': transaction['expired_at']
            }
            
        except Exception as e:
            print(f"Payment creation error: {e}")
            raise
    
    def check_payment_status(self, transaction_id):
        try:
            response = requests.get(
                f"{self.base_url}/api/merchant/transactions/status/{transaction_id}",
                headers=self.headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Error checking status: {response.text}")
            
            return response.json()
            
        except Exception as e:
            print(f"Status check error: {e}")
            raise
    
    def get_methods(self):
        try:
            response = requests.get(
                f"{self.base_url}/api/merchant/methods",
                headers=self.headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Error getting methods: {response.text}")
            
            return response.json()
            
        except Exception as e:
            print(f"Get methods error: {e}")
            raise
    
    def cancel_payment(self, order_id):
        try:
            response = requests.patch(
                f"{self.base_url}/api/merchant/transactions/by-order-id/{order_id}/cancel",
                headers=self.headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Error canceling payment: {response.text}")
            
            return response.json()
            
        except Exception as e:
            print(f"Cancel payment error: {e}")
            raise

# Использование
def process_order(order_data):
    client = PaymentClient('${apiKey}')
    
    try:
        # Создаем платеж
        payment = client.create_payment(
            order_data['amount'],
            order_data['orderId']
        )
        
        print(f"Payment created: {payment}")
        
        # Отправляем пользователя на страницу оплаты
        # redirect(payment['paymentUrl'])
        
        # Проверяем статус через 5 минут (в реальности используйте webhooks)
        time.sleep(300)  # 5 минут
        
        status = client.check_payment_status(payment['transactionId'])
        print(f"Payment status: {status}")
        
        if status['status'] == 'READY':
            print('Payment successful!')
        elif status['status'] == 'EXPIRED':
            print('Payment expired')
    
    except Exception as e:
        print(f"Payment error: {e}")
        # Обработка ошибки

# Запуск примера
if __name__ == '__main__':
    process_order({
        'amount': 5000,
        'orderId': f"ORDER-{int(time.time())}"
    })`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `import requests
import datetime
import time

class PaymentClient:
    def __init__(self, api_key, base_url='${baseUrl}'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'x-merchant-api-key': api_key,
            'Content-Type': 'application/json'
        }
    
    def create_payment(self, amount, order_id):
        try:
            # 1. Получаем доступные методы
            methods = self.get_methods()
            sbp_method = next((m for m in methods if m['code'] == 'sbp'), None)
            
            if not sbp_method:
                raise Exception('SBP method not available')
            
            # 2. Создаем транзакцию
            expired_at = (datetime.datetime.utcnow() + datetime.timedelta(minutes=30)).isoformat() + 'Z'
            
            response = requests.post(
                f"{self.base_url}/api/merchant/transactions/create",
                json={
                    'amount': amount,
                    'orderId': order_id,
                    'methodId': sbp_method['id'],
                    'rate': 95.5,  # Получите актуальный курс из вашей системы
                    'expired_at': expired_at,
                    'type': 'IN',
                    'callbackUri': 'https://yourdomain.com/webhook/payment'
                },
                headers=self.headers
            )
            
            if response.status_code != 201:
                raise Exception(f"Error creating payment: {response.text}")
            
            transaction = response.json()
            
            return {
                'transactionId': transaction['id'],
                'paymentUrl': f"https://payment.system/pay/{transaction['id']}",
                'requisites': transaction['requisites'],
                'amount': transaction['amount'],
                'crypto': transaction['crypto'],
                'expiresAt': transaction['expired_at']
            }
            
        except Exception as e:
            print(f"Payment creation error: {e}")
            raise
    
    def check_payment_status(self, transaction_id):
        try:
            response = requests.get(
                f"{self.base_url}/api/merchant/transactions/status/{transaction_id}",
                headers=self.headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Error checking status: {response.text}")
            
            return response.json()
            
        except Exception as e:
            print(f"Status check error: {e}")
            raise
    
    def get_methods(self):
        try:
            response = requests.get(
                f"{self.base_url}/api/merchant/methods",
                headers=self.headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Error getting methods: {response.text}")
            
            return response.json()
            
        except Exception as e:
            print(f"Get methods error: {e}")
            raise
    
    def cancel_payment(self, order_id):
        try:
            response = requests.patch(
                f"{self.base_url}/api/merchant/transactions/by-order-id/{order_id}/cancel",
                headers=self.headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Error canceling payment: {response.text}")
            
            return response.json()
            
        except Exception as e:
            print(f"Cancel payment error: {e}")
            raise

# Использование
def process_order(order_data):
    client = PaymentClient('${apiKey}')
    
    try:
        # Создаем платеж
        payment = client.create_payment(
            order_data['amount'],
            order_data['orderId']
        )
        
        print(f"Payment created: {payment}")
        
        # Отправляем пользователя на страницу оплаты
        # redirect(payment['paymentUrl'])
        
        # Проверяем статус через 5 минут (в реальности используйте webhooks)
        time.sleep(300)  # 5 минут
        
        status = client.check_payment_status(payment['transactionId'])
        print(f"Payment status: {status}")
        
        if status['status'] == 'READY':
            print('Payment successful!')
        elif status['status'] == 'EXPIRED':
            print('Payment expired')
    
    except Exception as e:
        print(f"Payment error: {e}")
        # Обработка ошибки

# Запуск примера
if __name__ == '__main__':
    process_order({
        'amount': 5000,
        'orderId': f"ORDER-{int(time.time())}"
    })`,
                  'python-complete'
                )}
              >
                {copiedId === 'python-complete' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="php" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`<?php
class PaymentClient {
    private $apiKey;
    private $baseUrl;
    
    public function __construct($apiKey, $baseUrl = '${baseUrl}') {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }
    
    public function createPayment($amount, $orderId) {
        try {
            // 1. Получаем доступные методы
            $methods = $this->getMethods();
            $sbpMethod = null;
            
            foreach ($methods as $method) {
                if ($method['code'] === 'sbp') {
                    $sbpMethod = $method;
                    break;
                }
            }
            
            if (!$sbpMethod) {
                throw new Exception('SBP method not available');
            }
            
            // 2. Создаем транзакцию
            $expiredAt = date('c', strtotime('+30 minutes'));
            
            $data = [
                'amount' => $amount,
                'orderId' => $orderId,
                'methodId' => $sbpMethod['id'],
                'rate' => 95.5, // Получите актуальный курс из вашей системы
                'expired_at' => $expiredAt,
                'type' => 'IN',
                'callbackUri' => 'https://yourdomain.com/webhook/payment'
            ];
            
            $response = $this->makeRequest('POST', '/api/merchant/transactions/create', $data);
            
            return [
                'transactionId' => $response['id'],
                'paymentUrl' => "https://payment.system/pay/{$response['id']}",
                'requisites' => $response['requisites'],
                'amount' => $response['amount'],
                'crypto' => $response['crypto'],
                'expiresAt' => $response['expired_at']
            ];
            
        } catch (Exception $e) {
            error_log("Payment creation error: " . $e->getMessage());
            throw $e;
        }
    }
    
    public function checkPaymentStatus($transactionId) {
        try {
            return $this->makeRequest('GET', "/api/merchant/transactions/status/{$transactionId}");
        } catch (Exception $e) {
            error_log("Status check error: " . $e->getMessage());
            throw $e;
        }
    }
    
    public function getMethods() {
        try {
            return $this->makeRequest('GET', '/api/merchant/methods');
        } catch (Exception $e) {
            error_log("Get methods error: " . $e->getMessage());
            throw $e;
        }
    }
    
    public function cancelPayment($orderId) {
        try {
            return $this->makeRequest('PATCH', "/api/merchant/transactions/by-order-id/{$orderId}/cancel");
        } catch (Exception $e) {
            error_log("Cancel payment error: " . $e->getMessage());
            throw $e;
        }
    }
    
    private function makeRequest($method, $endpoint, $data = null) {
        $url = $this->baseUrl . $endpoint;
        
        $headers = [
            'x-merchant-api-key: ' . $this->apiKey,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        
        if ($data && in_array($method, ['POST', 'PATCH', 'PUT'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $result = json_decode($response, true);
        
        if ($httpCode >= 400) {
            throw new Exception("HTTP Error {$httpCode}: " . $response);
        }
        
        return $result;
    }
}

// Использование
function processOrder($orderData) {
    $client = new PaymentClient('${apiKey}');
    
    try {
        // Создаем платеж
        $payment = $client->createPayment(
            $orderData['amount'],
            $orderData['orderId']
        );
        
        echo "Payment created: " . json_encode($payment) . "\\n";
        
        // Отправляем пользователя на страницу оплаты
        // header("Location: " . $payment['paymentUrl']);
        
        // Проверяем статус через 5 минут (в реальности используйте webhooks)
        sleep(300); // 5 минут
        
        $status = $client->checkPaymentStatus($payment['transactionId']);
        echo "Payment status: " . json_encode($status) . "\\n";
        
        if ($status['status'] === 'READY') {
            echo "Payment successful!\\n";
        } elseif ($status['status'] === 'EXPIRED') {
            echo "Payment expired\\n";
        }
        
    } catch (Exception $e) {
        echo "Payment error: " . $e->getMessage() . "\\n";
        // Обработка ошибки
    }
}

// Запуск примера
processOrder([
    'amount' => 5000,
    'orderId' => 'ORDER-' . time()
]);
?>`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `<?php
class PaymentClient {
    private $apiKey;
    private $baseUrl;
    
    public function __construct($apiKey, $baseUrl = '${baseUrl}') {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }
    
    public function createPayment($amount, $orderId) {
        try {
            // 1. Получаем доступные методы
            $methods = $this->getMethods();
            $sbpMethod = null;
            
            foreach ($methods as $method) {
                if ($method['code'] === 'sbp') {
                    $sbpMethod = $method;
                    break;
                }
            }
            
            if (!$sbpMethod) {
                throw new Exception('SBP method not available');
            }
            
            // 2. Создаем транзакцию
            $expiredAt = date('c', strtotime('+30 minutes'));
            
            $data = [
                'amount' => $amount,
                'orderId' => $orderId,
                'methodId' => $sbpMethod['id'],
                'rate' => 95.5, // Получите актуальный курс из вашей системы
                'expired_at' => $expiredAt,
                'type' => 'IN',
                'callbackUri' => 'https://yourdomain.com/webhook/payment'
            ];
            
            $response = $this->makeRequest('POST', '/api/merchant/transactions/create', $data);
            
            return [
                'transactionId' => $response['id'],
                'paymentUrl' => "https://payment.system/pay/{$response['id']}",
                'requisites' => $response['requisites'],
                'amount' => $response['amount'],
                'crypto' => $response['crypto'],
                'expiresAt' => $response['expired_at']
            ];
            
        } catch (Exception $e) {
            error_log("Payment creation error: " . $e->getMessage());
            throw $e;
        }
    }
    
    public function checkPaymentStatus($transactionId) {
        try {
            return $this->makeRequest('GET', "/api/merchant/transactions/status/{$transactionId}");
        } catch (Exception $e) {
            error_log("Status check error: " . $e->getMessage());
            throw $e;
        }
    }
    
    public function getMethods() {
        try {
            return $this->makeRequest('GET', '/api/merchant/methods');
        } catch (Exception $e) {
            error_log("Get methods error: " . $e->getMessage());
            throw $e;
        }
    }
    
    public function cancelPayment($orderId) {
        try {
            return $this->makeRequest('PATCH', "/api/merchant/transactions/by-order-id/{$orderId}/cancel");
        } catch (Exception $e) {
            error_log("Cancel payment error: " . $e->getMessage());
            throw $e;
        }
    }
    
    private function makeRequest($method, $endpoint, $data = null) {
        $url = $this->baseUrl . $endpoint;
        
        $headers = [
            'x-merchant-api-key: ' . $this->apiKey,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        
        if ($data && in_array($method, ['POST', 'PATCH', 'PUT'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $result = json_decode($response, true);
        
        if ($httpCode >= 400) {
            throw new Exception("HTTP Error {$httpCode}: " . $response);
        }
        
        return $result;
    }
}

// Использование
function processOrder($orderData) {
    $client = new PaymentClient('${apiKey}');
    
    try {
        // Создаем платеж
        $payment = $client->createPayment(
            $orderData['amount'],
            $orderData['orderId']
        );
        
        echo "Payment created: " . json_encode($payment) . "\\n";
        
        // Отправляем пользователя на страницу оплаты
        // header("Location: " . $payment['paymentUrl']);
        
        // Проверяем статус через 5 минут (в реальности используйте webhooks)
        sleep(300); // 5 минут
        
        $status = $client->checkPaymentStatus($payment['transactionId']);
        echo "Payment status: " . json_encode($status) . "\\n";
        
        if ($status['status'] === 'READY') {
            echo "Payment successful!\\n";
        } elseif ($status['status'] === 'EXPIRED') {
            echo "Payment expired\\n";
        }
        
    } catch (Exception $e) {
        echo "Payment error: " . $e->getMessage() . "\\n";
        // Обработка ошибки
    }
}

// Запуск примера
processOrder([
    'amount' => 5000,
    'orderId' => 'ORDER-' . time()
]);
?>`,
                  'php-complete'
                )}
              >
                {copiedId === 'php-complete' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Handling */}
      <Card>
        <CardHeader>
          <CardTitle>Обработка ошибок</CardTitle>
          <CardDescription>
            Примеры обработки различных типов ошибок
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">Общий подход</TabsTrigger>
              <TabsTrigger value="specific">Конкретные ошибки</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`// JavaScript пример обработки ошибок
async function safeApiCall(apiFunction) {
  try {
    const result = await apiFunction()
    return { success: true, data: result }
  } catch (error) {
    // Логирование ошибки
    console.error('API Error:', error)
    
    // Определение типа ошибки
    if (error.response) {
      // Сервер вернул ошибку
      const statusCode = error.response.status
      const errorData = error.response.data
      
      switch (statusCode) {
        case 400:
          return {
            success: false,
            error: 'Неверные параметры запроса',
            details: errorData.error || 'Проверьте входные данные'
          }
          
        case 401:
          return {
            success: false,
            error: 'Ошибка аутентификации',
            details: 'Проверьте API ключ'
          }
          
        case 403:
          return {
            success: false,
            error: 'Доступ запрещен',
            details: 'Мерчант заблокирован или деактивирован'
          }
          
        case 404:
          return {
            success: false,
            error: 'Ресурс не найден',
            details: errorData.error || 'Запрашиваемый объект не существует'
          }
          
        case 409:
          return {
            success: false,
            error: 'Конфликт данных',
            details: 'Возможно, orderId уже существует'
          }
          
        case 429:
          return {
            success: false,
            error: 'Слишком много запросов',
            details: 'Превышен лимит запросов, попробуйте позже'
          }
          
        case 500:
        case 502:
        case 503:
          return {
            success: false,
            error: 'Ошибка сервера',
            details: 'Попробуйте повторить запрос позже'
          }
          
        default:
          return {
            success: false,
            error: \`Неизвестная ошибка (код \${statusCode})\`,
            details: errorData.error || 'Обратитесь в поддержку'
          }
      }
    } else if (error.request) {
      // Запрос был отправлен, но ответ не получен
      return {
        success: false,
        error: 'Нет ответа от сервера',
        details: 'Проверьте подключение к интернету'
      }
    } else {
      // Ошибка при настройке запроса
      return {
        success: false,
        error: 'Ошибка запроса',
        details: error.message
      }
    }
  }
}

// Использование
const result = await safeApiCall(async () => {
  return await paymentClient.createPayment(5000, 'ORDER-123')
})

if (result.success) {
  console.log('Платеж создан:', result.data)
} else {
  console.error('Ошибка:', result.error)
  console.error('Детали:', result.details)
  // Показать пользователю сообщение об ошибке
}`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `// JavaScript пример обработки ошибок
async function safeApiCall(apiFunction) {
  try {
    const result = await apiFunction()
    return { success: true, data: result }
  } catch (error) {
    // Логирование ошибки
    console.error('API Error:', error)
    
    // Определение типа ошибки
    if (error.response) {
      // Сервер вернул ошибку
      const statusCode = error.response.status
      const errorData = error.response.data
      
      switch (statusCode) {
        case 400:
          return {
            success: false,
            error: 'Неверные параметры запроса',
            details: errorData.error || 'Проверьте входные данные'
          }
          
        case 401:
          return {
            success: false,
            error: 'Ошибка аутентификации',
            details: 'Проверьте API ключ'
          }
          
        case 403:
          return {
            success: false,
            error: 'Доступ запрещен',
            details: 'Мерчант заблокирован или деактивирован'
          }
          
        case 404:
          return {
            success: false,
            error: 'Ресурс не найден',
            details: errorData.error || 'Запрашиваемый объект не существует'
          }
          
        case 409:
          return {
            success: false,
            error: 'Конфликт данных',
            details: 'Возможно, orderId уже существует'
          }
          
        case 429:
          return {
            success: false,
            error: 'Слишком много запросов',
            details: 'Превышен лимит запросов, попробуйте позже'
          }
          
        case 500:
        case 502:
        case 503:
          return {
            success: false,
            error: 'Ошибка сервера',
            details: 'Попробуйте повторить запрос позже'
          }
          
        default:
          return {
            success: false,
            error: \`Неизвестная ошибка (код \${statusCode})\`,
            details: errorData.error || 'Обратитесь в поддержку'
          }
      }
    } else if (error.request) {
      // Запрос был отправлен, но ответ не получен
      return {
        success: false,
        error: 'Нет ответа от сервера',
        details: 'Проверьте подключение к интернету'
      }
    } else {
      // Ошибка при настройке запроса
      return {
        success: false,
        error: 'Ошибка запроса',
        details: error.message
      }
    }
  }
}

// Использование
const result = await safeApiCall(async () => {
  return await paymentClient.createPayment(5000, 'ORDER-123')
})

if (result.success) {
  console.log('Платеж создан:', result.data)
} else {
  console.error('Ошибка:', result.error)
  console.error('Детали:', result.details)
  // Показать пользователю сообщение об ошибке
}`,
                  'error-handling'
                )}
              >
                {copiedId === 'error-handling' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="specific" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`// Обработка конкретных сценариев ошибок

// 1. Дублирование orderId (409 Conflict)
async function createPaymentWithRetry(amount, baseOrderId) {
  let attempts = 0
  const maxAttempts = 3
  
  while (attempts < maxAttempts) {
    try {
      const orderId = \`\${baseOrderId}-\${attempts > 0 ? attempts : ''}\`
      const payment = await paymentClient.createPayment(amount, orderId)
      return payment
    } catch (error) {
      if (error.response?.status === 409) {
        attempts++
        console.log(\`Order ID конфликт, попытка \${attempts} из \${maxAttempts}\`)
        continue
      }
      throw error
    }
  }
  
  throw new Error('Не удалось создать уникальный orderId')
}

// 2. Истечение транзакции
async function monitorTransaction(transactionId, maxWaitMinutes = 30) {
  const checkInterval = 30000 // 30 секунд
  const maxChecks = (maxWaitMinutes * 60 * 1000) / checkInterval
  let checks = 0
  
  while (checks < maxChecks) {
    try {
      const status = await paymentClient.checkPaymentStatus(transactionId)
      
      if (status.status === 'READY') {
        return { success: true, status }
      }
      
      if (status.status === 'EXPIRED') {
        return { 
          success: false, 
          error: 'Транзакция истекла',
          shouldRetry: true 
        }
      }
      
      if (status.status === 'CANCELED') {
        return { 
          success: false, 
          error: 'Транзакция отменена',
          shouldRetry: false 
        }
      }
      
      // Продолжаем проверку для статусов CREATED, IN_PROGRESS
      checks++
      await new Promise(resolve => setTimeout(resolve, checkInterval))
      
    } catch (error) {
      console.error('Ошибка проверки статуса:', error)
      // Продолжаем проверку при временных ошибках
      if (error.response?.status >= 500) {
        checks++
        await new Promise(resolve => setTimeout(resolve, checkInterval))
        continue
      }
      throw error
    }
  }
  
  return { 
    success: false, 
    error: 'Превышено время ожидания',
    shouldRetry: true 
  }
}

// 3. Обработка лимитов API (429 Too Many Requests)
class RateLimitedClient {
  constructor(client, maxRequestsPerMinute = 100) {
    this.client = client
    this.maxRequestsPerMinute = maxRequestsPerMinute
    this.requestTimes = []
  }
  
  async makeRequest(method, ...args) {
    await this.waitForRateLimit()
    
    try {
      const result = await this.client[method](...args)
      this.recordRequest()
      return result
    } catch (error) {
      if (error.response?.status === 429) {
        // Ждем минуту при превышении лимита
        console.log('Превышен лимит запросов, ожидание 60 секунд...')
        await new Promise(resolve => setTimeout(resolve, 60000))
        return this.makeRequest(method, ...args)
      }
      throw error
    }
  }
  
  async waitForRateLimit() {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    
    // Удаляем старые записи
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo)
    
    // Проверяем лимит
    if (this.requestTimes.length >= this.maxRequestsPerMinute) {
      const oldestRequest = this.requestTimes[0]
      const waitTime = (oldestRequest + 60000) - now
      console.log(\`Достигнут лимит запросов, ожидание \${waitTime}мс...\`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  recordRequest() {
    this.requestTimes.push(Date.now())
  }
}

// Использование
const rateLimitedClient = new RateLimitedClient(paymentClient)
const payment = await rateLimitedClient.makeRequest('createPayment', 5000, 'ORDER-123')`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `// Обработка конкретных сценариев ошибок

// 1. Дублирование orderId (409 Conflict)
async function createPaymentWithRetry(amount, baseOrderId) {
  let attempts = 0
  const maxAttempts = 3
  
  while (attempts < maxAttempts) {
    try {
      const orderId = \`\${baseOrderId}-\${attempts > 0 ? attempts : ''}\`
      const payment = await paymentClient.createPayment(amount, orderId)
      return payment
    } catch (error) {
      if (error.response?.status === 409) {
        attempts++
        console.log(\`Order ID конфликт, попытка \${attempts} из \${maxAttempts}\`)
        continue
      }
      throw error
    }
  }
  
  throw new Error('Не удалось создать уникальный orderId')
}

// 2. Истечение транзакции
async function monitorTransaction(transactionId, maxWaitMinutes = 30) {
  const checkInterval = 30000 // 30 секунд
  const maxChecks = (maxWaitMinutes * 60 * 1000) / checkInterval
  let checks = 0
  
  while (checks < maxChecks) {
    try {
      const status = await paymentClient.checkPaymentStatus(transactionId)
      
      if (status.status === 'READY') {
        return { success: true, status }
      }
      
      if (status.status === 'EXPIRED') {
        return { 
          success: false, 
          error: 'Транзакция истекла',
          shouldRetry: true 
        }
      }
      
      if (status.status === 'CANCELED') {
        return { 
          success: false, 
          error: 'Транзакция отменена',
          shouldRetry: false 
        }
      }
      
      // Продолжаем проверку для статусов CREATED, IN_PROGRESS
      checks++
      await new Promise(resolve => setTimeout(resolve, checkInterval))
      
    } catch (error) {
      console.error('Ошибка проверки статуса:', error)
      // Продолжаем проверку при временных ошибках
      if (error.response?.status >= 500) {
        checks++
        await new Promise(resolve => setTimeout(resolve, checkInterval))
        continue
      }
      throw error
    }
  }
  
  return { 
    success: false, 
    error: 'Превышено время ожидания',
    shouldRetry: true 
  }
}

// 3. Обработка лимитов API (429 Too Many Requests)
class RateLimitedClient {
  constructor(client, maxRequestsPerMinute = 100) {
    this.client = client
    this.maxRequestsPerMinute = maxRequestsPerMinute
    this.requestTimes = []
  }
  
  async makeRequest(method, ...args) {
    await this.waitForRateLimit()
    
    try {
      const result = await this.client[method](...args)
      this.recordRequest()
      return result
    } catch (error) {
      if (error.response?.status === 429) {
        // Ждем минуту при превышении лимита
        console.log('Превышен лимит запросов, ожидание 60 секунд...')
        await new Promise(resolve => setTimeout(resolve, 60000))
        return this.makeRequest(method, ...args)
      }
      throw error
    }
  }
  
  async waitForRateLimit() {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    
    // Удаляем старые записи
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo)
    
    // Проверяем лимит
    if (this.requestTimes.length >= this.maxRequestsPerMinute) {
      const oldestRequest = this.requestTimes[0]
      const waitTime = (oldestRequest + 60000) - now
      console.log(\`Достигнут лимит запросов, ожидание \${waitTime}мс...\`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  recordRequest() {
    this.requestTimes.push(Date.now())
  }
}

// Использование
const rateLimitedClient = new RateLimitedClient(paymentClient)
const payment = await rateLimitedClient.makeRequest('createPayment', 5000, 'ORDER-123')`,
                  'specific-errors'
                )}
              >
                {copiedId === 'specific-errors' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Integration Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Советы по интеграции</CardTitle>
          <CardDescription>
            Лучшие практики для надежной интеграции
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">1. Используйте уникальные orderId</h4>
              <p className="text-sm text-gray-600 mb-2">
                Генерируйте уникальные идентификаторы для каждого заказа, чтобы избежать конфликтов.
              </p>
              <pre className="bg-gray-100 p-2 rounded text-xs">
{`// Пример генерации уникального orderId
const orderId = \`ORDER-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\``}
              </pre>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">2. Сохраняйте состояние транзакций</h4>
              <p className="text-sm text-gray-600 mb-2">
                Храните информацию о транзакциях в вашей базе данных для отслеживания и сверки.
              </p>
              <pre className="bg-gray-100 p-2 rounded text-xs">
{`// Сохраняйте ключевую информацию
await saveTransaction({
  orderId: order.id,
  transactionId: payment.transactionId,
  amount: payment.amount,
  status: 'pending',
  createdAt: new Date()
})`}
              </pre>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">3. Реализуйте retry логику</h4>
              <p className="text-sm text-gray-600 mb-2">
                Добавьте повторные попытки для временных ошибок сети.
              </p>
              <pre className="bg-gray-100 p-2 rounded text-xs">
{`// Простая retry логика
async function retryableRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1 || error.response?.status < 500) throw error
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
    }
  }
}`}
              </pre>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">4. Логируйте все операции</h4>
              <p className="text-sm text-gray-600 mb-2">
                Ведите подробные логи для отладки и аудита.
              </p>
              <pre className="bg-gray-100 p-2 rounded text-xs">
{`// Структурированное логирование
logger.info('Payment created', {
  orderId,
  transactionId: payment.transactionId,
  amount: payment.amount,
  timestamp: new Date().toISOString()
})`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
      </MerchantLayout>
    </MerchantProtectedRoute>
  )
}