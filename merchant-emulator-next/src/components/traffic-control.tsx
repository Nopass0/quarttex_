'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEmulatorStore } from '@/lib/stores/emulator-store'
import { Play, Pause, Zap, Activity } from 'lucide-react'

export function TrafficControl() {
  const { trafficEnabled, setTrafficEnabled, selectedMerchantId } = useEmulatorStore()
  const [loading, setLoading] = useState(false)
  
  const handleToggleTraffic = async () => {
    if (!selectedMerchantId) {
      alert('Выберите мерчанта')
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch('/api/traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: trafficEnabled ? 'stop' : 'start',
          merchantId: selectedMerchantId
        })
      })
      
      if (res.ok) {
        setTrafficEnabled(!trafficEnabled)
      }
    } finally {
      setLoading(false)
    }
  }
  
  const handleSingleTransaction = async () => {
    if (!selectedMerchantId) {
      alert('Выберите мерчанта')
      return
    }
    
    setLoading(true)
    try {
      await fetch('/api/traffic/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: selectedMerchantId })
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Управление трафиком
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Button
            onClick={handleToggleTraffic}
            disabled={loading || !selectedMerchantId}
            variant={trafficEnabled ? 'destructive' : 'default'}
            className="flex-1"
          >
            {trafficEnabled ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Остановить трафик
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Запустить трафик
              </>
            )}
          </Button>
          
          <Button
            onClick={handleSingleTransaction}
            disabled={loading || !selectedMerchantId}
            variant="outline"
          >
            <Zap className="w-4 h-4 mr-2" />
            Одиночная транзакция
          </Button>
        </div>
        
        {!selectedMerchantId && (
          <p className="text-sm text-muted-foreground mt-2">
            Выберите мерчанта для управления трафиком
          </p>
        )}
        
        {trafficEnabled && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              Трафик активен. Транзакции генерируются каждые 5 секунд.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}