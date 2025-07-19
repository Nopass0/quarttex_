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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { Loader2, CreditCard, Plus, Trash2 } from "lucide-react";
import { RequisitesDialog } from "./requisites-dialog";
import { cn } from "@/lib/utils";

interface RequisitesListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Requisite {
  id: string;
  recipientName: string;
  cardNumber: string;
  bankType: string;
  phoneNumber?: string;
  method?: {
    id: string;
    name: string;
  };
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
  isArchived: boolean;
  createdAt: string;
}

export function RequisitesListDialog({
  open,
  onOpenChange,
}: RequisitesListDialogProps) {
  const [loading, setLoading] = useState(true);
  const [requisites, setRequisites] = useState<Requisite[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchRequisites = async () => {
    setLoading(true);
    try {
      const response = await traderApi.getRequisites();
      const allRequisites = response.requisites || response || [];
      // Filter only requisites without devices
      const requisitesWithoutDevices = allRequisites.filter(
        (req: any) => !req.deviceId
      );
      setRequisites(requisitesWithoutDevices);
    } catch (error) {
      console.error("Failed to fetch requisites:", error);
      toast.error("Не удалось загрузить реквизиты");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRequisites();
    }
  }, [open]);

  const deleteRequisite = async (id: string) => {
    try {
      await traderApi.deleteRequisite(id);
      toast.success("Реквизит удален");
      fetchRequisites();
    } catch (error) {
      toast.error("Не удалось удалить реквизит");
    }
  };

  const toggleRequisiteStatus = async (id: string, isArchived: boolean) => {
    try {
      await traderApi.archiveRequisite(id, !isArchived);
      toast.success(isArchived ? "Реквизит активирован" : "Реквизит архивирован");
      fetchRequisites();
    } catch (error) {
      toast.error("Не удалось изменить статус");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Реквизиты без устройств</DialogTitle>
            <DialogDescription>
              Управление реквизитами для БТ-входа
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-[#006039] hover:bg-[#006039]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить реквизит
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
              </div>
            ) : requisites.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>Нет реквизитов без устройств</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить первый реквизит
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {requisites.map((req) => (
                    <Card
                      key={req.id}
                      className={cn(
                        "p-4 transition-all",
                        req.isArchived && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                            <CreditCard className="h-5 w-5 text-[#006039]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{req.recipientName}</h4>
                              <Badge
                                variant={!req.isArchived ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {!req.isArchived ? "Активен" : "Архивирован"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {req.cardNumber?.replace(/(\d{4})/g, "$1 ").trim()} • {req.bankType}
                            </p>
                            {req.method && (
                              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                Метод: {req.method.name}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                              <span>Мин: {req.minAmount.toLocaleString()} ₽</span>
                              <span>Макс: {req.maxAmount.toLocaleString()} ₽</span>
                              <span>Дневной: {req.dailyLimit.toLocaleString()} ₽</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRequisiteStatus(req.id, req.isArchived)}
                          >
                            {req.isArchived ? "Активировать" : "Архивировать"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteRequisite(req.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RequisitesDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onRequisiteAdded={() => {
          fetchRequisites();
          setAddDialogOpen(false);
        }}
      />
    </>
  );
}