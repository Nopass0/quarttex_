'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminAuth } from '@/stores/auth'
import { toast } from 'sonner'

export function KkkSettings() {
  const [kkkPercent, setKkkPercent] = useState('')
  const [rapiraKkk, setRapiraKkk] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { token: adminToken } = useAdminAuth()

  useEffect(() => {
    fetchKkkSettings()
  }, [])

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
      setKkkPercent(data.kkkPercent.toString())
      setRapiraKkk((data.rapiraKkk || 0).toString())
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
          kkkPercent: parseFloat(kkkPercent) || 0,
          rapiraKkk: parseFloat(rapiraKkk) || 0,
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
          <Input
            id="kkk"
            type="number"
            step="0.01"
            min="-100"
            max="100"
            value={kkkPercent}
            onChange={(e) => setKkkPercent(e.target.value)}
            placeholder="Введите процент"
          />
          <p className="text-sm text-muted-foreground">
            Коэффициент корректировки курса для расчетов с трейдерами
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rapiraKkk">Процент ККК (%) - Rapira</Label>
          <Input
            id="rapiraKkk"
            type="number"
            step="0.01"
            min="-100"
            max="100"
            value={rapiraKkk}
            onChange={(e) => setRapiraKkk(e.target.value)}
            placeholder="Введите процент"
          />
          <p className="text-sm text-muted-foreground">
            Коэффициент корректировки курса Rapira. Положительное значение увеличивает курс, отрицательное - уменьшает.
          </p>
          {rapiraKkk && (
            <p className="text-xs text-muted-foreground">
              Пример: при курсе 78.89 и ККК {rapiraKkk}% → отображаемый курс {
                (78.89 * (1 + parseFloat(rapiraKkk) / 100)).toFixed(2)
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