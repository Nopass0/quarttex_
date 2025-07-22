'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminAuth } from '@/stores/auth'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRapiraRate } from '@/hooks/use-rapira-rate'

export function KkkSettings() {
  const [kkkPercent, setKkkPercent] = useState('')
  const [kkkOperation, setKkkOperation] = useState<'increase' | 'decrease'>('decrease')
  const [rapiraKkk, setRapiraKkk] = useState('')
  const [rapiraOperation, setRapiraOperation] = useState<'increase' | 'decrease'>('increase')
  const [isLoading, setIsLoading] = useState(false)
  const { token: adminToken } = useAdminAuth()
  const { baseRate: currentRapiraRate, refetch: refetchRapiraRate } = useRapiraRate()

  useEffect(() => {
    fetchKkkSettings()
  }, [])

  // Auto-refresh Rapira rate every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchRapiraRate()
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [refetchRapiraRate])

  const fetchKkkSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/kkk-settings`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch KKK settings')
      
      const data = await response.json()
      const kkkValue = Math.abs(data.kkkPercent)
      setKkkPercent(kkkValue.toString())
      setKkkOperation(data.kkkPercent >= 0 ? 'increase' : 'decrease')
      
      const rapiraValue = Math.abs(data.rapiraKkk || 0)
      setRapiraKkk(rapiraValue.toString())
      setRapiraOperation((data.rapiraKkk || 0) >= 0 ? 'increase' : 'decrease')
    } catch (error) {
      toast.error('Не удалось загрузить настройки ККК')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/kkk-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          kkkPercent: (parseFloat(kkkPercent) || 0) * (kkkOperation === 'decrease' ? -1 : 1),
          rapiraKkk: (parseFloat(rapiraKkk) || 0) * (rapiraOperation === 'decrease' ? -1 : 1),
        }),
      })
      
      if (!response.ok) throw new Error('Failed to save KKK settings')
      
      toast.success('Настройки ККК сохранены')
    } catch (error) {
      toast.error('Не удалось сохранить настройки ККК')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="kkk">Процент ККК (%) - Для трейдеров</Label>
          <div className="flex gap-2">
            <Select value={kkkOperation} onValueChange={(value: 'increase' | 'decrease') => setKkkOperation(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Увеличить</SelectItem>
                <SelectItem value="decrease">Уменьшить</SelectItem>
              </SelectContent>
            </Select>
            <Input
              id="kkk"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={kkkPercent}
              onChange={(e) => setKkkPercent(e.target.value)}
              placeholder="0"
              className="flex-1"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Коэффициент корректировки курса для расчетов с трейдерами
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rapiraKkk">Процент ККК (%) - Отображаемый курс на платформе</Label>
          <div className="flex gap-2">
            <Select value={rapiraOperation} onValueChange={(value: 'increase' | 'decrease') => setRapiraOperation(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Увеличить</SelectItem>
                <SelectItem value="decrease">Уменьшить</SelectItem>
              </SelectContent>
            </Select>
            <Input
              id="rapiraKkk"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={rapiraKkk}
              onChange={(e) => setRapiraKkk(e.target.value)}
              placeholder="0"
              className="flex-1"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Коэффициент корректировки курса Rapira для отображения на платформе
          </p>
          {currentRapiraRate && (
            <p className="text-xs text-muted-foreground mt-2">
              Текущий курс Rapira: <span className="font-medium">{currentRapiraRate.toFixed(2)} ₽/USDT</span>
            </p>
          )}
          {rapiraKkk && currentRapiraRate && (
            <p className="text-xs text-muted-foreground">
              Пример: при курсе {currentRapiraRate.toFixed(2)} → {rapiraOperation === 'increase' ? 'увеличить' : 'уменьшить'} на {rapiraKkk}% → отображаемый курс {
                (currentRapiraRate * (1 + (parseFloat(rapiraKkk) / 100) * (rapiraOperation === 'decrease' ? -1 : 1))).toFixed(2)
              } ₽
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={handleSave}
        className="w-full bg-[#006039] hover:bg-[#005030]"
        disabled={isLoading}
      >
        Сохранить настройки
      </Button>
    </div>
  )
}