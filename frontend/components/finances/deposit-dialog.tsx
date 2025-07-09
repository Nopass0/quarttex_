"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { 
  Copy,
  CheckCircle2,
  Info,
  Wallet,
  ArrowDownRight,
  QrCode,
  Shield,
  Clock
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DepositDialog({ open, onOpenChange }: DepositDialogProps) {
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [amount, setAmount] = useState("")
  const [step, setStep] = useState(1)
  const [showQR, setShowQR] = useState(false)
  
  const depositAddress = "TXYZabcdef1234567890ABCDEFGHIJKLMNOPQRST"
  const minAmount = 10
  
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(depositAddress)
    setCopiedAddress(true)
    toast.success("Адрес скопирован в буфер обмена")
    setTimeout(() => setCopiedAddress(false), 3000)
  }

  const handleNextStep = () => {
    if (step === 1) {
      if (!amount || parseFloat(amount) < minAmount) {
        toast.error(`Минимальная сумма пополнения: ${minAmount} USDT`)
        return
      }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const handleReset = () => {
    setStep(1)
    setAmount("")
    setShowQR(false)
  }

  useEffect(() => {
    if (!open) {
      setTimeout(() => handleReset(), 300)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-green-600" />
            Пополнение баланса
          </DialogTitle>
          <DialogDescription>
            Пополните баланс для участия в сделках
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step >= stepNum
                    ? "bg-[#006039] text-white"
                    : "bg-gray-200 text-gray-600"
                )}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={cn(
                    "w-16 h-0.5 mx-2",
                    step > stepNum ? "bg-[#006039]" : "bg-gray-200"
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Amount */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="deposit-amount">Сумма пополнения</Label>
                <div className="mt-2 relative">
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-16"
                    min={minAmount}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    USDT
                  </span>
                </div>
              </div>

              <Card className="p-4 border-blue-200 bg-blue-50/50">
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p>• Минимальная сумма: {minAmount} USDT</p>
                    <p>• Сеть: TRC-20 (Tron)</p>
                    <p>• Комиссия сети оплачивается отправителем</p>
                    <p>• Зачисление: 1-10 минут</p>
                  </div>
                </div>
              </Card>

              <Button 
                onClick={handleNextStep}
                className="w-full bg-[#006039] hover:bg-[#006039]/90 text-white"
              >
                Продолжить
              </Button>
            </div>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#006039] mb-1">
                  {parseFloat(amount).toFixed(2)} USDT
                </div>
                <div className="text-sm text-gray-600">
                  к пополнению
                </div>
              </div>

              <div>
                <Label>Адрес для пополнения</Label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg font-mono text-sm break-all">
                    {depositAddress}
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyAddress}
                    className="shrink-0"
                  >
                    {copiedAddress ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowQR(!showQR)}
                  className="flex-1"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  QR-код
                </Button>
                <Button
                  onClick={handleNextStep}
                  className="flex-1 bg-[#006039] hover:bg-[#006039]/90 text-white"
                >
                  Отправил
                </Button>
              </div>

              {showQR && (
                <Card className="p-4 text-center">
                  <div className="w-32 h-32 bg-gray-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <QrCode className="h-12 w-12 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-600">
                    QR-код для удобного копирования адреса
                  </div>
                </Card>
              )}

              <Card className="p-4 border-orange-200 bg-orange-50/50">
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium mb-1">Важно!</p>
                    <p>• Отправляйте только USDT по сети TRC-20</p>
                    <p>• Средства с других сетей будут потеряны</p>
                    <p>• Проверьте адрес перед отправкой</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="p-6 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Заявка создана</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Ваша заявка на пополнение {parseFloat(amount).toFixed(2)} USDT принята
                </p>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  Ожидает подтверждения
                </Badge>
              </div>

              <Card className="p-4 border-blue-200 bg-blue-50/50">
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p>• Время зачисления: 1-10 минут</p>
                    <p>• Статус можно отследить в разделе "Заявки на пополнение"</p>
                    <p>• При возникновении проблем обращайтесь в поддержку</p>
                  </div>
                </div>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Закрыть
                </Button>
                <Button
                  onClick={handleReset}
                  className="flex-1 bg-[#006039] hover:bg-[#006039]/90 text-white"
                >
                  Новое пополнение
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}