"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { traderApi } from "@/services/api"
import { 
  ArrowLeft,
  Copy,
  Smartphone,
  WifiOff,
  Wifi,
  Battery,
  Loader2,
  MessageSquare,
  Hash,
  Calendar,
  Power,
  Send,
  Shield,
  Globe,
  CreditCard,
  Play,
  QrCode,
  Signal,
  Pause,
  RefreshCw,
  Trash2,
  ChevronRight,
  CheckCircle,
  Clock,
  ChevronDown,
  Settings,
  Star,
  MessageCircle,
  Users,
  MoreVertical,
} from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { cn } from "@/lib/utils"
import QRCode from "qrcode"

interface DeviceData {
  id: string
  name: string
  token: string
  isOnline: boolean
  energy?: number
  ethernetSpeed?: number
  lastSeen?: string
  createdAt: string
  browser?: string
  os?: string
  ip?: string
  location?: string
  isTrusted?: boolean
  notifications: number
  model?: string
  fingerprint?: string
  simNumber?: string
  isWorking?: boolean
  lastHealthCheck?: string
  linkedBankDetails?: any[]
  batteryLevel?: number
  networkInfo?: string
  androidVersion?: string
}

interface Message {
  id: string
  type: 'sms' | 'push' | 'call'
  sender: string
  content: string
  timestamp: string
  status: 'delivered' | 'read' | 'pending'
}

