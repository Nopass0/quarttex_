'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useEmulatorStore } from '@/lib/stores/emulator-store'
import { Store, Plus, Copy } from 'lucide-react'

export function MerchantManager() {
  const { merchants, setMerchants, selectedMerchantId, setSelectedMerchantId } = useEmulatorStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    liquidity: 0.7,
    minAmount: 100,
    maxAmount: 100000
  })
  
  useEffect(() => {
    fetchMerchants()
  }, [])
  
  const fetchMerchants = async () => {
    const res = await fetch('/api/merchants')
    if (res.ok) {
      const data = await res.json()
      setMerchants(data)
    }
  }
  
  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/merchants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    
    if (res.ok) {
      await fetchMerchants()
      setShowAddForm(false)
      setFormData({
        name: '',
        liquidity: 0.7,
        minAmount: 100,
        maxAmount: 100000
      })
    }
  }
  
  const handleToggleActive = async (merchantId: string, isActive: boolean) => {
    await fetch(`/api/merchants/${merchantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive })
    })
    await fetchMerchants()
  }
  
  const handleUpdateLiquidity = async (merchantId: string, liquidity: number) => {
    await fetch(`/api/merchants/${merchantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ liquidity })
    })
    await fetchMerchants()
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Мерчанты
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Добавить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showAddForm && (
          <form onSubmit={handleAddMerchant} className="mb-4 p-4 border rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="liquidity">Ликвидность (%)</Label>
                <Input
                  id="liquidity"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.liquidity}
                  onChange={(e) => setFormData({ ...formData, liquidity: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="minAmount">Мин. сумма</Label>
                <Input
                  id="minAmount"
                  type="number"
                  value={formData.minAmount}
                  onChange={(e) => setFormData({ ...formData, minAmount: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="maxAmount">Макс. сумма</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData({ ...formData, maxAmount: parseFloat(e.target.value) })}
                  required
                />
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
          {merchants.map((merchant) => (
            <div
              key={merchant.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedMerchantId === merchant.id ? 'bg-accent' : ''
              }`}
              onClick={() => setSelectedMerchantId(merchant.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${merchant.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <div className="font-medium">{merchant.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {merchant.minAmount} - {merchant.maxAmount} ₽
                    </div>
                  </div>
                </div>
                <Switch
                  checked={merchant.isActive}
                  onCheckedChange={() => handleToggleActive(merchant.id, merchant.isActive)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">API Key:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-muted px-2 py-1 rounded text-xs flex-1 overflow-x-auto">{merchant.apiKey}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(merchant.apiKey)
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <span className="text-muted-foreground">API Secret:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-muted px-2 py-1 rounded text-xs flex-1 overflow-x-auto">{merchant.apiSecret}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(merchant.apiSecret)
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor={`liquidity-${merchant.id}`}>Ликвидность:</Label>
                  <Input
                    id={`liquidity-${merchant.id}`}
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={merchant.liquidity}
                    onChange={(e) => handleUpdateLiquidity(merchant.id, parseFloat(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-20 h-8"
                  />
                  <span className="text-muted-foreground">({Math.round(merchant.liquidity * 100)}%)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}