'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Trash2, Download } from 'lucide-react'
import { format } from 'date-fns'

interface Log {
  id: string
  type: string
  method: string
  url: string
  headers: string
  body: string | null
  statusCode: number | null
  createdAt: string
  transactionId: string | null
}

export function LogsViewer() {
  const [logs, setLogs] = useState<Log[]>([])
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)
  
  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 2000)
    return () => clearInterval(interval)
  }, [])
  
  const fetchLogs = async () => {
    const res = await fetch('/api/logs')
    if (res.ok) {
      const data = await res.json()
      setLogs(data)
    }
  }
  
  const clearLogs = async () => {
    await fetch('/api/logs', { method: 'DELETE' })
    setLogs([])
    setSelectedLog(null)
  }
  
  const exportLogs = () => {
    const data = JSON.stringify(logs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${Date.now()}.json`
    a.click()
  }
  
  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Логи запросов
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-1" />
              Экспорт
            </Button>
            <Button size="sm" variant="destructive" onClick={clearLogs}>
              <Trash2 className="w-4 h-4 mr-1" />
              Очистить
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="grid grid-cols-2 h-full">
          <ScrollArea className="h-full border-r">
            <div className="p-4 space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedLog?.id === log.id ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        log.type === 'request' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {log.type.toUpperCase()}
                      </span>
                      <span className="font-mono text-sm">{log.method}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), 'HH:mm:ss')}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground truncate">
                    {log.url}
                  </div>
                  {log.statusCode && (
                    <span className={`text-xs ${
                      log.statusCode >= 200 && log.statusCode < 300 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      Status: {log.statusCode}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <ScrollArea className="h-full">
            {selectedLog ? (
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">URL</h3>
                  <code className="text-sm bg-muted p-2 rounded block break-all">
                    {selectedLog.url}
                  </code>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Headers</h3>
                  <pre className="text-sm bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedLog.headers), null, 2)}
                  </pre>
                </div>
                
                {selectedLog.body && (
                  <div>
                    <h3 className="font-semibold mb-2">Body</h3>
                    <pre className="text-sm bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(JSON.parse(selectedLog.body), null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.transactionId && (
                  <div>
                    <h3 className="font-semibold mb-2">Transaction ID</h3>
                    <code className="text-sm bg-muted p-2 rounded block">
                      {selectedLog.transactionId}
                    </code>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Выберите лог для просмотра деталей
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}