export default function DeviceDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [device, setDevice] = useState<DeviceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("sms")
  const [messages, setMessages] = useState<Message[]>([])
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")

  useEffect(() => {
    fetchDevice()
  }, [params.id])

  useEffect(() => {
    if (device?.id) {
      // Auto-refresh messages every 5 seconds
      const interval = setInterval(async () => {
        try {
          const messagesResponse = await traderApi.getMessages({ 
            deviceId: device.id,
            limit: 20
          })
          const formattedMessages = messagesResponse.data?.map((msg: any) => ({
            id: msg.id,
            type: msg.type === 'AppNotification' ? 'push' : msg.type === 'SMS' ? 'sms' : 'call',
            sender: msg.appName || msg.sender || 'Неизвестно',
            content: msg.message || msg.content,
            timestamp: msg.createdAt || msg.timestamp,
            status: msg.isProcessed ? 'read' : 'delivered'
          })) || []
          setMessages(formattedMessages)
        } catch (error) {
          console.error('Error refreshing messages:', error)
        }
      }, 5000)
      
      return () => clearInterval(interval)
    }
  }, [device?.id])

  const fetchDevice = async () => {
    try {
      setLoading(true)
      const deviceData = await traderApi.getDevice(params.id as string)
      setDevice(deviceData)
      
      // Generate QR code
      const qrData = JSON.stringify({
        token: deviceData.token,
        deviceId: deviceData.id,
        timestamp: Date.now()
      })
      
      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeUrl(qrUrl)
      
      // Fetch real messages
      try {
        const messagesResponse = await traderApi.getMessages({ 
          deviceId: deviceData.id,
          limit: 20
        })
        const formattedMessages = messagesResponse.data?.map((msg: any) => ({
          id: msg.id,
          type: msg.type === 'AppNotification' ? 'push' : msg.type === 'SMS' ? 'sms' : 'call',
          sender: msg.appName || msg.sender || 'Неизвестно',
          content: msg.message || msg.content,
          timestamp: msg.createdAt || msg.timestamp,
          status: msg.isProcessed ? 'read' : 'delivered'
        })) || []
        setMessages(formattedMessages)
      } catch (msgError) {
        console.error('Error fetching messages:', msgError)
      }
    } catch (error) {
      console.error('Error fetching device:', error)
      toast.error("Не удалось загрузить данные устройства")
      router.push("/trader/devices")
    } finally {
      setLoading(false)
    }
  }

  if (loading || !device) {
    return (
      <ProtectedRoute variant="trader">
        <AuthLayout variant="trader">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
          </div>
        </AuthLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/trader/devices")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-semibold">Устройство</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchDevice()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowQrDialog(true)}
              >
                <QrCode className="h-4 w-4" />
              </Button>
              {device.isOnline ? (
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    try {
                      await traderApi.stopDevice(device.id)
                      toast.success("Устройство остановлено")
                      await fetchDevice()
                    } catch (error) {
                      console.error("Error stopping device:", error)
                      toast.error("Не удалось остановить устройство")
                    }
                  }}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Остановить
                </Button>
              ) : (
                <Button 
                  className="bg-[#006039] hover:bg-[#006039]/90"
                  size="sm"
                  onClick={async () => {
                    try {
                      await traderApi.startDevice(device.id)
                      toast.success("Устройство запущено")
                      await fetchDevice()
                    } catch (error) {
                      console.error("Error starting device:", error)
                      toast.error("Не удалось запустить устройство")
                    }
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Запустить
                </Button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Phone Mockup */}
            <div className="lg:col-span-1">
              <Card className="p-6">
                <div className="relative mx-auto w-[280px] h-[560px]">
                  {/* Phone Frame */}
                  <div className="absolute inset-0 bg-gray-900 rounded-[40px] border-[3px] border-gray-800">
                    {/* Side Buttons */}
                    {/* Volume Buttons */}
                    <div className="absolute -left-[3px] top-[120px] w-[3px] h-[40px] bg-gray-700 rounded-l-sm" />
                    <div className="absolute -left-[3px] top-[170px] w-[3px] h-[40px] bg-gray-700 rounded-l-sm" />
                    {/* Power Button */}
                    <div className="absolute -right-[3px] top-[150px] w-[3px] h-[60px] bg-gray-700 rounded-r-sm" />
                    
                    {/* Screen */}
                    <div className="absolute inset-[3px] bg-white rounded-[37px] overflow-hidden">
                      {/* Status Bar */}
                      <div className="bg-white px-4 py-2 flex justify-between items-center text-xs">
                        <span className="font-medium">{new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="flex items-center gap-1">
                          <Signal className="w-3 h-3" />
                          {device.isOnline ? (
                            <Wifi className="w-3 h-3" />
                          ) : (
                            <WifiOff className="w-3 h-3 text-gray-400" />
                          )}
                          <Battery className="w-4 h-3" />
                          <span className="text-[10px] font-medium">{device.energy || device.batteryLevel || 0}%</span>
                        </div>
                      </div>
                      
                      {/* App Content */}
                      <div className="p-4 h-full bg-gray-50">
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-[#006039] rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <Smartphone className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="font-semibold">{device.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {device.isOnline ? 'Подключено' : 'Не подключено'}
                            </p>
                            {device.isOnline && (
                              <div className="mt-4 space-y-2 text-xs text-gray-600">
                                <p>Батарея: {device.energy || device.batteryLevel || 0}%</p>
                                <p>Сеть: {device.ethernetSpeed || 0} Mbps</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Device Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Smartphone className="h-5 w-5 text-[#006039]" />
                    <Badge className={device.isOnline ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-700 border-0"}>
                      {device.isOnline ? 'Онлайн' : 'Офлайн'}
                    </Badge>
                  </div>
                  <h3 className="font-semibold mb-1">{device.name}</h3>
                  <p className="text-sm text-gray-500">{device.model || device.os || 'Неизвестная модель'}</p>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Globe className="h-5 w-5 text-[#006039]" />
                    <span className="text-sm text-gray-500">Сеть</span>
                  </div>
                  <h3 className="font-semibold mb-1">{device.ip || '192.168.1.1'}</h3>
                  <p className="text-sm text-gray-500">{device.browser || 'Chrome'} • {device.os || 'Android'}</p>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Battery className="h-5 w-5 text-[#006039]" />
                    <span className="text-sm text-gray-500">Батарея</span>
                  </div>
                  <h3 className="font-semibold mb-1">{device.energy || device.batteryLevel || 0}%</h3>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#006039] h-2 rounded-full" 
                      style={{ width: `${device.energy || device.batteryLevel || 0}%` }}
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Shield className="h-5 w-5 text-[#006039]" />
                    <span className="text-sm text-gray-500">Безопасность</span>
                  </div>
                  <h3 className="font-semibold mb-1">
                    {device.isTrusted ? 'Доверенное' : 'Не проверено'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Последняя проверка: {device.lastHealthCheck ? format(new Date(device.lastHealthCheck), 'dd.MM.yyyy', { locale: ru }) : 'Никогда'}
                  </p>
                </Card>
              </div>

              {/* Requisites Section */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Привязанные реквизиты</h3>
                  <Button size="sm" className="bg-[#006039] hover:bg-[#006039]/90">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </div>
                
                {device.linkedBankDetails && device.linkedBankDetails.length > 0 ? (
                  <div className="space-y-3">
                    {device.linkedBankDetails.map((req: any) => (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="font-medium">**** {req.cardNumber?.slice(-4) || '0000'}</p>
                            <p className="text-sm text-gray-500">{req.bankType} • {req.recipientName}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {req.isActive ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Нет привязанных реквизитов</p>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Tabs Section */}
          <Card>
            <Tabs defaultValue="sms" className="w-full">
              <div className="border-b">
                <TabsList className="h-12 p-0 bg-transparent rounded-none w-full justify-start">
                  <TabsTrigger 
                    value="sms" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#006039] rounded-none px-6"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    SMS
                  </TabsTrigger>
                  <TabsTrigger 
                    value="push" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#006039] rounded-none px-6"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Push-уведомления
                  </TabsTrigger>
                  <TabsTrigger 
                    value="calls" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#006039] rounded-none px-6"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Звонки
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="sms" className="p-6 space-y-4">
                {messages.filter(m => m.type === 'sms').length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Нет SMS сообщений</p>
                  </div>
                ) : (
                  messages.filter(m => m.type === 'sms').map((message) => (
                  <div key={message.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{message.sender}</span>
                          <Badge variant="outline" className="text-xs">
                            {message.status === 'delivered' ? 'Доставлено' : 'Прочитано'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">{message.content}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {format(new Date(message.timestamp), "d MMMM yyyy 'в' HH:mm", { locale: ru })}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="ml-4">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
                )}
              </TabsContent>

              <TabsContent value="push" className="p-6 space-y-4">
                {messages.filter(m => m.type === 'push').length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Нет push-уведомлений</p>
                  </div>
                ) : (
                  messages.filter(m => m.type === 'push').map((message) => (
                    <div key={message.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{message.sender}</span>
                            <Badge variant="outline" className="text-xs">
                              {message.status === 'delivered' ? 'Доставлено' : 'Прочитано'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">{message.content}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {format(new Date(message.timestamp), "d MMMM yyyy 'в' HH:mm", { locale: ru })}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="ml-4">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="calls" className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Нет звонков</p>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* QR Code Dialog */}
        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>QR-код для подключения</DialogTitle>
              <DialogDescription>
                Отсканируйте этот код в приложении для подключения устройства
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center space-y-4">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
              )}
              
              <div className="w-full space-y-2">
                <div className="text-sm text-gray-500">Код устройства</div>
                <div className="flex gap-2">
                  <Input
                    value={device.token}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(device.token)
                      toast.success("Код скопирован")
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQrDialog(false)}>
                Закрыть
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AuthLayout>
    </ProtectedRoute>
  )
}