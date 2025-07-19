"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Combobox } from "@/components/ui/combobox";

interface RequisitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequisiteAdded: () => void;
}

const bankTypes = [
  { value: "SBERBANK", label: "Сбербанк" },
  { value: "TBANK", label: "Т-Банк" },
  { value: "TINKOFF", label: "Тинькофф" },
  { value: "ALFABANK", label: "Альфа-Банк" },
  { value: "VTB", label: "ВТБ" },
  { value: "RAIFFEISEN", label: "Райффайзенбанк" },
  { value: "GAZPROMBANK", label: "Газпромбанк" },
  { value: "POCHTABANK", label: "Почта Банк" },
  { value: "PSB", label: "ПСБ" },
  { value: "SOVCOMBANK", label: "Совкомбанк" },
  { value: "BSPB", label: "Банк Санкт-Петербург" },
  { value: "RSHB", label: "Россельхозбанк" },
  { value: "OTKRITIE", label: "Открытие" },
  { value: "URALSIB", label: "Уралсиб" },
  { value: "MKB", label: "МКБ" },
  { value: "ROSBANK", label: "Росбанк" },
  { value: "ZENIT", label: "Зенит" },
  { value: "RUSSIAN_STANDARD", label: "Русский Стандарт" },
  { value: "AVANGARD", label: "Авангард" },
  { value: "RNKB", label: "РНКБ" },
  { value: "SBP", label: "СБП" },
  { value: "AKBARS", label: "Ак Барс" },
];

export function RequisitesDialog({
  open,
  onOpenChange,
  onRequisiteAdded,
}: RequisitesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    recipientName: "",
    cardNumber: "",
    bankType: "",
    phoneNumber: "",
    methodId: "",
    minAmount: "100",
    maxAmount: "100000",
    dailyLimit: "500000",
    monthlyLimit: "10000000",
  });

  // Fetch methods on mount
  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const response = await traderApi.getMethods();
        setMethods(response.methods || response || []);
      } catch (error) {
        console.error("Failed to fetch methods:", error);
      }
    };
    if (open) {
      fetchMethods();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.recipientName || !formData.cardNumber || !formData.bankType) {
      toast.error("Пожалуйста, заполните все обязательные поля");
      return;
    }

    // Validate card number (16 digits)
    const cleanCardNumber = formData.cardNumber.replace(/\s/g, "");
    if (cleanCardNumber.length !== 16 || !/^\d+$/.test(cleanCardNumber)) {
      toast.error("Номер карты должен содержать 16 цифр");
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        recipientName: formData.recipientName,
        cardNumber: cleanCardNumber,
        bankType: formData.bankType,
        methodType: "c2c",
        minAmount: parseInt(formData.minAmount),
        maxAmount: parseInt(formData.maxAmount),
        dailyLimit: parseInt(formData.dailyLimit),
        monthlyLimit: parseInt(formData.monthlyLimit),
        intervalMinutes: 5,
      };

      // Add optional fields
      if (formData.phoneNumber) {
        payload.phoneNumber = formData.phoneNumber;
      }
      if (formData.methodId) {
        payload.methodId = formData.methodId;
      }

      console.log('Creating requisite with payload:', payload);
      await traderApi.createRequisite(payload);

      toast.success("Реквизит успешно добавлен");
      onRequisiteAdded();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        recipientName: "",
        cardNumber: "",
        bankType: "",
        phoneNumber: "",
        methodId: "",
        minAmount: "100",
        maxAmount: "100000",
        dailyLimit: "500000",
        monthlyLimit: "10000000",
      });
    } catch (error: any) {
      console.error("Failed to create requisite:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.error || error.message || "Не удалось добавить реквизит";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleanValue = value.replace(/\s/g, "");
    const groups = cleanValue.match(/.{1,4}/g) || [];
    return groups.join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить реквизит</DialogTitle>
          <DialogDescription>
            Добавьте реквизит без привязки к устройству
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipientName">Имя получателя</Label>
            <Input
              id="recipientName"
              placeholder="Иван Иванов"
              value={formData.recipientName}
              onChange={(e) =>
                setFormData({ ...formData, recipientName: e.target.value })
              }
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardNumber">Номер карты</Label>
            <Input
              id="cardNumber"
              placeholder="0000 0000 0000 0000"
              value={formData.cardNumber}
              onChange={(e) => {
                const formatted = formatCardNumber(e.target.value);
                if (formatted.replace(/\s/g, "").length <= 16) {
                  setFormData({ ...formData, cardNumber: formatted });
                }
              }}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankType">Банк *</Label>
            <Combobox
              options={bankTypes}
              value={formData.bankType}
              onValueChange={(value) =>
                setFormData({ ...formData, bankType: value })
              }
              placeholder="Выберите банк"
              searchPlaceholder="Поиск банка..."
              emptyText="Банк не найден"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Номер телефона (опционально)</Label>
            <Input
              id="phoneNumber"
              placeholder="+7 (999) 999-99-99"
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="methodId">Метод платежа (опционально)</Label>
            <Combobox
              options={methods.map(m => ({ value: m.id, label: m.name }))}
              value={formData.methodId}
              onValueChange={(value) =>
                setFormData({ ...formData, methodId: value })
              }
              placeholder="Выберите метод"
              searchPlaceholder="Поиск метода..."
              emptyText="Метод не найден"
              disabled={loading}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minAmount">Мин. сумма (₽)</Label>
              <Input
                id="minAmount"
                type="number"
                placeholder="100"
                value={formData.minAmount}
                onChange={(e) =>
                  setFormData({ ...formData, minAmount: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAmount">Макс. сумма (₽)</Label>
              <Input
                id="maxAmount"
                type="number"
                placeholder="100000"
                value={formData.maxAmount}
                onChange={(e) =>
                  setFormData({ ...formData, maxAmount: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Дневной лимит (₽)</Label>
              <Input
                id="dailyLimit"
                type="number"
                placeholder="500000"
                value={formData.dailyLimit}
                onChange={(e) =>
                  setFormData({ ...formData, dailyLimit: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Месячный лимит (₽)</Label>
              <Input
                id="monthlyLimit"
                type="number"
                placeholder="10000000"
                value={formData.monthlyLimit}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyLimit: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}