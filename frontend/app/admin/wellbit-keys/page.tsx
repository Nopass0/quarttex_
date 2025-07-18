'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { adminApi } from '@/services/api'
import { toast } from 'sonner'

interface Keys {
  apiKeyPublic: string | null
  apiKeyPrivate: string | null
}

export default function WellbitKeysPage() {
  const [keys, setKeys] = useState<Keys | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  const fetchKeys = async () => {
    setLoading(true)
    try {
      const data = await adminApi.getWellbitKeys()
      setKeys(data)
    } catch {
      toast.error('Не удалось получить ключи')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const regenerate = async () => {
    setRegenerating(true)
    try {
      const data = await adminApi.regenerateWellbitKeys()
      setKeys(data)
      toast.success('Ключи обновлены')
    } catch {
      toast.error('Не удалось обновить ключи')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading || !keys) {
    return (
      <ProtectedRoute variant="admin">
        <AuthLayout variant="admin">
          <div className="flex items-center justify-center min-h-[200px]">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </AuthLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Wellbit API Keys</h1>
          <Card>
            <CardHeader>
              <CardTitle>Current Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="font-medium">Public:</span>
                <code className="ml-2 break-all bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {keys.apiKeyPublic || '—'}
                </code>
              </div>
              <div>
                <span className="font-medium">Private:</span>
                <code className="ml-2 break-all bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {keys.apiKeyPrivate || '—'}
                </code>
              </div>
              <Button onClick={regenerate} disabled={regenerating}>
                {regenerating && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                Regenerate
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}
