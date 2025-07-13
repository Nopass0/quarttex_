'use client'

import { useState } from 'react'
import { MerchantProtectedRoute } from '@/components/auth/merchant-protected-route'
import { MerchantLayout } from '@/components/layouts/merchant-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Check, AlertCircle, Webhook } from 'lucide-react'
import { useMerchantAuth } from '@/stores/merchant-auth'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function WebhooksApiDocsPage() {
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

  return (
    <MerchantProtectedRoute>
      <MerchantLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
            <p className="text-gray-600 mt-2">
              Автоматические уведомления об изменении статуса транзакций и выплат
            </p>
          </div>

      <Alert>
        <Webhook className="h-4 w-4 text-[#006039]" />
        <AlertTitle>Как работают webhooks</AlertTitle>
        <AlertDescription className="mt-2">
          <div className="space-y-2">
            <p><strong>Транзакции:</strong> При создании транзакции укажите <code className="bg-gray-100 px-1 rounded">callbackUri</code> для получения уведомлений.</p>
            <p><strong>Выплаты:</strong> При создании выплаты укажите <code className="bg-gray-100 px-1 rounded">webhookUrl</code> для получения уведомлений.</p>
            <p>Система автоматически отправит POST-запрос на указанный URL при изменении статуса.</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Webhook Request Format */}
      <Card>
        <CardHeader>
          <CardTitle>Формат webhook запроса</CardTitle>
          <CardDescription>
            POST-запрос, который отправляется на ваш webhook URL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="transaction-headers">
            <TabsList>
              <TabsTrigger value="transaction-headers">Транзакции: Headers</TabsTrigger>
              <TabsTrigger value="transaction-body">Транзакции: Body</TabsTrigger>
              <TabsTrigger value="payout-headers">Выплаты: Headers</TabsTrigger>
              <TabsTrigger value="payout-body">Выплаты: Body</TabsTrigger>
              <TabsTrigger value="signature">Подпись</TabsTrigger>
            </TabsList>

            <TabsContent value="transaction-headers" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`POST https://your-domain.com/webhook
Content-Type: application/json
X-Signature: 7f3b1c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b
User-Agent: PaymentSystem/1.0`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `POST https://your-domain.com/webhook
Content-Type: application/json
X-Signature: 7f3b1c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b
User-Agent: PaymentSystem/1.0`,
                  'transaction-headers'
                )}
              >
                {copiedId === 'transaction-headers' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="transaction-body" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "transactionId": "tx123",
  "orderId": "ORDER-12345",
  "status": "READY",
  "previousStatus": "IN_PROGRESS",
  "amount": 5000,
  "crypto": 52.36,
  "type": "IN",
  "methodCode": "sbp",
  "timestamp": "2024-01-01T10:05:00.000Z",
  "signature": "7f3b1c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b"
}`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `{
  "transactionId": "tx123",
  "orderId": "ORDER-12345",
  "status": "READY",
  "previousStatus": "IN_PROGRESS",
  "amount": 5000,
  "crypto": 52.36,
  "type": "IN",
  "methodCode": "sbp",
  "timestamp": "2024-01-01T10:05:00.000Z",
  "signature": "7f3b1c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b"
}`,
                  'transaction-body'
                )}
              >
                {copiedId === 'transaction-body' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="payout-headers" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`POST https://your-domain.com/webhook/payouts
