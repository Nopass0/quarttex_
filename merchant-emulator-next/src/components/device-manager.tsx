'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useEmulatorStore } from '@/lib/stores/emulator-store'
import { Smartphone, Wifi, WifiOff, Plus, Play, Pause } from 'lucide-react'

export function DeviceManager() {
  const { devices, setDevices } = useEmulatorStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    deviceKey: ''
  })
  
  useEffect(() => {
    fetchDevices()
  }, [])
  
  const fetchDevices = async () => {
    const res = await fetch('/api/devices')
    if (res.ok) {
      const data = await res.json()
      setDevices(data)
    }
  }
  
  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    
    if (res.ok) {
      await fetchDevices()
      setShowAddForm(false)
      setFormData({
        name: '',
        deviceKey: ''
      })
    }
  }
  
  const handleToggleConnection = async (deviceId: string, isConnected: boolean) => {
    const device = devices.find(d => d.id === deviceId)
    if (!device) return
    
    if (!isConnected) {
      // Подключаем устройство через API
      const res = await fetch('/api/device/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceCode: device.deviceKey,
          batteryLevel: 100,
          networkInfo: 'Wi-Fi',
          deviceModel: 'Xiaomi Redmi Note 10',
          androidVersion: '13',
          appVersion: '1.0.0'
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'success') {
          alert(`Устройство подключено! Token: ${data.token}`)
        } else {
          alert(`Ошибка: ${data.message}`)
        }
      }
    } else {
      // Отключаем устройство
      await fetch(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isConnected: false, token: null })
      })
    }
    
    await fetchDevices()
  }
  
  const handleToggleActive = async (deviceId: string, isActive: boolean) => {
    await fetch(`/api/devices/${deviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive })
    })
    await fetchDevices()
  }
  
  const handleBulkAction = async (action: string) => {
    await fetch('/api/devices/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })
    await fetchDevices()
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Устройства
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('connect')}
            >
              <Wifi className="w-4 h-4 mr-1" />
              Подключить все
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('disconnect')}
            >
              <WifiOff className="w-4 h-4 mr-1" />
              Отключить все
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Добавить
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showAddForm && (
          <form onSubmit={handleAddDevice} className="mb-4 p-4 border rounded-lg">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Название устройства</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Устройство 1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="deviceKey">Ключ устройства</Label>
                <Input
                  id="deviceKey"
                  value={formData.deviceKey}
                  onChange={(e) => setFormData({ ...formData, deviceKey: e.target.value })}
                  placeholder="device_key_123"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Этот ключ будет использоваться для подключения устройства
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button type="submit">Добавить</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Отмена
              </Button>
            </div>
          </form>
        )}
        
        <div className="space-y-2">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${device.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <div className="font-medium">{device.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Ключ: {device.deviceKey}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={device.isActive}
                  onCheckedChange={() => handleToggleActive(device.id, device.isActive)}
                />
                <Button
                  size="sm"
                  variant={device.isConnected ? 'default' : 'outline'}
                  onClick={() => handleToggleConnection(device.id, device.isConnected)}
                >
                  {device.isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}