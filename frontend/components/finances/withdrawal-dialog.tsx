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
  ArrowUpRight,
  Info,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Wallet
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useTraderFinancials } from "@/hooks/use-trader-financials"

interface WithdrawalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WithdrawalDialog({ open, onOpenChange }: WithdrawalDialogProps) {
  const [amount, setAmount] = useState("")
  const [address, setAddress] = useState("")
  const [step, setStep] = useState(1)
  const [isValidAddress, setIsValidAddress] = useState(false)
  
  const financials = useTraderFinancials()
  const availableBalance = ((financials?.trustBalance || 0) - (financials?.frozenUsdt || 0) - (financials?.deposit || 0))
  const minAmount = 10
  const commission = 1
  
  const validateAddress = (addr: string) => {
    // Basic TRC-20 address validation
    const trcRegex = /^T[A-Za-z0-9]{33}$/
    return trcRegex.test(addr)
  }

  const handleAddressChange = (value: string) => {
    setAddress(value)
    setIsValidAddress(validateAddress(value))
  }

  const handleNextStep = () => {
    if (step === 1) {
      const amountNum = parseFloat(amount)
      if (!amount || amountNum < minAmount) {
        toast.error(`Минимальная сумма вывода: ${minAmount} USDT`)
        return
      }
      if (amountNum > availableBalance) {
        toast.error(`Недостаточно средств. Доступно: ${availableBalance.toFixed(2)} USDT`)
        return
      }
      if (!address || !isValidAddress) {
        toast.error("Введите корректный TRC-20 адрес")
        return
      }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
      // Here you would typically send the withdrawal request to the API
      toast.success("Заявка на вывод создана")
    }
  }

  const handleReset = () => {
    setStep(1)
    setAmount("")
    setAddress("")
    setIsValidAddress(false)
  }

  const getFinalAmount = () => {
    const amountNum = parseFloat(amount) || 0
    return Math.max(0, amountNum - commission)
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
            <ArrowUpRight className="h-5 w-5 text-red-600" />
            Вывод средств
          </DialogTitle>
          <DialogDescription>
            Выведите средства на внешний кошелек
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

          {/* Step 1: Amount and Address */}
          {step === 1 && (
            <div className="space-y-4">
              <Card className="p-4 border-blue-200 bg-blue-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">Доступно к выводу</span>
                  <div className="flex items-center gap-1 text-blue-800">
                    <Wallet className="h-4 w-4" />
                    <span className="font-bold">{availableBalance.toFixed(2)} USDT</span>
                  </div>
                </div>
              </Card>

              <div>
                <Label htmlFor="withdrawal-amount">Сумма вывода</Label>
                <div className="mt-2 relative">
                  <Input
                    id="withdrawal-amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-16"
                    min={minAmount}
                    max={availableBalance}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    USDT
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>Минимум: {minAmount} USDT</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-[#006039] hover:bg-transparent"
                    onClick={() => setAmount(availableBalance.toString())}
                  >
                    Все средства
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="withdrawal-address">Адрес кошелька (TRC-20)</Label>
                <Input
                  id="withdrawal-address"
                  type="text"
                  placeholder="TXYZabcdef1234567890ABCDEFGHIJKLMNOPQRST"
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  className={cn(
                    "mt-2 font-mono text-sm",
                    address && !isValidAddress && "border-red-300 bg-red-50"
                  )}
                />
                {address && !isValidAddress && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>Неверный формат адреса</span>
                  </div>
                )}
              </div>

              <Card className="p-4 border-orange-200 bg-orange-50/50">
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p>• Комиссия сети: {commission} USDT</p>
                    <p>• Время обработки: 5-30 минут</p>
                    <p>• Только TRC-20 адреса</p>
                    <p>• Операция необратима</p>
                  </div>
                </div>
              </Card>

              <Button 
                onClick={handleNextStep}
                className="w-full bg-[#006039] hover:bg-[#006039]/90 text-white"
                disabled={!amount || !address || !isValidAddress || parseFloat(amount) < minAmount}
              >
                Продолжить
              </Button>
            </div>
          )}

          {/* Step 2: Confirmation */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#006039] mb-1">
                  {parseFloat(amount).toFixed(2)} USDT
                </div>
                <div className="text-sm text-gray-600">
                  к выводу
                </div>
              </div>

              <Card className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Сумма</span>
                  <span className="font-medium">{parseFloat(amount).toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Комиссия</span>
                  <span className="font-medium text-red-600">-{commission} USDT</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">К получению</span>
                    <span className="font-bold text-lg">{getFinalAmount().toFixed(2)} USDT</span>
                  </div>
                </div>
              </Card>

              <div>
                <Label className="text-sm text-gray-600">Адрес получателя</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg font-mono text-sm break-all">
                  {address}
                </div>
              </div>

              <Card className="p-4 border-red-200 bg-red-50/50">
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">Проверьте данные!</p>
                    <p>• Операция необратима</p>
                    <p>• Убедитесь в правильности адреса</p>
                    <p>• Средства будут списаны с баланса</p>
                  </div>
                </div>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Назад
                </Button>
                <Button
                  onClick={handleNextStep}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Подтвердить вывод
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(0, 96, 57, 0.05)' }}>
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: '#006039' }} />
                <h3 className="font-semibold text-lg mb-2">Заявка создана</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Ваша заявка на вывод {getFinalAmount().toFixed(2)} USDT принята
                </p>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  В обработке
                </Badge>
              </div>

              <Card className="p-4 border-blue-200 bg-blue-50/50">
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p>• Время обработки: 5-30 минут</p>
                    <p>• Статус можно отследить в разделе "Операции по счету"</p>
                    <p>• Уведомление придет после обработки</p>
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
                  Новый вывод
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}