"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { traderApi } from "@/services/api"
import { formatAmount } from "@/lib/utils"
import { 
  Loader2, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  DollarSign,
  RefreshCw,
  FileText,
  Send,
  Paperclip,
  X as XIcon,
  Image,
  Download,
  User,
  Shield,
  Building2,
  Eye,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Dispute {
  id: string
  uuid: string
  transactionId: string
  transactionNumericId: number
  amount: number
  currency: string
  status: string
  reason: string
  description: string
  createdAt: string
  updatedAt: string
  traderName?: string
  merchantName?: string
  methodName?: string
  orderId?: string
  messages?: DisputeMessage[]
  files?: DisputeFile[]
}

interface DisputeMessage {
  id: string
  senderId: string
  senderType: "TRADER" | "MERCHANT" | "ADMIN"
  senderName: string
  message: string
  createdAt: string
  attachments?: DisputeFile[]
}

interface DisputeFile {
  id: string
  filename: string
  url: string
  size: number
  mimeType: string
  uploadedBy: string
  uploadedAt: string
}

const disputeStatusConfig = {
  OPEN: {
    label: "Открыт",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: AlertCircle
  },
  IN_PROGRESS: {
    label: "На рассмотрении",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Clock
  },
  RESOLVED_SUCCESS: {
    label: "Решен в вашу пользу",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle
  },
  RESOLVED_FAIL: {
    label: "Решен не в вашу пользу",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle
  },
  CANCELLED: {
    label: "Отменен",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: XCircle
  }
}

interface DisputesListEnhancedProps {
  userType: "trader" | "merchant"
}

export function DisputesListEnhanced({ userType }: DisputesListEnhancedProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [filterStatus, setFilterStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 20

  // Messaging state
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [showMessagesDialog, setShowMessagesDialog] = useState(false)
  const [messages, setMessages] = useState<DisputeMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(() => {
    fetchDisputes()
  }, [page, activeTab, sortBy])

  const fetchDisputes = async () => {
    try {
      setLoading(true)
      // Mock data for demonstration
      const mockDisputes: Dispute[] = [
        {
          id: "1",
          uuid: "dispute-uuid-1",
          transactionId: "tx1",
          transactionNumericId: 10001,
          amount: 15000,
          currency: "RUB",
          status: "OPEN",
          reason: "payment_not_received",
          description: "Клиент утверждает что оплатил, но платеж не поступил",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          traderName: "Иван Петров",
          merchantName: "Test Merchant",
          methodName: "Сбербанк C2C",
          orderId: "ORDER-001"
        },
        {
          id: "2",
          uuid: "dispute-uuid-2",
          transactionId: "tx2",
          transactionNumericId: 10002,
          amount: 8500,
          currency: "RUB",
          status: "IN_PROGRESS",
          reason: "incorrect_amount",
          description: "Получена сумма 7500 вместо 8500",
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          traderName: "Анна Смирнова",
          merchantName: "Test Merchant",
          methodName: "Тинькофф C2C",
          orderId: "ORDER-002"
        },
        {
          id: "3",
          uuid: "dispute-uuid-3",
          transactionId: "tx3",
          transactionNumericId: 10003,
          amount: 22000,
          currency: "RUB",
          status: "RESOLVED_SUCCESS",
          reason: "technical_error",
          description: "Платеж завис в системе банка",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 43200000).toISOString(),
          traderName: "Михаил Козлов",
          merchantName: "Test Merchant",
          methodName: "ВТБ C2C",
          orderId: "ORDER-003"
        }
      ]
      
      setDisputes(mockDisputes)
      setHasMore(false)
    } catch (error) {
      console.error("Error fetching disputes:", error)
      toast.error("Не удалось загрузить споры")
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (disputeId: string) => {
    try {
      setLoadingMessages(true)
      // Mock messages
      const mockMessages: DisputeMessage[] = [
        {
          id: "msg1",
          senderId: "merchant123",
          senderType: "MERCHANT",
          senderName: "Test Merchant",
          message: "Платеж не был получен на счет. Прошу предоставить подтверждение оплаты.",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "msg2",
          senderId: "trader123",
          senderType: "TRADER",
          senderName: "Иван Петров",
          message: "Платеж был отправлен. Прикладываю скриншот из банковского приложения.",
          createdAt: new Date(Date.now() - 3000000).toISOString(),
          attachments: [
            {
              id: "file1",
              filename: "payment_screenshot.png",
              url: "https://example.com/payment_screenshot.png",
              size: 245678,
              mimeType: "image/png",
              uploadedBy: "trader123",
              uploadedAt: new Date(Date.now() - 3000000).toISOString()
            }
          ]
        },
        {
          id: "msg3",
          senderId: "admin123",
          senderType: "ADMIN",
          senderName: "Администратор",
          message: "Спор принят на рассмотрение. Ожидайте решения в течение 24 часов.",
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        }
      ]
      setMessages(mockMessages)
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast.error("Не удалось загрузить сообщения")
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleOpenMessages = async (dispute: Dispute) => {
    setSelectedDispute(dispute)
    setShowMessagesDialog(true)
    await fetchMessages(dispute.id)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files).filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Файл ${file.name} слишком большой. Максимум 10MB`)
          return false
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
          toast.error(`Файл ${file.name} имеет неподдерживаемый формат`)
          return false
        }
        return true
      })
      setAttachments([...attachments, ...newFiles])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) {
      toast.error("Введите сообщение или прикрепите файл")
      return
    }

    if (!selectedDispute) return

    try {
      setSendingMessage(true)
      
      // Simulate sending message
      const newMsg: DisputeMessage = {
        id: `msg${Date.now()}`,
        senderId: userType === "trader" ? "trader123" : "merchant123",
        senderType: userType === "trader" ? "TRADER" : "MERCHANT",
        senderName: userType === "trader" ? "Вы" : "Вы",
        message: newMessage,
        createdAt: new Date().toISOString(),
        attachments: attachments.map((file, index) => ({
          id: `file${Date.now()}_${index}`,
          filename: file.name,
          url: URL.createObjectURL(file),
          size: file.size,
          mimeType: file.type,
          uploadedBy: userType === "trader" ? "trader123" : "merchant123",
          uploadedAt: new Date().toISOString()
        }))
      }
      
      setMessages([...messages, newMsg])
      toast.success("Сообщение отправлено")
      setNewMessage("")
      setAttachments([])
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Не удалось отправить сообщение")
    } finally {
      setSendingMessage(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image
    return FileText
  }

  const filteredDisputes = disputes.filter(dispute => {
    // Tab filtering
    if (activeTab !== "all") {
      if (activeTab === "open" && dispute.status !== "OPEN") return false
      if (activeTab === "in_progress" && dispute.status !== "IN_PROGRESS") return false
      if (activeTab === "resolved" && !dispute.status.startsWith("RESOLVED")) return false
      if (activeTab === "cancelled" && dispute.status !== "CANCELLED") return false
    }

    // Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        dispute.transactionNumericId.toString().includes(query) ||
        dispute.traderName?.toLowerCase().includes(query) ||
        dispute.merchantName?.toLowerCase().includes(query) ||
        dispute.orderId?.toLowerCase().includes(query)
      )
    }

    return true
  })

  const sortedDisputes = [...filteredDisputes].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "amount_desc":
        return b.amount - a.amount
      case "amount_asc":
        return a.amount - b.amount
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Споры</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDisputes}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Поиск по номеру, участникам или ID заказа..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Сначала новые</SelectItem>
            <SelectItem value="oldest">Сначала старые</SelectItem>
            <SelectItem value="amount_desc">По сумме ↓</SelectItem>
            <SelectItem value="amount_asc">По сумме ↑</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Все споры
            <Badge variant="secondary" className="ml-2">
              {disputes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="open">
            Открытые
            <Badge variant="secondary" className="ml-2">
              {disputes.filter(d => d.status === "OPEN").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            На рассмотрении
            <Badge variant="secondary" className="ml-2">
              {disputes.filter(d => d.status === "IN_PROGRESS").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Решенные
            <Badge variant="secondary" className="ml-2">
              {disputes.filter(d => d.status.startsWith("RESOLVED")).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Отмененные
            <Badge variant="secondary" className="ml-2">
              {disputes.filter(d => d.status === "CANCELLED").length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Disputes List */}
      <div className="space-y-4">
        {sortedDisputes.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            Нет споров в данной категории
          </Card>
        ) : (
          sortedDisputes.map((dispute) => {
            const statusConfig = disputeStatusConfig[dispute.status as keyof typeof disputeStatusConfig]
            const StatusIcon = statusConfig?.icon || AlertCircle

            return (
              <Card key={dispute.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">Спор #{dispute.transactionNumericId}</h3>
                      <Badge className={cn("border", statusConfig?.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig?.label}
                      </Badge>
                      {(dispute.status === "OPEN" || dispute.status === "IN_PROGRESS") && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Активен
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Сумма</p>
                        <p className="font-medium">{formatAmount(dispute.amount)} ₽</p>
                      </div>
                      <div>
                        <p className="text-gray-600">{userType === "trader" ? "Мерчант" : "Трейдер"}</p>
                        <p className="font-medium flex items-center gap-1">
                          {userType === "trader" ? (
                            <>
                              <Building2 className="h-3 w-3" />
                              {dispute.merchantName || "—"}
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3" />
                              {dispute.traderName || "—"}
                            </>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Метод</p>
                        <p className="font-medium">{dispute.methodName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Дата создания</p>
                        <p className="font-medium">{format(new Date(dispute.createdAt), "d MMM yyyy", { locale: ru })}</p>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-700">
                      <p className="line-clamp-2">{dispute.description}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                      <span>ID заказа: {dispute.orderId || "—"}</span>
                      <span>•</span>
                      <span>Обновлен: {format(new Date(dispute.updatedAt), "d MMM 'в' HH:mm", { locale: ru })}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/trader/deals/${dispute.transactionId}`, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Сделка
                    </Button>
                    <Button
                      onClick={() => handleOpenMessages(dispute)}
                      className="bg-[#006039] hover:bg-[#006039]/90"
                      size="sm"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Чат
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Показано {sortedDisputes.length} споров
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Назад
          </Button>
          <span className="text-sm">Страница {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore || loading}
          >
            Вперед
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Dialog */}
      <Dialog open={showMessagesDialog} onOpenChange={setShowMessagesDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Спор #{selectedDispute?.transactionNumericId}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-6 h-[calc(90vh-120px)]">
            {/* Messages Section */}
            <div className="col-span-2 flex flex-col">
              <ScrollArea className="flex-1 border rounded-lg p-4 mb-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-[#006039]" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isMerchant = message.senderType === "MERCHANT"
                      const isAdmin = message.senderType === "ADMIN"
                      const isTrader = message.senderType === "TRADER"
                      const isCurrentUser = (userType === "trader" && isTrader) || (userType === "merchant" && isMerchant)

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3",
                            isCurrentUser && "flex-row-reverse"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-full",
                            isMerchant && "bg-purple-100",
                            isAdmin && "bg-gray-100",
                            isTrader && "bg-green-100"
                          )}>
                            {isMerchant && <Building2 className="h-4 w-4 text-purple-600" />}
                            {isAdmin && <Shield className="h-4 w-4 text-gray-600" />}
                            {isTrader && <User className="h-4 w-4 text-green-600" />}
                          </div>
                          
                          <div className={cn(
                            "flex-1 space-y-2",
                            isCurrentUser && "items-end"
                          )}>
                            <div className={cn(
                              "rounded-lg p-3 max-w-[80%]",
                              isMerchant && "bg-purple-50 text-purple-900",
                              isAdmin && "bg-gray-50 text-gray-900",
                              isTrader && "bg-green-50 text-green-900",
                              isCurrentUser && "ml-auto"
                            )}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">{message.senderName}</span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(message.createdAt), "HH:mm")}
                                </span>
                              </div>
                              <p className="text-sm">{message.message}</p>
                              
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {message.attachments.map((attachment) => {
                                    const FileIcon = getFileIcon(attachment.mimeType)
                                    return (
                                      <a
                                        key={attachment.id}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 rounded bg-white/50 hover:bg-white/80 transition-colors"
                                      >
                                        <FileIcon className="h-4 w-4" />
                                        <span className="text-xs flex-1 truncate">
                                          {attachment.filename}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {formatFileSize(attachment.size)}
                                        </span>
                                        <Download className="h-3 w-3" />
                                      </a>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Input area */}
              {selectedDispute && (selectedDispute.status === "OPEN" || selectedDispute.status === "IN_PROGRESS") ? (
                <div className="space-y-3">
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <button
                            onClick={() => removeAttachment(index)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Введите сообщение..."
                        className="pr-10 min-h-[80px]"
                        disabled={sendingMessage}
                      />
                      <label className="absolute bottom-2 right-2 cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                          disabled={sendingMessage}
                        />
                        <Paperclip className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      </label>
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || (!newMessage.trim() && attachments.length === 0)}
                      className="bg-[#006039] hover:bg-[#006039]/90"
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>Спор закрыт</p>
                </div>
              )}
            </div>

            {/* Files Section */}
            <div className="col-span-1 border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Файлы спора</h3>
              <ScrollArea className="h-[calc(100%-2rem)]">
                <div className="space-y-2">
                  {messages.flatMap(msg => msg.attachments || []).map((file) => {
                    const FileIcon = getFileIcon(file.mimeType)
                    return (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <FileIcon className="h-8 w-8 text-[#006039]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.filename}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)} • {format(new Date(file.uploadedAt), "d MMM 'в' HH:mm", { locale: ru })}
                          </p>
                        </div>
                        <Download className="h-4 w-4 text-gray-400" />
                      </a>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}