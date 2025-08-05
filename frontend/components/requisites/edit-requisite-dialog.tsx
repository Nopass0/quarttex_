"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

interface EditRequisiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisite: {
    id: string;
    methodType: string;
    bankType: string;
    cardNumber: string;
    recipientName: string;
    phoneNumber?: string;
    minAmount: number;
    maxAmount: number;
    dailyLimit: number;
    monthlyLimit: number;
    intervalMinutes: number;
    isArchived: boolean;
    device?: {
      id: string;
      name: string;
      isOnline: boolean;
    };
  };
  onRequisiteUpdated: () => void;
}

const bankTypes = [
  { value: "SBERBANK", label: "Сбербанк" },
  { value: "TBANK", label: "Т-Банк" },
  { value: "VTB", label: "ВТБ" },
  { value: "ALFABANK", label: "Альфа-Банк" },
  { value: "RAIFFEISEN", label: "Райффайзен" },
  { value: "GAZPROMBANK", label: "Газпромбанк" },
  { value: "OTPBANK", label: "ОТП Банк" },
  { value: "OTKRITIE", label: "Открытие" },
  { value: "ROSBANK", label: "Росбанк" },
  { value: "PROMSVYAZBANK", label: "Промсвязьбанк" },
  { value: "SOVCOMBANK", label: "Совкомбанк" },
  { value: "POCHTABANK", label: "Почта Банк" },
  { value: "ROSSELKHOZBANK", label: "Россельхозбанк" },
  { value: "MKB", label: "МКБ" },
  { value: "URALSIB", label: "Уралсиб" },
  { value: "AKBARS", label: "Ак Барс" },
  { value: "SPBBANK", label: "Банк Санкт-Петербург" },
  { value: "MTSBANK", label: "МТС Банк" },
  { value: "OZONBANK", label: "Озон Банк" },
  { value: "RENAISSANCE", label: "Ренессанс" },
  { value: "AVANGARD", label: "Авангард" },
  { value: "RNKB", label: "РНКБ" },
  { value: "LOKOBANK", label: "Локо-Банк" },
  { value: "RUSSIANSTANDARD", label: "Русский Стандарт" },
  { value: "HOMECREDIT", label: "Хоум Кредит" },
  { value: "UNICREDIT", label: "ЮниКредит" },
  { value: "CITIBANK", label: "Ситибанк" },
  { value: "BCSBANK", label: "БКС Банк" },
  { value: "ABSOLUTBANK", label: "Абсолют Банк" },
  { value: "SVOYBANK", label: "Свой Банк" },
  { value: "TRANSKAPITALBANK", label: "Транскапиталбанк" },
  { value: "MTSMONEY", label: "МТС Деньги" },
  { value: "FORABANK", label: "Фора-Банк" },
  { value: "CREDITEUROPE", label: "Кредит Европа" },
  { value: "BBRBANK", label: "ББР Банк" },
  { value: "UBRIR", label: "УБРиР" },
  { value: "GENBANK", label: "Генбанк" },
  { value: "SINARA", label: "Синара" },
  { value: "VLADBUSINESSBANK", label: "Владбизнесбанк" },
  { value: "TAVRICHESKIY", label: "Таврический" },
  { value: "DOLINSK", label: "Долинск" },
];

