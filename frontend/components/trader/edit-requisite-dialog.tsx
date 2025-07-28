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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BankSelector } from "@/components/ui/bank-selector";
import { traderApi } from "@/services/api";
import { toast } from "sonner";

const formSchema = z.object({
  cardNumber: z.string().optional(),
  bankType: z.string().min(1, "Выберите банк"),
  recipientName: z.string().min(3, "Введите имя получателя"),
  phoneNumber: z.string().optional(),
  minAmount: z.number().min(0),
  maxAmount: z.number().min(0),
  dailyLimit: z.number().min(0),
  monthlyLimit: z.number().min(0),
  intervalMinutes: z.number().min(0),
});

export interface EditRequisiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisite: any | null;
  onSuccess?: () => void;
}

export function EditRequisiteDialog({ open, onOpenChange, requisite, onSuccess }: EditRequisiteDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cardNumber: requisite?.cardNumber || "",
      bankType: requisite?.bankType || "",
      recipientName: requisite?.recipientName || "",
      phoneNumber: requisite?.phoneNumber || "",
      minAmount: requisite?.minAmount || 0,
      maxAmount: requisite?.maxAmount || 0,
      dailyLimit: requisite?.dailyLimit || 0,
      monthlyLimit: requisite?.monthlyLimit || 0,
      intervalMinutes: requisite?.intervalMinutes || 0,
    },
  });

  // Reset form values whenever a new requisite is selected
  useEffect(() => {
    if (requisite) {
      form.reset({
        cardNumber: requisite.cardNumber || "",
        bankType: requisite.bankType || "",
        recipientName: requisite.recipientName || "",
        phoneNumber: requisite.phoneNumber || "",
        minAmount: requisite.minAmount || 0,
        maxAmount: requisite.maxAmount || 0,
        dailyLimit: requisite.dailyLimit || 0,
        monthlyLimit: requisite.monthlyLimit || 0,
        intervalMinutes: requisite.intervalMinutes || 0,
      });
    }
  }, [requisite, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!requisite) return;
    try {
      setLoading(true);
      await traderApi.updateRequisite(requisite.id, data);
      toast.success("Реквизит обновлен");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating requisite:", error);
      toast.error(error.response?.data?.error || "Не удалось обновить реквизит");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать реквизит</DialogTitle>
          <DialogDescription>Измените данные банковского реквизита</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Номер карты</FormLabel>
                  <FormControl>
                    <Input placeholder="0000 0000 0000 0000" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <BankSelector value={field.value} onChange={field.onChange} />
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
                    <Input placeholder="Иван Иванов" {...field} />
                  </FormControl>
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
                    <Input placeholder="+7 900 000 00 00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Мин. сумма</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dailyLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дневной лимит</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="intervalMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Интервал, мин</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={loading} className="bg-[#006039] hover:bg-[#006039]/90">
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
