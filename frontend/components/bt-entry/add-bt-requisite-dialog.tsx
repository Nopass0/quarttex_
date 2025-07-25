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
  cardNumber: z.string().optional(),
  recipientName: z.string().min(3, "Введите имя получателя"),
  phoneNumber: z.string().optional(),
  minAmount: z.number().min(100),
  maxAmount: z.number().min(1000),
  dailyLimit: z.number().min(0),
  monthlyLimit: z.number().min(0),
  maxCountTransactions: z.number().min(0),
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

interface AddBTRequisiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AVAILABLE_BANKS = [
  { code: "SBER", name: "Сбербанк" },
  { code: "TBANK", name: "Т-Банк" },
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

export function AddBTRequisiteDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddBTRequisiteDialogProps) {
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
      maxCountTransactions: 5,
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

  const handleMethodChange = (methodType: string) => {
    // Find first method with selected type
    const method = methods.find(m => m.type === methodType);
    setSelectedMethod(method || { id: methodType, name: methodType, type: methodType, minAmount: 1000, maxAmount: 100000, minPayin: 1000, maxPayin: 100000 });
    
    if (method) {
      form.setValue("minAmount", method.minPayin || 1000);
      form.setValue("maxAmount", method.maxPayin || 100000);
    } else {
      // Set default values for method type
      form.setValue("minAmount", 1000);
      form.setValue("maxAmount", 100000);
    }
    
    // Clear bank selection when method changes
    form.setValue("bankType", "");
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      
      if (!selectedMethod) {
        toast.error("Выберите метод");
        return;
      }

      // Validate bank selection for all methods
      if (!data.bankType) {
        toast.error("Выберите банк");
        return;
      }

      // Validate card number for card methods
      if (selectedMethod.type === "CARD" && !data.cardNumber) {
        toast.error("Введите номер карты");
        return;
      }

      // Validate phone for SBP
      if (data.bankType === "SBP" && !data.phoneNumber) {
        toast.error("Введите номер телефона для СБП");
        return;
      }

      // Find the method ID for the selected bank
      const methodForBank = methods.find(
        m => m.type === selectedMethod.type
      );

      if (!methodForBank) {
        toast.error("Метод не найден");
        return;
      }

      const payload = {
        ...data,
        methodId: methodForBank.id,
        deviceId: null, // Explicitly set deviceId to null for BT-entry requisites
      };

      await traderApi.createRequisite(payload);
      toast.success("Реквизит успешно добавлен");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating requisite:", error);
      const errorMessage = error.response?.data?.error || "Не удалось создать реквизит";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedMethodType = selectedMethod?.type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Добавить реквизит для БТ-входа</DialogTitle>
          <DialogDescription>
            Заполните информацию о новом реквизите без устройства
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="methodId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Метод</FormLabel>
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
                        <SelectValue placeholder="Выберите метод" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CARD">Банковская карта</SelectItem>
                      <SelectItem value="SBP">СБП</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
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
                    disabled={!selectedMethodType}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите банк" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedMethodType === "SBP" ? (
                        <SelectItem value="SBP">СБП</SelectItem>
                      ) : (
                        AVAILABLE_BANKS.filter(bank => bank.code !== "SBP").map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedMethodType === "CARD" && (
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
                          if (/^\d*$/.test(value) && value.length <= 16) {
                            field.onChange(value);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Введите номер карты без пробелов
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch("bankType") === "SBP" && (
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер телефона</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+7 (999) 123-45-67"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d+]/g, "");
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Номер телефона для СБП
                    </FormDescription>
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
                    <Input placeholder="Иван Иванов" {...field} />
                  </FormControl>
                  <FormDescription>
                    Имя получателя платежа
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
                    <FormLabel>Дневной лимит (₽)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                    />
                  </FormControl>
                  <FormDescription>
                    Максимальное количество сделок в день (0 = без ограничений, по умолчанию 5)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
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