export function EditRequisiteDialog({
  open,
  onOpenChange,
  requisite,
  onRequisiteUpdated,
}: EditRequisiteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    methodType: "",
    bankType: "",
    cardNumber: "",
    recipientName: "",
    phoneNumber: "",
    minAmount: "",
    maxAmount: "",
    dailyLimit: "",
    monthlyLimit: "",
    intervalMinutes: "",
  });

  useEffect(() => {
    if (requisite && open) {
      setFormData({
        methodType: requisite.methodType || "",
        bankType: requisite.bankType || "",
        cardNumber: requisite.cardNumber || "",
        recipientName: requisite.recipientName || "",
        phoneNumber: requisite.phoneNumber || "",
        minAmount: (requisite.minAmount || 0).toString(),
        maxAmount: (requisite.maxAmount || 0).toString(),
        dailyLimit: (requisite.dailyLimit || 0).toString(),
        monthlyLimit: (requisite.monthlyLimit || 0).toString(),
        intervalMinutes: (requisite.intervalMinutes || 0).toString(),
      });
    }
  }, [requisite, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        recipientName: formData.recipientName,
        phoneNumber: formData.phoneNumber || undefined,
        minAmount: parseInt(formData.minAmount),
        maxAmount: parseInt(formData.maxAmount),
        dailyLimit: parseInt(formData.dailyLimit),
        monthlyLimit: parseInt(formData.monthlyLimit),
        intervalMinutes: parseInt(formData.intervalMinutes),
      };

      // Only include changeable fields if device is not working
      if (requisite.isArchived || !requisite.device?.isOnline) {
        Object.assign(updateData, {
          methodType: formData.methodType,
          bankType: formData.bankType,
          cardNumber: formData.cardNumber,
        });
      }

      await traderApi.updateRequisite(requisite.id, updateData);
      toast.success("Реквизит успешно обновлен");
      onRequisiteUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to update requisite:", error);
      toast.error(error.response?.data?.error || "Не удалось обновить реквизит");
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleanValue = value.replace(/\s/g, "");
    const groups = cleanValue.match(/.{1,4}/g) || [];
    return groups.join(" ");
  };

  const canEditCriticalFields = requisite.isArchived || !requisite.device?.isOnline;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать реквизит</DialogTitle>
          <DialogDescription>
            {canEditCriticalFields 
              ? "Вы можете изменить все поля реквизита"
              : "Реквизит в работе. Вы можете изменить только лимиты и имя получателя"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="methodType">Метод</Label>
              <Select
                value={formData.methodType}
                onValueChange={(value) =>
                  setFormData({ ...formData, methodType: value })
                }
                disabled={!canEditCriticalFields || loading}
              >
                <SelectTrigger id="methodType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="c2c">Карта → Карта</SelectItem>
                  <SelectItem value="sbp">СБП</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankType">Банк</Label>
              <Select
                value={formData.bankType}
                onValueChange={(value) =>
                  setFormData({ ...formData, bankType: value })
                }
                disabled={!canEditCriticalFields || loading}
              >
                <SelectTrigger id="bankType">
                  <SelectValue />
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
          </div>

          <div className="grid grid-cols-1 gap-4">
            {formData.methodType === "c2c" && (
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Номер карты</Label>
                <Input
                  id="cardNumber"
                  value={formData.cardNumber}
                  onChange={(e) => {
                    const formatted = formatCardNumber(e.target.value);
                    if (formatted.replace(/\s/g, "").length <= 16) {
                      setFormData({ ...formData, cardNumber: formatted });
                    }
                  }}
                  disabled={!canEditCriticalFields || loading}
                />
              </div>
            )}

            {formData.methodType === "sbp" && (
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Номер телефона</Label>
                <Input
                  id="phoneNumber"
                  placeholder="+7 900 000 00 00"
                  value={formData.phoneNumber || formData.cardNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value, cardNumber: e.target.value })
                  }
                  disabled={!canEditCriticalFields || loading}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientName">Имя получателя</Label>
            <Input
              id="recipientName"
              value={formData.recipientName}
              onChange={(e) =>
                setFormData({ ...formData, recipientName: e.target.value })
              }
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minAmount">Мин. сумма транзакции</Label>
              <Input
                id="minAmount"
                type="number"
                value={formData.minAmount}
                onChange={(e) =>
                  setFormData({ ...formData, minAmount: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAmount">Макс. сумма транзакции</Label>
              <Input
                id="maxAmount"
                type="number"
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
              <Label htmlFor="dailyLimit">Дневной лимит</Label>
              <Input
                id="dailyLimit"
                type="number"
                value={formData.dailyLimit}
                onChange={(e) =>
                  setFormData({ ...formData, dailyLimit: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Месячный лимит</Label>
              <Input
                id="monthlyLimit"
                type="number"
                value={formData.monthlyLimit}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyLimit: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="intervalMinutes">Интервал между транзакциями (минуты)</Label>
            <Input
              id="intervalMinutes"
              type="number"
              value={formData.intervalMinutes}
              onChange={(e) =>
                setFormData({ ...formData, intervalMinutes: e.target.value })
              }
              disabled={loading}
            />
          </div>

          {requisite.device && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Устройство: <span className="font-medium">{requisite.device.name}</span>
                {requisite.device.isOnline && (
                  <span className="ml-2 text-green-600">● В сети</span>
                )}
              </p>
            </div>
          )}

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
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}