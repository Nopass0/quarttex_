"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { traderApi } from "@/services/api";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  methodId: z.string().min(1, "Выберите метод"),
  bankType: z.string().min(1, "Выберите банк"),
  cardNumber: z.string().min(16, "Введите корректный номер карты").max(20),
  recipientName: z.string().min(3, "Введите имя получателя"),
  phoneNumber: z.string().optional(),
  minAmount: z.number().min(100),
  maxAmount: z.number().min(1000),
  dailyLimit: z.number().min(1000),
  monthlyLimit: z.number().min(10000),
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

interface AddRequisiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId?: string;
  onSuccess?: () => void;
}

const AVAILABLE_BANKS = [
  { code: "SBER", name: "Сбербанк" },
  { code: "TINK", name: "Тинькофф" },
  { code: "VTB", name: "ВТБ" },
  { code: "ALFA", name: "Альфа-Банк" },
  { code: "GAZPROM", name: "Газпромбанк" },
  { code: "OZON", name: "Ozon банк" },
  { code: "RAIFF", name: "Райффайзен" },
  { code: "POCHTA", name: "Почта Банк" },
  { code: "RSHB", name: "Россельхозбанк" },
  { code: "MTS", name: "МТС Банк" },
  { code: "PSB", name: "ПСБ" },
  { code: "SOVCOM", name: "Совкомбанк" },
  { code: "URALSIB", name: "Уралсиб" },
  { code: "MKB", name: "МКБ" },
  { code: "ROSBANK", name: "Росбанк" },
  { code: "OTKRITIE", name: "Открытие" },
  { code: "AVANGARD", name: "Авангард" },
  { code: "ZENIT", name: "Зенит" },
  { code: "AKBARS", name: "Ак Барс" },
  { code: "SBP", name: "СБП" }
];

export function AddRequisiteDialog({
  open,
  onOpenChange,
  deviceId,
  onSuccess,
}: AddRequisiteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(false);

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
    },
  });

  useEffect(() => {
    if (open) {
      fetchMethods();
    }
  }, [open]);

  const fetchMethods = async () => {
    try {
      setLoadingMethods(true);
      const response = await traderApi.getMethods();
      const methodsData = response.data || response.methods || response || [];
      setMethods(Array.isArray(methodsData) ? methodsData : []);
    } catch (error) {
      console.error("Error fetching methods:", error);
      toast.error("Не удалось загрузить методы");
    } finally {
      setLoadingMethods(false);
    }
  };

  const handleMethodChange = (methodId: string) => {
    const method = methods.find(m => m.id === methodId);
    setSelectedMethod(method);
    if (method) {
      form.setValue("minAmount", method.minPayin || 1000);
      form.setValue("maxAmount", method.maxPayin || 100000);
      // Clear bank selection when method changes
      form.setValue("bankType", "");
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      
      if (!selectedMethod) {
        toast.error("Выберите метод");
        return;
      }

      const requisiteData = {
        ...data,
        deviceId,
        methodType: selectedMethod.type,
        intervalMinutes: 5, // Default interval
      };

      await traderApi.createRequisite(requisiteData);
      
      toast.success("Реквизит успешно добавлен");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating requisite:", error);
      toast.error(error.response?.data?.error || "Не удалось добавить реквизит");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Добавить реквизит</DialogTitle>
          <DialogDescription>
            Заполните данные для нового банковского реквизита
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="methodId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Метод оплаты</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleMethodChange(value);
                    }}
                    value={field.value}
                    disabled={loadingMethods}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingMethods ? "Загрузка методов..." : "Выберите метод"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {methods.length === 0 && !loadingMethods && (
                        <div className="p-2 text-sm text-gray-500">Нет доступных методов</div>
                      )}
                      {methods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name} ({method.type.toUpperCase()})
                          {method.banks && method.banks.length > 0 && (
                            <span className="text-xs text-gray-500 ml-2">
                              - {method.banks.join(", ")}
                            </span>
                          )}
                        </SelectItem>
                      ))}
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

            <FormField
              control={form.control}
              name="bankType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Банк</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedMethod}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !selectedMethod ? "Сначала выберите метод" : "Выберите банк"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABLE_BANKS.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя получателя</FormLabel>
                  <FormControl>
                    <Input placeholder="Иван Иванович И." {...field} />
                  </FormControl>
                  <FormDescription>
                    Полное имя как на карте
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Номер телефона (опционально)</FormLabel>
                  <FormControl>
                    <Input placeholder="+7 900 123 45 67" {...field} />
                  </FormControl>
                  <FormDescription>
                    Для СБП обязательно
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <FormLabel>Дневной лимит</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="500000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Месячный лимит</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10000000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
                Добавить
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}