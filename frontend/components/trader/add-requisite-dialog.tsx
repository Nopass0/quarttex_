"use client";

import { useState } from "react";
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
  methodType: z.enum(["c2c", "sbp"]),
  bankType: z.string(),
  cardNumber: z.string().min(16).max(20),
  recipientName: z.string().min(3),
  phoneNumber: z.string().optional(),
  minAmount: z.number().min(100),
  maxAmount: z.number().min(1000),
  dailyLimit: z.number().min(1000),
  monthlyLimit: z.number().min(10000),
});

type FormData = z.infer<typeof formSchema>;

interface AddRequisiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId?: string;
  onSuccess?: () => void;
}

export function AddRequisiteDialog({
  open,
  onOpenChange,
  deviceId,
  onSuccess,
}: AddRequisiteDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      methodType: "c2c",
      bankType: "SBERBANK",
      cardNumber: "",
      recipientName: "",
      phoneNumber: "",
      minAmount: 1000,
      maxAmount: 100000,
      dailyLimit: 500000,
      monthlyLimit: 10000000,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      
      const requisiteData = {
        ...data,
        deviceId,
      };

      await traderApi.createRequisite(requisiteData);
      
      toast.success("Реквизит успешно добавлен");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating requisite:", error);
      toast.error("Не удалось добавить реквизит");
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
              name="methodType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип метода</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="c2c">C2C</SelectItem>
                      <SelectItem value="sbp">СБП</SelectItem>
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
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите банк" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SBERBANK">Сбербанк</SelectItem>
                      <SelectItem value="VTB">ВТБ</SelectItem>
                      <SelectItem value="ALFABANK">Альфа-Банк</SelectItem>
                      <SelectItem value="RAIFFEISEN">Райффайзен</SelectItem>
                      <SelectItem value="TBANK">Т-Банк</SelectItem>
                      <SelectItem value="GAZPROMBANK">Газпромбанк</SelectItem>
                      <SelectItem value="POCHTABANK">Почта Банк</SelectItem>
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