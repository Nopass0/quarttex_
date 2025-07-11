"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TraderHeader } from "@/components/trader/trader-header";
import {
  Loader2,
  ChevronDown,
  Search,
  ArrowUpDown,
  Calendar,
  Smartphone,
  MessageSquare,
  X,
  SlidersHorizontal,
  CheckCircle,
  Users,
  User,
  Package,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  numericId: number;
  packageName: string;
  text: string;
  timestamp: string;
  deviceId?: string;
  deviceName?: string;
  deviceModel?: string;
  amount?: number;
  currency?: string;
  status: "processed" | "warning" | "danger" | "new";
  isNew?: boolean;
}

const mockMessages: Message[] = [
  {
    id: "90330583",
    numericId: 90330583,
    packageName: "ru.vtb24.mobilebanking.android",
    text: "ВТБ Онлайн | Оплата 412р Карта*7650 YANDEX*4121*TAX Баланс 23636.53р 21:10",
    timestamp: "2025-07-09T20:55:00",
    deviceId: "9d309ffc-2b7d-412d-ace7-d0f21841ba4d",
    deviceName: "Samsung Galaxy S22",
    deviceModel: "SM-S901B",
    amount: 0,
    currency: "RUB",
    status: "processed",
  },
  {
    id: "90305917",
    numericId: 90305917,
    packageName: "ru.sberbankmobile",
    text: "Перевод 14000р от ИВАН И. Баланс: 45320р",
    timestamp: "2025-07-09T18:02:00",
    deviceId: "9d309ffc-2b7d-412d-ace7-d0f21841ba4d",
    deviceName: "iPhone 14 Pro",
    deviceModel: "A2890",
    amount: 14000,
    currency: "RUB",
    status: "processed",
  },
  {
    id: "90154099",
    numericId: 90154099,
    packageName: "ru.vtb24.mobilebanking.android",
    text: "ВТБ Онлайн | Поступление 30000р Счет*5715 от АНИ Н. Баланс 30053.47р 22:42",
    timestamp: "2025-07-07T22:42:00",
    deviceId: "9d309ffc-2b7d-412d-ace7-d0f21841ba4d",
    deviceName: "Xiaomi 12",
    deviceModel: "2201123G",
    amount: 30000,
    currency: "RUB",
    status: "danger",
  },
  {
    id: "90100966",
    numericId: 90100966,
    packageName: "com.idamob.tinkoff.android",
    text: "Пополнение, счет RUB. 4000 RUB. Анастасия В. Доступно 4142 RUB",
    timestamp: "2025-07-07T19:27:00",
    deviceId: "6884a2e4-aa34-4057-9ba8-48c11ce19893",
    deviceName: "OnePlus 10 Pro",
    deviceModel: "NE2213",
    amount: 4000,
    currency: "RUB",
    status: "danger",
  },
];