Content-Type: application/json
User-Agent: PaymentSystem/1.0`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `POST https://your-domain.com/webhook/payouts
Content-Type: application/json
User-Agent: PaymentSystem/1.0`,
                  'payout-headers'
                )}
              >
                {copiedId === 'payout-headers' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="payout-body" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "event": "ACTIVE",
  "payout": {
    "id": "payout123",
    "numericId": 2001,
    "status": "ACTIVE",
    "amount": 10000,
    "amountUsdt": 104.71,
    "wallet": "TRx1234567890abcdef",
    "bank": "SBERBANK",
    "externalReference": "PAYOUT-12345",
    "proofFiles": [],
    "disputeFiles": [],
    "disputeMessage": null,
    "cancelReason": null,
    "cancelReasonCode": null,
    "metadata": { "userId": "user123" }
  }
}`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `{
  "event": "ACTIVE",
  "payout": {
    "id": "payout123",
    "numericId": 2001,
    "status": "ACTIVE",
    "amount": 10000,
    "amountUsdt": 104.71,
    "wallet": "TRx1234567890abcdef",
    "bank": "SBERBANK",
    "externalReference": "PAYOUT-12345",
    "proofFiles": [],
    "disputeFiles": [],
    "disputeMessage": null,
    "cancelReason": null,
    "cancelReasonCode": null,
    "metadata": { "userId": "user123" }
  }
}`,
                  'payout-body'
                )}
              >
                {copiedId === 'payout-body' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="signature">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Для проверки подлинности webhook используется HMAC-SHA256 подпись.
                </p>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`// Node.js пример проверки подписи
const crypto = require('crypto')

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')
  
  return expectedSignature === signature
}

// В вашем webhook обработчике
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-signature']
  const isValid = verifyWebhookSignature(
    req.body, 
    signature, 
    'YOUR_WEBHOOK_SECRET'
  )
  
  if (!isValid) {
    return res.status(401).send('Invalid signature')
  }
  
  // Обработка webhook
  console.log('Transaction status changed:', req.body)
  res.status(200).send('OK')
})`}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Status Changes */}
      <Card>
        <CardHeader>
          <CardTitle>События, вызывающие webhook</CardTitle>
          <CardDescription>
            Webhook отправляется при следующих изменениях статуса
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="transactions">
            <TabsList className="w-full">
              <TabsTrigger value="transactions" className="flex-1">Транзакции</TabsTrigger>
              <TabsTrigger value="payouts" className="flex-1">Выплаты</TabsTrigger>
            </TabsList>
            
            <TabsContent value="transactions" className="mt-4">
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant="default">IN_PROGRESS</Badge>
                  <span className="text-sm">→</span>
                  <Badge variant="success">READY</Badge>
                  <span className="text-sm text-gray-600">Транзакция успешно завершена</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant="default">IN_PROGRESS</Badge>
                  <span className="text-sm">→</span>
                  <Badge variant="destructive">CANCELED</Badge>
                  <span className="text-sm text-gray-600">Транзакция отменена</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant="default">IN_PROGRESS</Badge>
                  <span className="text-sm">→</span>
                  <Badge variant="destructive">EXPIRED</Badge>
                  <span className="text-sm text-gray-600">Истекло время транзакции</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant="success">READY</Badge>
                  <span className="text-sm">→</span>
                  <Badge variant="warning">DISPUTE</Badge>
                  <span className="text-sm text-gray-600">Открыт спор по транзакции</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="payouts" className="mt-4">
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant="default">CREATED</Badge>
                  <span className="text-sm">→</span>
                  <Badge variant="warning">ACTIVE</Badge>
                  <span className="text-sm text-gray-600">Выплата принята трейдером (event: ACTIVE)</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant="warning">ACTIVE</Badge>
                  <span className="text-sm">→</span>
                  <Badge variant="secondary">CHECKING</Badge>
                  <span className="text-sm text-gray-600">Трейдер загрузил документы (event: CHECKING)</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant="secondary">CHECKING</Badge>
                  <span className="text-sm">→</span>
                  <Badge variant="success">COMPLETED</Badge>
                  <span className="text-sm text-gray-600">Выплата подтверждена (event: COMPLETED)</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant="secondary">CHECKING</Badge>
                  <span className="text-sm">→</span>
                  <Badge variant="warning">DISPUTED</Badge>
                  <span className="text-sm text-gray-600">Открыт спор (event: DISPUTED)</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant="default">CREATED</Badge>
                  <span className="text-sm">→</span>
                  <Badge variant="destructive">CANCELLED</Badge>
                  <span className="text-sm text-gray-600">Выплата отменена (event: CANCELLED)</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Implementation Example */}
      <Card>
        <CardHeader>
          <CardTitle>Пример обработки webhook</CardTitle>
          <CardDescription>
            Полный пример обработчика webhook на Node.js
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="nodejs">
            <TabsList>
              <TabsTrigger value="nodejs">Node.js</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>

            <TabsContent value="nodejs" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`const express = require('express')
const crypto = require('crypto')
const app = express()

app.use(express.json())

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

// Webhook для транзакций
app.post('/webhook/payment', async (req, res) => {
  try {
    // Проверка подписи
    const signature = req.headers['x-signature']
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex')
    
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' })
    }
    
    // Обработка события
    const { transactionId, orderId, status, amount } = req.body
    
    switch (status) {
      case 'READY':
        // Транзакция успешно оплачена
        await updateOrderStatus(orderId, 'paid')
        await sendPaymentConfirmation(orderId)
        break
        
      case 'CANCELED':
      case 'EXPIRED':
        // Транзакция отменена или истекла
        await updateOrderStatus(orderId, 'failed')
        await notifyCustomerPaymentFailed(orderId)
        break
        
      case 'DISPUTE':
        // Открыт спор
        await updateOrderStatus(orderId, 'dispute')
        await notifyAdminAboutDispute(orderId)
        break
    }
    
    // Подтверждение получения
    res.status(200).json({ received: true })
    
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Webhook для выплат
app.post('/webhook/payouts', async (req, res) => {
  try {
    const { event, payout } = req.body
    
    switch (event) {
      case 'ACTIVE':
        // Выплата принята трейдером
        await updatePayoutStatus(payout.id, 'processing')
        break
        
      case 'CHECKING':
        // Трейдер загрузил документы
        await notifyFinanceTeam(payout.id, payout.proofFiles)
        break
        
      case 'COMPLETED':
        // Выплата завершена
        await finalizePayment(payout.id)
        await sendPayoutConfirmation(payout.externalReference)
        break
        
      case 'CANCELLED':
        // Выплата отменена
        await handlePayoutCancellation(payout.id, payout.cancelReasonCode)
        break
        
      case 'DISPUTED':
        // Открыт спор
        await escalateToSupport(payout.id, payout.disputeMessage)
        break
    }
    
    res.status(200).json({ received: true })
    
  } catch (error) {
    console.error('Payout webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(3000, () => {
  console.log('Webhook server running on port 3000')
})`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `const express = require('express')
const crypto = require('crypto')
const app = express()

app.use(express.json())

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

app.post('/webhook/payment', async (req, res) => {
  try {
    // Проверка подписи
    const signature = req.headers['x-signature']
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex')
    
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' })
    }
    
    // Обработка события
    const { transactionId, orderId, status, amount } = req.body
    
    switch (status) {
      case 'READY':
        // Транзакция успешно оплачена
        await updateOrderStatus(orderId, 'paid')
        await sendPaymentConfirmation(orderId)
        break
        
      case 'CANCELED':
      case 'EXPIRED':
        // Транзакция отменена или истекла
        await updateOrderStatus(orderId, 'failed')
        await notifyCustomerPaymentFailed(orderId)
        break
        
      case 'DISPUTE':
        // Открыт спор
        await updateOrderStatus(orderId, 'dispute')
        await notifyAdminAboutDispute(orderId)
        break
    }
    
    // Подтверждение получения
    res.status(200).json({ received: true })
    
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(3000, () => {
  console.log('Webhook server running on port 3000')
})`,
                  'nodejs'
                )}
              >
                {copiedId === 'nodejs' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="php" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`<?php
$webhookSecret = $_ENV['WEBHOOK_SECRET'];

// Получение данных
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
$data = json_decode($payload, true);

// Проверка подписи
$expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);

if ($signature !== $expectedSignature) {
    http_response_code(401);
    die(json_encode(['error' => 'Invalid signature']));
}

// Обработка события
$transactionId = $data['transactionId'];
$orderId = $data['orderId'];
$status = $data['status'];
$amount = $data['amount'];

switch ($status) {
    case 'READY':
        // Транзакция успешно оплачена
        updateOrderStatus($orderId, 'paid');
        sendPaymentConfirmation($orderId);
        break;
        
    case 'CANCELED':
    case 'EXPIRED':
        // Транзакция отменена или истекла
        updateOrderStatus($orderId, 'failed');
        notifyCustomerPaymentFailed($orderId);
        break;
        
    case 'DISPUTE':
        // Открыт спор
        updateOrderStatus($orderId, 'dispute');
        notifyAdminAboutDispute($orderId);
        break;
}

// Подтверждение получения
http_response_code(200);
echo json_encode(['received' => true]);
?>`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `<?php
$webhookSecret = $_ENV['WEBHOOK_SECRET'];

// Получение данных
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
$data = json_decode($payload, true);

// Проверка подписи
$expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);

if ($signature !== $expectedSignature) {
    http_response_code(401);
    die(json_encode(['error' => 'Invalid signature']));
}

// Обработка события
$transactionId = $data['transactionId'];
$orderId = $data['orderId'];
$status = $data['status'];
$amount = $data['amount'];

switch ($status) {
    case 'READY':
        // Транзакция успешно оплачена
        updateOrderStatus($orderId, 'paid');
        sendPaymentConfirmation($orderId);
        break;
        
    case 'CANCELED':
    case 'EXPIRED':
        // Транзакция отменена или истекла
        updateOrderStatus($orderId, 'failed');
        notifyCustomerPaymentFailed($orderId);
        break;
        
    case 'DISPUTE':
        // Открыт спор
        updateOrderStatus($orderId, 'dispute');
        notifyAdminAboutDispute($orderId);
        break;
}

// Подтверждение получения
http_response_code(200);
echo json_encode(['received' => true]);
?>`,
                  'php'
                )}
              >
                {copiedId === 'php' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>

            <TabsContent value="python" className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`import os
import hmac
import hashlib
import json
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET')

@app.route('/webhook/payment', methods=['POST'])
def handle_webhook():
    try:
        # Получение данных
        payload = request.get_data()
        signature = request.headers.get('X-Signature', '')
        data = request.get_json()
        
        # Проверка подписи
        expected_signature = hmac.new(
            WEBHOOK_SECRET.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        if signature != expected_signature:
            return jsonify({'error': 'Invalid signature'}), 401
        
        # Обработка события
        transaction_id = data['transactionId']
        order_id = data['orderId']
        status = data['status']
        amount = data['amount']
        
        if status == 'READY':
            # Транзакция успешно оплачена
            update_order_status(order_id, 'paid')
            send_payment_confirmation(order_id)
            
        elif status in ['CANCELED', 'EXPIRED']:
            # Транзакция отменена или истекла
            update_order_status(order_id, 'failed')
            notify_customer_payment_failed(order_id)
            
        elif status == 'DISPUTE':
            # Открыт спор
            update_order_status(order_id, 'dispute')
            notify_admin_about_dispute(order_id)
        
        # Подтверждение получения
        return jsonify({'received': True}), 200
        
    except Exception as e:
        print(f'Webhook error: {e}')
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(port=3000)`}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `import os
import hmac
import hashlib
import json
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET')

@app.route('/webhook/payment', methods=['POST'])
def handle_webhook():
    try:
        # Получение данных
        payload = request.get_data()
        signature = request.headers.get('X-Signature', '')
        data = request.get_json()
        
        # Проверка подписи
        expected_signature = hmac.new(
            WEBHOOK_SECRET.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        if signature != expected_signature:
            return jsonify({'error': 'Invalid signature'}), 401
        
        # Обработка события
        transaction_id = data['transactionId']
        order_id = data['orderId']
        status = data['status']
        amount = data['amount']
        
        if status == 'READY':
            # Транзакция успешно оплачена
            update_order_status(order_id, 'paid')
            send_payment_confirmation(order_id)
            
        elif status in ['CANCELED', 'EXPIRED']:
            # Транзакция отменена или истекла
            update_order_status(order_id, 'failed')
            notify_customer_payment_failed(order_id)
            
        elif status == 'DISPUTE':
            # Открыт спор
            update_order_status(order_id, 'dispute')
            notify_admin_about_dispute(order_id)
        
        # Подтверждение получения
        return jsonify({'received': True}), 200
        
    except Exception as e:
        print(f'Webhook error: {e}')
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(port=3000)`,
                  'python'
                )}
              >
                {copiedId === 'python' ? <Check className="h-4 w-4 text-[#006039]" /> : <Copy className="h-4 w-4 text-[#006039]" />}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Лучшие практики</CardTitle>
          <CardDescription>
            Рекомендации по работе с webhooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <AlertCircle className="h-4 w-4 text-[#006039]" />
              <AlertDescription>
                <strong>Идемпотентность:</strong> Ваш обработчик должен корректно обрабатывать повторные вызовы с одинаковыми данными.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <AlertCircle className="h-4 w-4 text-[#006039]" />
              <AlertDescription>
                <strong>Тайм-ауты:</strong> Отвечайте на webhook в течение 5 секунд. Для длительных операций используйте очереди.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <AlertCircle className="h-4 w-4 text-[#006039]" />
              <AlertDescription>
                <strong>Повторные попытки:</strong> При ошибке система повторит отправку webhook до 3 раз с интервалом в 1 минуту.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <AlertCircle className="h-4 w-4 text-[#006039]" />
              <AlertDescription>
                <strong>HTTPS:</strong> Используйте только HTTPS для webhook URL в продакшене.
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