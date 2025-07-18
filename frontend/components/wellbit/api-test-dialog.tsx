"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Copy, Check, Key, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface WellbitApiTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WellbitApiTestDialog({ open, onOpenChange }: WellbitApiTestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [endpoint, setEndpoint] = useState("payment/create");
  const [requestBody, setRequestBody] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [signature, setSignature] = useState("");
  const [copiedSignature, setCopiedSignature] = useState(false);

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://api.example.com';

  // Default request bodies for each endpoint
  const defaultBodies: Record<string, any> = {
    "payment/create": {
      payment_id: Math.floor(Math.random() * 1000000) + 4000000,
      payment_amount: 3833,
      payment_amount_usdt: 48.42091966,
      payment_amount_profit: 3583.855,
      payment_amount_profit_usdt: 45.2735598821,
      payment_fee_percent_profit: 6.5,
      payment_type: "card",
      payment_bank: "SBERBANK",
      payment_course: 79.16,
      payment_lifetime: 720,
      payment_status: "new"
    },
    "payment/get": {
      payment_id: 888888
    },
    "payment/status": {
      payment_id: 888888,
      payment_status: "complete"
    }
  };

  // Update request body when endpoint changes
  const handleEndpointChange = (value: string) => {
    setEndpoint(value);
    setRequestBody(JSON.stringify(defaultBodies[value], null, 2));
    setResponse(null);
    setSignature("");
  };

  // Generate HMAC signature
  const generateSignature = async (body: string, secret: string) => {
    try {
      // Parse and sort the JSON object
      const parsed = JSON.parse(body);
      const sorted = Object.keys(parsed)
        .sort()
        .reduce((obj, key) => {
          obj[key] = parsed[key];
          return obj;
        }, {} as any);
      
      // Create canonical JSON (no spaces, sorted keys)
      const canonicalJson = JSON.stringify(sorted);
      
      // Generate HMAC-SHA256
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(canonicalJson);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        messageData
      );
      
      // Convert to hex string
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error("Error generating signature:", error);
      throw new Error("Failed to generate signature");
    }
  };

  const handleTest = async () => {
    if (!apiKey || !privateKey) {
      toast.error("Пожалуйста, введите публичный и приватный ключи");
      return;
    }

    try {
      setLoading(true);
      setResponse(null);
      
      // Parse request body
      let parsedBody;
      try {
        parsedBody = JSON.parse(requestBody);
      } catch (e) {
        toast.error("Неверный формат JSON");
        return;
      }

      // Generate signature
      const sig = await generateSignature(requestBody, privateKey);
      setSignature(sig);

      // Send request
      const res = await fetch(`${baseUrl}/api/wellbit/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "x-api-token": sig,
        },
        body: requestBody,
      });

      const data = await res.json();
      
      setResponse({
        status: res.status,
        statusText: res.statusText,
        data,
        headers: {
          "Content-Type": res.headers.get("Content-Type"),
        },
      });

      if (res.ok) {
        toast.success("Запрос выполнен успешно");
      } else {
        toast.error(`Ошибка: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error("Test error:", error);
      toast.error("Ошибка при выполнении запроса");
      setResponse({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const copySignature = () => {
    if (signature) {
      navigator.clipboard.writeText(signature);
      setCopiedSignature(true);
      toast.success("Подпись скопирована");
      setTimeout(() => setCopiedSignature(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Тестирование Wellbit API
          </DialogTitle>
          <DialogDescription>
            Введите ваши API ключи для тестирования интеграции
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* API Keys Input */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Публичный ключ (x-api-key)</Label>
              <Input
                id="api-key"
                placeholder="Введите публичный ключ"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="private-key">Приватный ключ (для генерации x-api-token)</Label>
              <Input
                id="private-key"
                type="password"
                placeholder="Введите приватный ключ"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
              />
            </div>
          </div>

          {/* Endpoint Selection */}
          <div className="space-y-2">
            <Label>Endpoint</Label>
            <Select value={endpoint} onValueChange={handleEndpointChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment/create">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">POST</Badge>
                    /payment/create
                  </div>
                </SelectItem>
                <SelectItem value="payment/get">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">POST</Badge>
                    /payment/get
                  </div>
                </SelectItem>
                <SelectItem value="payment/status">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">POST</Badge>
                    /payment/status
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Request Body */}
          <div className="space-y-2">
            <Label>Request Body</Label>
            <Textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="font-mono text-sm"
              rows={10}
              placeholder="JSON body"
            />
          </div>

          {/* Generated Signature */}
          {signature && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-medium">Сгенерированная подпись (x-api-token):</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs break-all flex-1 bg-muted px-2 py-1 rounded">
                    {signature}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copySignature}
                    className="shrink-0"
                  >
                    {copiedSignature ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Response */}
          {response && (
            <div className="space-y-2">
              <Label>Response</Label>
              <div className="bg-muted rounded-lg p-4">
                {response.status && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={response.status < 400 ? "success" : "destructive"}>
                      {response.status} {response.statusText}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {response.headers?.["Content-Type"]}
                    </span>
                  </div>
                )}
                <pre className="text-sm overflow-x-auto">
                  <code>
                    {JSON.stringify(response.error || response.data, null, 2)}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleTest} disabled={loading || !apiKey || !privateKey}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Отправить запрос
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}