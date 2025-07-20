"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useAdminAuth } from "@/stores/auth";

interface DeletionStats {
  totals: {
    transactions: number;
    payouts: number;
    deals: number;
  };
  merchants: Array<{ id: string; name: string }>;
  statuses: {
    transactions: Array<{ status: string; count: number }>;
    payouts: Array<{ status: string; count: number }>;
    deals: Array<{ status: string; count: number }>;
  };
}

export default function BulkDeletePage() {
  const { user } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DeletionStats | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "transactions" | "payouts" | "deals" | "all" | null;
    filters: any;
    count?: number;
  }>({ open: false, type: null, filters: {} });

  // Filters
  const [transactionStatus, setTransactionStatus] = useState<string>("");
  const [transactionMerchant, setTransactionMerchant] = useState<string>("");
  const [deleteAllTransactions, setDeleteAllTransactions] = useState(false);

  const [payoutStatus, setPayoutStatus] = useState<string>("");
  const [deleteAllPayouts, setDeleteAllPayouts] = useState(false);

  const [dealStatus, setDealStatus] = useState<string>("");
  const [deleteAllDeals, setDeleteAllDeals] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/admin/bulk-delete/stats", {
        headers: {
          "x-admin-key": user?.masterKey || "",
        },
      });

      if (!response.ok) throw new Error("Failed to load stats");

      const data = await response.json();
      setStats(data);
    } catch (error) {
      toast.error("Не удалось загрузить статистику");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCount = (type: "transactions" | "payouts" | "deals") => {
    if (!stats) return 0;

    switch (type) {
      case "transactions":
        if (deleteAllTransactions) return stats.totals.transactions;
        let count = 0;
        if (transactionStatus) {
          const statusData = stats.statuses.transactions.find(s => s.status === transactionStatus);
          count = statusData?.count || 0;
        } else {
          count = stats.totals.transactions;
        }
        // If merchant is selected, we can't accurately calculate without backend query
        return count;

      case "payouts":
        if (deleteAllPayouts) return stats.totals.payouts;
        if (payoutStatus) {
          const statusData = stats.statuses.payouts.find(s => s.status === payoutStatus);
          return statusData?.count || 0;
        }
        return stats.totals.payouts;

      case "deals":
        if (deleteAllDeals) return stats.totals.deals;
        if (dealStatus) {
          const statusData = stats.statuses.deals.find(s => s.status === dealStatus);
          return statusData?.count || 0;
        }
        return stats.totals.deals;

      default:
        return 0;
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.type) return;

    try {
      const url = `/api/admin/bulk-delete/${deleteDialog.type === "all" ? "all" : deleteDialog.type}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": user?.masterKey || "",
        },
        body: deleteDialog.type === "all" ? "{}" : JSON.stringify(deleteDialog.filters),
      });

      if (!response.ok) throw new Error("Failed to delete");

      const result = await response.json();
      
      toast.success(result.message);

      // Reload stats
      await loadStats();
    } catch (error) {
      toast.error("Не удалось выполнить удаление");
    } finally {
      setDeleteDialog({ open: false, type: null, filters: {} });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Массовое удаление</h1>
        <p className="text-muted-foreground">Техническая страница для удаления данных</p>
      </div>

      <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
        <div className="flex gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive">Внимание!</h3>
            <p className="text-sm text-destructive/90">
              Эта страница предназначена только для технических целей. 
              Удаление данных необратимо. Будьте осторожны!
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Транзакции</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totals.transactions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Выплаты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totals.payouts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Сделки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totals.deals || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Удалить транзакции</CardTitle>
          <CardDescription>Выберите фильтры для удаления транзакций</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-all-transactions"
              checked={deleteAllTransactions}
              onCheckedChange={(checked) => setDeleteAllTransactions(checked as boolean)}
            />
            <Label htmlFor="delete-all-transactions">Удалить все транзакции</Label>
          </div>

          {!deleteAllTransactions && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={transactionStatus} onValueChange={setTransactionStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все статусы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все статусы</SelectItem>
                    {stats?.statuses.transactions.map((s) => (
                      <SelectItem key={s.status} value={s.status}>
                        {s.status} ({s.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Мерчант</Label>
                <Select value={transactionMerchant} onValueChange={setTransactionMerchant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все мерчанты" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все мерчанты</SelectItem>
                    {stats?.merchants.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button
            variant="destructive"
            onClick={() => setDeleteDialog({
              open: true,
              type: "transactions",
              filters: {
                status: transactionStatus || undefined,
                merchantId: transactionMerchant || undefined,
                deleteAll: deleteAllTransactions,
              },
              count: getFilteredCount("transactions"),
            })}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить транзакции
          </Button>
        </CardContent>
      </Card>

      {/* Delete Payouts */}
      <Card>
        <CardHeader>
          <CardTitle>Удалить выплаты</CardTitle>
          <CardDescription>Выберите фильтры для удаления выплат</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-all-payouts"
              checked={deleteAllPayouts}
              onCheckedChange={(checked) => setDeleteAllPayouts(checked as boolean)}
            />
            <Label htmlFor="delete-all-payouts">Удалить все выплаты</Label>
          </div>

          {!deleteAllPayouts && (
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={payoutStatus} onValueChange={setPayoutStatus}>
                <SelectTrigger className="w-full md:w-1/2">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все статусы</SelectItem>
                  {stats?.statuses.payouts.map((s) => (
                    <SelectItem key={s.status} value={s.status}>
                      {s.status} ({s.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="destructive"
            onClick={() => setDeleteDialog({
              open: true,
              type: "payouts",
              filters: {
                status: payoutStatus || undefined,
                deleteAll: deleteAllPayouts,
              },
              count: getFilteredCount("payouts"),
            })}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить выплаты
          </Button>
        </CardContent>
      </Card>

      {/* Delete Deals */}
      <Card>
        <CardHeader>
          <CardTitle>Удалить сделки</CardTitle>
          <CardDescription>Выберите фильтры для удаления сделок</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-all-deals"
              checked={deleteAllDeals}
              onCheckedChange={(checked) => setDeleteAllDeals(checked as boolean)}
            />
            <Label htmlFor="delete-all-deals">Удалить все сделки</Label>
          </div>

          {!deleteAllDeals && (
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={dealStatus} onValueChange={setDealStatus}>
                <SelectTrigger className="w-full md:w-1/2">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все статусы</SelectItem>
                  {stats?.statuses.deals.map((s) => (
                    <SelectItem key={s.status} value={s.status}>
                      {s.status} ({s.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="destructive"
            onClick={() => setDeleteDialog({
              open: true,
              type: "deals",
              filters: {
                status: dealStatus || undefined,
                deleteAll: deleteAllDeals,
              },
              count: getFilteredCount("deals"),
            })}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить сделки
          </Button>
        </CardContent>
      </Card>

      {/* Delete Everything */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Удалить все данные</CardTitle>
          <CardDescription>Удалить все транзакции, выплаты и сделки</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialog({
              open: true,
              type: "all",
              filters: {},
              count: (stats?.totals.transactions || 0) + (stats?.totals.payouts || 0) + (stats?.totals.deals || 0),
            })}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить все
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: null, filters: {} })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === "all" ? (
                <>Вы собираетесь удалить ВСЕ данные. Это действие необратимо!</>
              ) : (
                <>
                  Вы собираетесь удалить {deleteDialog.count || "?"}{" "}
                  {deleteDialog.type === "transactions" ? "транзакций" : 
                   deleteDialog.type === "payouts" ? "выплат" : "сделок"}.
                  Это действие необратимо!
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}