export function MessagesListNew() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDevice, setFilterDevice] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<"team" | "user">("team");

  const router = useRouter();

  const getFilteredMessages = () => {
    let filtered = messages;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (m) =>
          m.numericId.toString().includes(searchQuery) ||
          m.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.amount && m.amount.toString().includes(searchQuery))
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((m) => m.status === filterStatus);
    }

    // Device filter
    if (filterDevice !== "all") {
      filtered = filtered.filter((m) => m.deviceId === filterDevice);
    }

    // Date filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter((m) => new Date(m.timestamp) >= fromDate);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((m) => new Date(m.timestamp) <= toDate);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case "oldest":
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case "amount_desc":
          return (b.amount || 0) - (a.amount || 0);
        case "amount_asc":
          return (a.amount || 0) - (b.amount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredMessages = getFilteredMessages();

  const formatDateTime = (timestamp: string) => {
    return format(new Date(timestamp), "d MMMM yyyy 'г., в' HH:mm", { locale: ru });
  };

  const getMessageIcon = () => (
    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
      <MessageSquare className="h-6 w-6 text-gray-600" />
    </div>
  );

  const getDeviceIcon = () => (
    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
      <Smartphone className="h-5 w-5 text-gray-500" />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with user info */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Сообщения</h1>
        
        <div className="flex items-center gap-4">
          {/* Team/User toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "team" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("team")}
              className={cn(
                "gap-2",
                viewMode === "team" && "bg-[#006039] hover:bg-[#006039]/90"
              )}
            >
              <Users className="h-4 w-4" />
              Команда
            </Button>
            <Button
              variant={viewMode === "user" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("user")}
              className={cn(
                "gap-2",
                viewMode === "user" && "bg-[#006039] hover:bg-[#006039]/90"
              )}
            >
              <User className="h-4 w-4" />
              Пользователь
            </Button>
          </div>
          
          <TraderHeader />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006039] h-4 w-4" />
          <Input
            placeholder="Поиск по ID, пакету, тексту, устройству..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border h-12 border-gray-300 rounded-lg"
          />
        </div>

        {/* Filters */}
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="default" className="gap-2 h-12 px-6">
              <SlidersHorizontal className="h-4 w-4 text-[#006039]" />
              Не выбраны
              {(filterStatus !== "all" ||
                filterDevice !== "all" ||
                filterDateFrom ||
                filterDateTo) && (
                <Badge className="ml-1 bg-[#006039] text-white">
                  {
                    [
                      filterStatus !== "all",
                      filterDevice !== "all",
                      filterDateFrom || filterDateTo,
                    ].filter(Boolean).length
                  }
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-colors",
                  filtersOpen ? "text-[#006039]" : "text-gray-400"
                )}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[500px]" sideOffset={5}>
            <div className="space-y-4">
              <h4 className="font-medium">Параметры поиска</h4>

              {/* Status Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Статус сообщения</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full justify-between h-12"
                    >
                      <span className="text-[#006039]">
                        {filterStatus === "all"
                          ? "Все сообщения"
                          : filterStatus === "processed"
                          ? "Обработанные"
                          : filterStatus === "danger"
                          ? "Без реквизита"
                          : filterStatus === "warning"
                          ? "Без сделки"
                          : "Новые"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[465px] p-0" align="start" sideOffset={5}>
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12",
                          filterStatus === "all" && "text-[#006039] bg-green-50"
                        )}
                        onClick={() => setFilterStatus("all")}
                      >
                        Все сообщения
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12",
                          filterStatus === "processed" && "text-[#006039] bg-green-50"
                        )}
                        onClick={() => setFilterStatus("processed")}
                      >
                        Обработанные
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12",
                          filterStatus === "danger" && "text-[#006039] bg-green-50"
                        )}
                        onClick={() => setFilterStatus("danger")}
                      >
                        Без реквизита
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12",
                          filterStatus === "warning" && "text-[#006039] bg-green-50"
                        )}
                        onClick={() => setFilterStatus("warning")}
                      >
                        Без сделки
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12",
                          filterStatus === "new" && "text-[#006039] bg-green-50"
                        )}
                        onClick={() => setFilterStatus("new")}
                      >
                        Новые
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Device Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Устройства</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full justify-between h-12"
                    >
                      <span className="text-[#006039]">Все устройства</span>
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[465px] p-0" align="start" sideOffset={5}>
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input placeholder="Поиск устройств" className="pl-9" />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12",
                          filterDevice === "all" && "text-[#006039] bg-green-50"
                        )}
                        onClick={() => setFilterDevice("all")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Smartphone className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">Все устройства</div>
                            <div className="text-sm text-gray-500">
                              Не фильтровать по устройству
                            </div>
                          </div>
                        </div>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Дата получения</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="flex-1 h-12"
                    placeholder="От"
                  />
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="flex-1 h-12"
                    placeholder="До"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-12"
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterDevice("all");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                >
                  Сбросить фильтры
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-12 bg-green-100 hover:bg-green-200 transition-colors duration-150 text-green-500"
                  onClick={() => setFiltersOpen(false)}
                >
                  Применить фильтры
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="default" className="gap-2 h-12 px-6">
              <ArrowUpDown className="h-4 w-4 text-[#006039]" />
              Сортировка
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto" sideOffset={5}>
            <div className="space-y-2">
              <h4 className="font-medium text-base">Сортировать</h4>
              <div className="space-y-1">
                <Button
                  variant={sortBy === "newest" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("newest")}
                >
                  Сначала новые
                </Button>
                <Button
                  variant={sortBy === "oldest" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("oldest")}
                >
                  Сначала старые
                </Button>
                <Button
                  variant={sortBy === "amount_desc" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("amount_desc")}
                >
                  По убыванию суммы
                </Button>
                <Button
                  variant={sortBy === "amount_asc" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("amount_asc")}
                >
                  По возрастанию суммы
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Messages List in ScrollArea */}
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-3">
          {filteredMessages.length === 0 ? (
            <Card className="p-12 text-center text-gray-500">
              Сообщения не найдены
            </Card>
          ) : (
            <>
              {filteredMessages.map((message) => (
                <Card
                  key={message.id}
                  className={cn(
                    "p-4 hover:shadow-md transition-all duration-300 cursor-pointer",
                    message.isNew && "flash-once"
                  )}
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex items-center gap-4">
                    {/* Message Icon */}
                    <div className="flex-shrink-0">{getMessageIcon()}</div>

                    {/* Package name and date */}
                    <div className="w-48 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">
                        {message.packageName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDateTime(message.timestamp)}
                      </div>
                    </div>

                    {/* Device info */}
                    <div className="w-64 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon()}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {message.deviceName}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {message.deviceId?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Message text */}
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {message.text}
                          {message.text.length > 100 && "..."}
                        </div>
                      </div>
                    </div>

                    {/* Amount badge */}
                    <div className="flex-shrink-0 w-32">
                      {message.amount && message.amount > 0 ? (
                        <Badge
                          variant="outline"
                          className="px-4 py-2 text-sm font-bold border rounded-xl bg-green-50 text-green-600 border-green-200 w-full text-center justify-center"
                        >
                          {message.amount.toLocaleString("ru-RU")} RUB
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="px-4 py-2 text-sm font-medium border rounded-xl bg-gray-100 text-gray-600 border-gray-200 w-full text-center justify-center"
                        >
                          0 RUB
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Count */}
      <div className="text-sm text-gray-600">
        Найдено {filteredMessages.length} сообщений
      </div>

      {/* Message Details Dialog */}
      <Dialog
        open={!!selectedMessage}
        onOpenChange={() => setSelectedMessage(null)}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden rounded-3xl">
            <DialogTitle className="sr-only">Детали сообщения</DialogTitle>
            <div className="bg-white">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {selectedMessage && formatDateTime(selectedMessage.timestamp)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMessage(null)}
                  className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-4 w-4 text-[#006039]" />
                </Button>
              </div>

              {selectedMessage && (
                <>
                  {/* Message Icon and Info */}
                  <div className="px-6 py-6 text-center">
                    <div className="mb-4 flex justify-center">
                      <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
                        <MessageSquare className="h-10 w-10 text-gray-600" />
                      </div>
                    </div>

                    <h2 className="text-lg font-semibold mb-1">
                      Сообщение #{selectedMessage.numericId}
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                      {selectedMessage.packageName}
                    </p>
                  </div>

                  {/* Message Content */}
                  <div className="px-6 pb-4 space-y-4">
                    {/* Full message text */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          Текст сообщения
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedMessage.text);
                            toast.success("Текст скопирован");
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Копировать
                        </Button>
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {selectedMessage.text}
                      </p>
                    </div>

                    {/* Device info */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-[#006039]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {selectedMessage.deviceName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedMessage.deviceModel} • {selectedMessage.deviceId?.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                        <ChevronDown className="h-5 w-5 text-[#006039] -rotate-90" />
                      </div>
                    </div>

                    {/* Amount if exists */}
                    {selectedMessage.amount && selectedMessage.amount > 0 && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            Обнаруженная сумма
                          </span>
                          <span className="text-lg font-semibold text-green-600">
                            {selectedMessage.amount.toLocaleString("ru-RU")} RUB
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6">
                    <Button
                      className="w-full bg-[#006039] hover:bg-[#006039]/90"
                      onClick={() => setSelectedMessage(null)}
                    >
                      Закрыть
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}