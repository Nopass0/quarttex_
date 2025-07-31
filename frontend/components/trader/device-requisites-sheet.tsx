"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { traderApi } from "@/services/api";
import { formatDateTime, cn } from "@/lib/utils";
import { 
  Loader2, 
  ArrowLeft,
  Plus,
  CreditCard,
  Building2,
  Calendar,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Ban,
  TrendingUp,
  DollarSign
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBankIcon } from "@/lib/bank-utils";

const formSchema = z.object({
  methodId: z.string().min(1, "Выберите метод"),
  bankType: z.string().min(1, "Выберите банк"),
  cardNumber: z.string().optional(),
  recipientName: z.string().min(3, "Введите имя получателя"),
  phoneNumber: z.string().optional(),
  minAmount: z.number().min(100),
  maxAmount: z.number().min(1000),
  dailyLimit: z.number().min(0),
  monthlyLimit: z.number().min(0),
  maxCountTransactions: z.number().min(0),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface Method {
  id: string;
  name: string;
  type: string;
  minAmount: number;
  maxAmount: number;
  minPayin: number;
  maxPayin: number;
}

interface DeviceRequisite {
  id: string;
  cardNumber: string;
  bankType: string;
  recipientName: string;
  isArchived: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  turnoverDay: number;
  turnoverTotal: number;
  minAmount: number;
  maxAmount: number;
  maxCountTransactions: number;
  method?: {
    id: string;
    type: string;
    name: string;
  };
}

interface DeviceRequisitesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  onSuccess?: () => void;
  existingRequisite?: DeviceRequisite;
}

const AVAILABLE_BANKS = [
  { code: "SBERBANK", label: "Сбербанк" },
  { code: "TBANK", label: "Т-Банк" },
  { code: "VTB", label: "ВТБ" },
  { code: "ALFABANK", label: "Альфа-Банк" },
  { code: "RAIFFEISEN", label: "Райффайзенбанк" },
  { code: "GAZPROMBANK", label: "Газпромбанк" },
  { code: "OTPBANK", label: "ОТП Банк" },
  { code: "OTKRITIE", label: "Открытие" },
  { code: "ROSBANK", label: "Росбанк" },
  { code: "PROMSVYAZBANK", label: "Промсвязьбанк" },
  { code: "SOVCOMBANK", label: "Совкомбанк" },
  { code: "POCHTABANK", label: "Почта Банк" },
  { code: "ROSSELKHOZBANK", label: "Россельхозбанк" },
  { code: "MKB", label: "МКБ" },
  { code: "URALSIB", label: "Уралсиб" },
  { code: "AKBARS", label: "Ак Барс" },
  { code: "SPBBANK", label: "Банк Санкт-Петербург" },
  { code: "MTSBANK", label: "МТС Банк" },
  { code: "OZONBANK", label: "Озон Банк" },
  { code: "RENAISSANCE", label: "Ренессанс" },
  { code: "OTP", label: "ОТП Банк" },
  { code: "AVANGARD", label: "Авангард" },
  { code: "RNKB", label: "РНКБ" },
  { code: "LOKOBANK", label: "Локо-Банк" },
  { code: "RUSSIANSTANDARD", label: "Русский Стандарт" },
  { code: "HOMECREDIT", label: "Хоум Кредит" },
  { code: "UNICREDIT", label: "ЮниКредит" },
  { code: "CITIBANK", label: "Ситибанк" },
  { code: "BCSBANK", label: "БКС Банк" },
  { code: "ABSOLUTBANK", label: "Абсолют Банк" },
  { code: "SVOYBANK", label: "Свой Банк" },
  { code: "TRANSKAPITALBANK", label: "Транскапиталбанк" },
  { code: "MTSMONEY", label: "МТС Деньги" },
  { code: "FORABANK", label: "Фора-Банк" },
  { code: "CREDITEUROPE", label: "Кредит Европа" },
  { code: "BBRBANK", label: "ББР Банк" },
  { code: "UBRIR", label: "УБРиР" },
  { code: "GENBANK", label: "Генбанк" },
  { code: "SINARA", label: "Синара" },
  { code: "VLADBUSINESSBANK", label: "Владбизнесбанк" },
  { code: "TAVRICHESKIY", label: "Таврический" },
  { code: "DOLINSK", label: "Долинск" }
];

export function DeviceRequisitesSheet({
  open,
  onOpenChange,
  deviceId,
  onSuccess,
  existingRequisite,
}: DeviceRequisitesSheetProps) {
  const [loading, setLoading] = useState(false);
  const [requisites, setRequisites] = useState<DeviceRequisite[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRequisite, setEditingRequisite] = useState<DeviceRequisite | null>(null);
  const [requisitesLoading, setRequisitesLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      methodId: "",
      bankType: "",
      cardNumber: "",
      recipientName: "",
      phoneNumber: "",
      minAmount: 1000,
      maxAmount: 100000,
      dailyLimit: 500000,
      monthlyLimit: 10000000,
      maxCountTransactions: 5,
      isActive: true,
    },
  });

  useEffect(() => {
    if (open && !showForm) {
      fetchRequisites();
      fetchMethods();
    }
  }, [open, showForm, deviceId]);

  useEffect(() => {
    if (existingRequisite) {
      setEditingRequisite(existingRequisite);
      setShowForm(true);
      // Pre-select method if available
      if (existingRequisite.method) {
        const method = methods.find(m => m.type === existingRequisite.method?.type);
        if (method) {
          setSelectedMethod(method);
          form.setValue("methodId", method.type);
        }
      }
      form.reset({
        methodId: existingRequisite.method?.type || "",
        bankType: existingRequisite.bankType,
        cardNumber: existingRequisite.cardNumber,
        recipientName: existingRequisite.recipientName,
        phoneNumber: "",
        minAmount: existingRequisite.minAmount,
        maxAmount: existingRequisite.maxAmount,
        dailyLimit: existingRequisite.dailyLimit,
        monthlyLimit: existingRequisite.monthlyLimit,
        maxCountTransactions: existingRequisite.maxCountTransactions,
      });
    }
  }, [existingRequisite, methods, form]);

  const fetchRequisites = async () => {
    try {
      setRequisitesLoading(true);
      const response = await traderApi.getDevice(deviceId);
      setRequisites(response.linkedBankDetails || []);
    } catch (error) {
      console.error("Failed to fetch device requisites:", error);
      toast.error("Не удалось загрузить реквизиты");
    } finally {
      setRequisitesLoading(false);
    }
  };

  const fetchMethods = async () => {
    try {
      const response = await traderApi.getMethods();
      const methodsData = response.data || response.methods || response || [];
      setMethods(Array.isArray(methodsData) ? methodsData : []);
    } catch (error) {
      console.error("Error fetching methods:", error);
      toast.error("Не удалось загрузить методы");
    }
  };

  const handleAddNew = () => {
    setEditingRequisite(null);
    form.reset({
      methodId: "",
      bankType: "",
      cardNumber: "",
      recipientName: "",
      phoneNumber: "",
      minAmount: 1000,
      maxAmount: 100000,
      dailyLimit: 500000,
      monthlyLimit: 10000000,
      maxCountTransactions: 5,
      isActive: true,
    });
    setShowForm(true);
  };

  const handleEdit = (requisite: DeviceRequisite) => {
    setEditingRequisite(requisite);
    // Pre-select method based on card number pattern
    const methodType = requisite.cardNumber.length <= 12 ? "sbp" : "c2c";
    const method = methods.find(m => m.type === methodType);
    if (method) {
      setSelectedMethod(method);
      form.setValue("methodId", methodType);
    }
    
    form.reset({
      methodId: methodType,
      bankType: requisite.bankType,
      cardNumber: methodType === "c2c" ? requisite.cardNumber : "",
      recipientName: requisite.recipientName,
      phoneNumber: methodType === "sbp" ? requisite.cardNumber : "",
      minAmount: requisite.minAmount,
      maxAmount: requisite.maxAmount,
      dailyLimit: requisite.dailyLimit,
      monthlyLimit: requisite.monthlyLimit,
      maxCountTransactions: requisite.maxCountTransactions,
      isActive: !requisite.isArchived,
    });
    setShowForm(true);
  };

  const handleDelete = async (requisiteId: string) => {
    if (!confirm("Вы уверены, что хотите отвязать этот реквизит от устройства?")) return;

    try {
      await traderApi.unlinkDevice(deviceId, requisiteId);
      toast.success("Реквизит отвязан от устройства");
      fetchRequisites();
    } catch (error) {
      console.error("Failed to unlink requisite:", error);
      toast.error("Не удалось отвязать реквизит");
    }
  };

  const handleToggleArchive = async (requisite: DeviceRequisite) => {
    try {
      await traderApi.updateRequisite(requisite.id, {
        isArchived: !requisite.isArchived,
      });
      toast.success(requisite.isArchived ? "Реквизит активирован" : "Реквизит архивирован");
      fetchRequisites();
    } catch (error) {
      console.error("Failed to toggle requisite status:", error);
      toast.error("Не удалось изменить статус реквизита");
    }
  };

  const handleMethodChange = (methodType: string) => {
    const method = methods.find(m => m.type === methodType);
    setSelectedMethod(method || null);
    
    if (method) {
      form.setValue("minAmount", method.minPayin || 1000);
      form.setValue("maxAmount", method.maxPayin || 100000);
    }
    
    form.setValue("bankType", "");
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (!selectedMethod) {
        toast.error("Выберите метод");
        return;
      }

      // Validate required fields based on method type
      if (selectedMethod.type === "c2c" && !data.cardNumber) {
        toast.error("Введите номер карты");
        return;
      }

      if (selectedMethod.type === "sbp" && !data.phoneNumber) {
        toast.error("Введите номер телефона");
        return;
      }

      const actualMethod = methods.find(m => m.type === selectedMethod.type);
      
      const requisiteData = {
        ...data,
        deviceId,
        methodId: actualMethod?.id || data.methodId,
        methodType: selectedMethod.type,
        cardNumber: selectedMethod.type === "sbp" ? (data.phoneNumber || "") : (data.cardNumber || ""),
        intervalMinutes: 5, // Требуется бэкендом
        isArchived: !(data.isActive ?? true), // API ожидает isArchived, а не isActive
      };

      if (editingRequisite) {
        await traderApi.updateRequisite(editingRequisite.id, requisiteData);
        toast.success("Реквизит обновлен");
      } else {
        await traderApi.createRequisite(requisiteData);
        toast.success("Реквизит добавлен");
      }

      form.reset();
      setShowForm(false);
      setEditingRequisite(null);
      fetchRequisites();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving requisite:", error);
      toast.error(error.response?.data?.error || "Не удалось сохранить реквизит");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowForm(false);
    setEditingRequisite(null);
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            {showForm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <SheetTitle>
              {showForm
                ? editingRequisite
                  ? "Редактировать реквизит"
                  : "Добавить реквизит"
                : "Реквизиты устройства"
              }
            </SheetTitle>
          </div>
          <SheetDescription>
            {showForm
              ? "Заполните данные для банковского реквизита"
              : "Управление реквизитами устройства"
            }
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {!showForm ? (
            <div className="space-y-4">
              <Button onClick={handleAddNew} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Добавить реквизит
              </Button>

              {requisitesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : requisites.length === 0 ? (
                <Card className="p-8 text-center">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Нет привязанных реквизитов</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Добавьте реквизиты для приема платежей через это устройство
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {requisites.map((requisite) => (
                    <Card key={requisite.id} className="p-4">
                      <div className="space-y-3">
                        {/* Header with status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={!requisite.isArchived ? "default" : "secondary"}>
                              {!requisite.isArchived ? 'Активен' : 'В архиве'}
                            </Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(requisite)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleArchive(requisite)}>
                                {requisite.isArchived ? (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Активировать
                                  </>
                                ) : (
                                  <>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Архивировать
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(requisite.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Отвязать от устройства
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Bank and card info */}
                        <div className="flex items-center gap-3">
                          {getBankIcon(requisite.bankType, "sm")}
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {requisite.cardNumber.replace(/(\d{4})/g, '$1 ').trim()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {requisite.recipientName}
                            </p>
                          </div>
                        </div>

                        {/* Turnover info */}
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <TrendingUp className="h-3 w-3" />
                              <span>Дневной оборот</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">{requisite.turnoverDay.toLocaleString('ru-RU')} ₽</span>
                              <span className="text-muted-foreground"> / {requisite.dailyLimit.toLocaleString('ru-RU')} ₽</span>
                              <div className="text-xs text-muted-foreground">
                                {requisite.dailyLimit > 0 ? `${((requisite.turnoverDay / requisite.dailyLimit) * 100).toFixed(1)}%` : '∞'}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              <span>Общий оборот</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">{requisite.turnoverTotal.toLocaleString('ru-RU')} ₽</span>
                              <span className="text-muted-foreground"> / {requisite.monthlyLimit.toLocaleString('ru-RU')} ₽</span>
                              <div className="text-xs text-muted-foreground">
                                {requisite.monthlyLimit > 0 ? `${((requisite.turnoverTotal / requisite.monthlyLimit) * 100).toFixed(1)}%` : '∞'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Limits */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Лимиты:</span>
                            <span className="ml-1 font-medium">
                              {requisite.minAmount.toLocaleString()} - {requisite.maxAmount.toLocaleString()} ₽
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Дневной лимит сделок:</span>
                            <span className="ml-1 font-medium">
                              {requisite.maxCountTransactions || "∞"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="methodId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип метода</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleMethodChange(value);
                        }}
                        value={field.value}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип метода" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sbp">СБП</SelectItem>
                          <SelectItem value="c2c">C2C</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {selectedMethod && (
                        <FormDescription>
                          Лимиты: {selectedMethod.minAmount} - {selectedMethod.maxAmount} ₽
                        </FormDescription>
                      )}
                    </FormItem>
                  )}
                />

                {selectedMethod && (
                  <FormField
                    control={form.control}
                    name="bankType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Банк</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedMethod || loading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !selectedMethod ? "Сначала выберите метод" : "Выберите банк"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AVAILABLE_BANKS.filter(bank => bank.code !== "SBP").map((bank) => (
                              <SelectItem key={bank.code} value={bank.code}>
                                {bank.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedMethod?.type === "c2c" && (
                  <FormField
                    control={form.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Номер карты</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="1234 5678 9012 3456"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\s/g, "");
                              field.onChange(value);
                            }}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя получателя</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Иван Иванович И." 
                          {...field} 
                          disabled={loading}
                        />
                      </FormControl>
                      <FormDescription>
                        Полное имя как на карте
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedMethod?.type === "sbp" && (
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Номер телефона</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+7 900 123 45 67" 
                            {...field} 
                            disabled={loading}
                          />
                        </FormControl>
                        <FormDescription>
                          Обязательно для СБП
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Мин. сумма</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Макс. сумма</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dailyLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Дневной лимит (₽)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="500000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormDescription>0 = без ограничений</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthlyLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Месячный лимит (₽)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10000000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormDescription>0 = без ограничений</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="maxCountTransactions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дневной лимит транзакций</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormDescription>
                        Максимальное количество сделок в день (0 = без ограничений, по умолчанию 5)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Активен</FormLabel>
                        <FormDescription>
                          Реквизит будет доступен для приема платежей
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={loading}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <SheetFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#006039] hover:bg-[#006039]/90"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingRequisite ? "Сохранить" : "Добавить"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}