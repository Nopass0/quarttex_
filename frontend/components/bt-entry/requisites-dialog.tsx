"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [formData, setFormData] = useState({
    recipientName: "",
    cardNumber: "",
    bankType: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.recipientName || !formData.cardNumber || !formData.bankType) {
      toast.error("Пожалуйста, заполните все поля");
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
      await traderApi.createRequisite({
        recipientName: formData.recipientName,
        cardNumber: cleanCardNumber,
        bankType: formData.bankType,
        methodType: "P2P",
        minAmount: 100,
        maxAmount: 100000,
        intervalMinutes: 5,
        deviceId: null, // No device for BT-entry requisites
      });

      toast.success("Реквизит успешно добавлен");
      onRequisiteAdded();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        recipientName: "",
        cardNumber: "",
        bankType: "",
      });
    } catch (error: any) {
      console.error("Failed to create requisite:", error);
      toast.error(error.message || "Не удалось добавить реквизит");
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
      <DialogContent className="sm:max-w-[425px]">
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
            <Label htmlFor="bankType">Банк</Label>
            <Select
              value={formData.bankType}
              onValueChange={(value) =>
                setFormData({ ...formData, bankType: value })
              }
              disabled={loading}
            >
              <SelectTrigger id="bankType">
                <SelectValue placeholder="Выберите банк" />
              </SelectTrigger>
              <SelectContent>
                {bankTypes.map((bank) => (
                  <SelectItem key={bank.value} value={bank.value}>
                    {bank.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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