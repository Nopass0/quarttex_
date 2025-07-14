"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BankCard } from "@/components/ui/bank-card";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import {
  Search,
  Filter,
  PlayCircle,
  PauseCircle,
  Archive,
  CreditCard,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  ChevronDown,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TraderHeader } from "@/components/trader/trader-header";
import { RequisiteInfoModal } from "@/components/requisites/requisite-info-modal";

interface Requisite {
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
  turnoverDay: number;
  turnoverTotal: number;
  successfulDeals: number;
  totalDeals: number;
  isArchived: boolean;
  hasDevice: boolean;
  device?: {
    id: string;
    name: string;
    isOnline: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export default function TraderRequisitesPage() {
  const [requisites, setRequisites] = useState<Requisite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequisites, setSelectedRequisites] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [methods, setMethods] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [addingRequisite, setAddingRequisite] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "stopped" | "blocked">("all");
  const [filterDevice, setFilterDevice] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [selectedRequisiteForInfo, setSelectedRequisiteForInfo] =
    useState<Requisite | null>(null);

  // Form state
  const [requisiteForm, setRequisiteForm] = useState({
    methodType: "",
    bankType: "",
    cardNumber: "",
    recipientName: "",
    phoneNumber: "",
    minAmount: 100,
    maxAmount: 50000,
    dailyLimit: 500000,
    monthlyLimit: 5000000,
    intervalMinutes: 0,
    deviceId: "",
  });

  useEffect(() => {
    fetchRequisites();
    fetchMethods();
    fetchDevices();
  }, []);

  const fetchRequisites = async () => {
    try {
      setLoading(true);
      const data = await traderApi.getRequisites();
      // Add mock data for successful deals if not present
      const requisitesWithDeals = data.map((req: any) => ({
        ...req,
        successfulDeals: req.successfulDeals || Math.floor(Math.random() * 50),
        totalDeals: req.totalDeals || Math.floor(Math.random() * 60) + 10,
      }));
      setRequisites(requisitesWithDeals);
    } catch (error) {
      console.error("Error fetching requisites:", error);
      toast.error("Не удалось загрузить реквизиты");
    } finally {
      setLoading(false);
    }
  };

  const fetchMethods = async () => {
    try {
      const data = await traderApi.getMethods();
      setMethods(data);
    } catch (error) {
      console.error("Error fetching methods:", error);
    }
  };

  const fetchDevices = async () => {
    try {
      const data = await traderApi.getDevices();
      setDevices(data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  const handleCreateRequisite = async () => {
    try {
      setAddingRequisite(true);

      // Validation
      if (!requisiteForm.methodType) {
        toast.error("Выберите метод");
        return;
      }
      if (!requisiteForm.bankType) {
        toast.error("Выберите банк");
        return;
      }
      if (!requisiteForm.cardNumber && !requisiteForm.phoneNumber) {
        toast.error("Введите номер карты или телефона");
        return;
      }
      if (!requisiteForm.recipientName) {
        toast.error("Введите имя получателя");
        return;
      }

      await traderApi.createRequisite(requisiteForm);
      toast.success("Реквизит успешно добавлен");
      setShowAddDialog(false);
      await fetchRequisites();

      // Reset form
      setRequisiteForm({
        methodType: "",
        bankType: "",
        cardNumber: "",
        recipientName: "",
        phoneNumber: "",
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        intervalMinutes: 0,
        deviceId: "",
      });
    } catch (error: any) {
      console.error("Error creating requisite:", error);
      toast.error(error.response?.data?.error || "Не удалось создать реквизит");
    } finally {
      setAddingRequisite(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedRequisites.length === 0) {
      toast.error("Выберите действие и реквизиты");
      return;
    }

    try {
      switch (bulkAction) {
        case "stop":
          for (const id of selectedRequisites) {
            await traderApi.stopRequisite(id);
          }
          toast.success(`Остановлено реквизитов: ${selectedRequisites.length}`);
          break;
        case "start":
          for (const id of selectedRequisites) {
            await traderApi.startRequisite(id);
          }
          toast.success(`Запущено реквизитов: ${selectedRequisites.length}`);
          break;
        case "archive":
          for (const id of selectedRequisites) {
            await traderApi.deleteRequisite(id);
          }
          toast.success(
            `Архивировано реквизитов: ${selectedRequisites.length}`,
          );
          break;
      }

      setSelectedRequisites([]);
      setBulkAction("");
      await fetchRequisites();
    } catch (error) {
      toast.error("Не удалось выполнить действие");
    }
  };

  const toggleSelectAll = () => {
    if (selectedRequisites.length === filteredRequisites.length) {
      setSelectedRequisites([]);
    } else {
      setSelectedRequisites(filteredRequisites.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedRequisites((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const filteredRequisites = requisites
    .filter((requisite) => {
      const matchesSearch =
        requisite.cardNumber.includes(searchQuery) ||
        requisite.recipientName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (requisite.phoneNumber && requisite.phoneNumber.includes(searchQuery));

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && !requisite.isArchived && requisite.hasDevice && requisite.device?.isOnline) ||
        (filterStatus === "stopped" && (!requisite.hasDevice || !requisite.device?.isOnline) && !requisite.isArchived) ||
        (filterStatus === "blocked" && requisite.isArchived);

      const matchesDevice =
        filterDevice === "all" ||
        (filterDevice === "none" && !requisite.hasDevice) ||
        (requisite.device && requisite.device.id === filterDevice);

      return matchesSearch && matchesStatus && matchesDevice;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        default:
          return 0;
      }
    });

  const getTrafficPercentage = (current: number, limit: number) => {
    return limit > 0 ? (current / limit) * 100 : 0;
  };

  const getTrafficColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-500";
    if (percentage >= 70) return "text-orange-500";
    if (percentage >= 50) return "text-yellow-500";
    return "text-green-500";
  };

  const getBankLogo = (bankType: string): string => {
    const bankMap: { [key: string]: string } = {
      SBERBANK: "sberbank.svg",
      TBANK: "tbank.svg",
      VTB: "vtb.svg",
      ALFABANK: "alfabank.svg",
      RAIFFEISEN: "raiffeisen.svg",
      GAZPROMBANK: "gazprombank.svg",
      TINKOFF: "tinkoff.svg",
      OTKRITIE: "otkritie.svg",
      ROSBANK: "rosbank.svg",
      PSB: "psb.svg",
      SOVCOMBANK: "sovcombank.svg",
      POCHTABANK: "pochtabank.svg",
      RSHB: "rshb.svg",
      AVANGARD: "avangard.svg",
      ZENIT: "zenit.svg",
      URALSIB: "uralsib.svg",
      MKB: "mkb.svg",
      AKBARS: "akbars.svg",
      "RUSSIAN-STANDARD": "russian-standard.svg",
      BSPB: "bspb.svg",
      RNKB: "rnkb.svg",
    };
    return bankMap[bankType] || "sberbank.svg";
  };

  const detectPaymentSystem = (
    cardNumber: string,
  ): "mir" | "mastercard" | "visa" | "unknown" => {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.startsWith("2")) return "mir";
    if (cleanNumber.startsWith("4")) return "visa";
    if (cleanNumber.startsWith("5")) return "mastercard";
    return "unknown";
  };

  const PaymentSystemIcon = ({
    system,
  }: {
    system: "mir" | "mastercard" | "visa" | "unknown";
  }) => {
    return null;
  };

  if (loading) {
    return (
      <ProtectedRoute variant="trader">
        <AuthLayout variant="trader">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
          </div>
        </AuthLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Реквизиты</h1>
              <p className="text-gray-500">Управление платежными реквизитами</p>
            </div>
            <TraderHeader />
          </div>

          {/* Search and Filters - Sticky */}
          <div className="sticky top-0 z-10 bg-white dark:bg-[#0f0f0f] pb-4 -mx-6 px-6 pt-2 shadow-sm dark:shadow-[#29382f]">
            <div className="flex gap-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006039] dark:text-[#2d6a42] h-4 w-4" />
                <Input
                  placeholder="Поиск по номеру, имени, устройству..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border h-12 border-gray-300 dark:border-[#29382f] rounded-lg"
                />
              </div>

              {/* Filters */}
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className="gap-2 h-12 px-6"
                  >
                    <SlidersHorizontal className="h-4 w-4 text-[#006039]" />
                    Не выбраны
                    {(filterStatus !== "all" || filterDevice !== "all") && (
                      <Badge className="ml-1 bg-[#006039] text-white">
                        {[
                          filterStatus !== "all",
                          filterDevice !== "all",
                        ].filter(Boolean).length}
                      </Badge>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-colors",
                        filtersOpen ? "text-[#006039]" : "text-gray-400"
                      )}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[500px]" sideOffset={5}>
                  <div className="space-y-4">
                    <h4 className="font-medium text-">Параметры поиска</h4>

                    {/* Status Filter */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#006039]" />
                        <Label className="text-sm">Статус реквизитов</Label>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="default"
                            className="w-full justify-between h-12"
                          >
                            <span className="text-[#006039]">
                              {filterStatus === "all"
                                ? "Все реквизиты"
                                : filterStatus === "active"
                                  ? "В работе"
                                  : filterStatus === "stopped"
                                    ? "Остановлен"
                                    : "Заблокирован"}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[465px] p-0" align="start" sideOffset={5}>
                          <div className="max-h-64 overflow-auto">
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                                filterStatus === "all" &&
                                  "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                              )}
                              onClick={() => setFilterStatus("all")}
                            >
                              Все реквизиты
                            </Button>
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                                filterStatus === "active" &&
                                  "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                              )}
                              onClick={() => setFilterStatus("active")}
                            >
                              В работе
                            </Button>
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                                filterStatus === "stopped" &&
                                  "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                              )}
                              onClick={() => setFilterStatus("stopped")}
                            >
                              Остановлен
                            </Button>
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                                filterStatus === "blocked" &&
                                  "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                              )}
                              onClick={() => setFilterStatus("blocked")}
                            >
                              Заблокирован
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Device Filter */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-[#006039]" />
                        <Label className="text-sm">Устройство</Label>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="default"
                            className="w-full justify-between h-12"
                          >
                            <span className="text-[#006039]">
                              {filterDevice === "all"
                                ? "Все устройства"
                                : filterDevice === "none"
                                  ? "Без устройства"
                                  : devices.find(d => d.id === filterDevice)?.name || "Выберите устройство"}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[465px] p-0" align="start" sideOffset={5}>
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                placeholder="Поиск устройства"
                                value={deviceSearch}
                                onChange={(e) => setDeviceSearch(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-auto">
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                                filterDevice === "all" &&
                                  "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                              )}
                              onClick={() => setFilterDevice("all")}
                            >
                              Все устройства
                            </Button>
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                                filterDevice === "none" &&
                                  "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                              )}
                              onClick={() => setFilterDevice("none")}
                            >
                              Без устройства
                            </Button>
                            {devices
                              .filter(device => 
                                device.name.toLowerCase().includes(deviceSearch.toLowerCase())
                              )
                              .map((device) => (
                                <Button
                                  key={device.id}
                                  variant="ghost"
                                  size="default"
                                  className={cn(
                                    "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                                    filterDevice === device.id &&
                                      "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                                  )}
                                  onClick={() => setFilterDevice(device.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Smartphone className="h-4 w-4" />
                                    <span>{device.name}</span>
                                    {device.isOnline && (
                                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    )}
                                  </div>
                                </Button>
                              ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-12"
                        onClick={() => {
                          setFilterStatus("all");
                          setFilterDevice("all");
                          setDeviceSearch("");
                        }}
                      >
                        Сбросить все
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-12 bg-[#006039] hover:bg-[#006039]/90"
                        onClick={() => setFiltersOpen(false)}
                      >
                        Применить фильтры
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 h-12 px-6">
                    <ArrowUpDown className="h-4 w-4 text-[#006039]" />
                    {sortOrder === "newest" ? "Сначала новые" : "Сначала старые"}
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortOrder("newest")}>
                    Сначала новые
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("oldest")}>
                    Сначала старые
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedRequisites.length > 0 && (
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Выберите действие" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stop">
                        <div className="flex items-center">
                          <PauseCircle className="mr-2 h-4 w-4 text-[#006039]" />
                          Остановить
                        </div>
                      </SelectItem>
                      <SelectItem value="start">
                        <div className="flex items-center">
                          <PlayCircle className="mr-2 h-4 w-4 text-[#006039]" />
                          Запустить
                        </div>
                      </SelectItem>
                      <SelectItem value="archive">
                        <div className="flex items-center">
                          <Archive className="mr-2 h-4 w-4 text-[#006039]" />
                          Архивировать
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    className="bg-[#006039] hover:bg-[#006039]/90"
                  >
                    Применить
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Requisites List */}
          <div className="space-y-3">
            {filteredRequisites.map((requisite) => {
              const successRate =
                requisite.totalDeals > 0
                  ? (requisite.successfulDeals / requisite.totalDeals) * 100
                  : 0;
              const paymentSystem = detectPaymentSystem(requisite.cardNumber);

              return (
                <div key={requisite.id} className="relative">
                  {/* Checkbox - positioned outside card */}
                  <Checkbox
                    checked={selectedRequisites.includes(requisite.id)}
                    onCheckedChange={() => toggleSelect(requisite.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 flex-shrink-0"
                  />

                  <Card
                    className="pl-12 pr-4 py-4 hover:shadow-md transition-all duration-300 cursor-pointer border-gray-100"
                    onClick={() => setSelectedRequisiteForInfo(requisite)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Bank Logo */}
                      <div className="flex-shrink-0">
                        <Image
                          src={`/bank-logos/${getBankLogo(requisite.bankType)}`}
                          alt={requisite.bankType}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </div>

                      {/* Requisite Info + Card Number */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-gray-900">
                            {requisite.recipientName}
                          </div>
                          {requisite.device && (
                            <div className="flex items-center gap-1.5">
                              <Smartphone className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-sm text-green-600">
                                {requisite.device.name}
                              </span>
                            </div>
                          )}
                          {/* Card Number - moved closer to name/device */}
                          <div className="flex items-center gap-2">
                            {paymentSystem !== "unknown" && (
                              <PaymentSystemIcon system={paymentSystem} />
                            )}
                            <span className="font-semibold text-gray-900">
                              {requisite.cardNumber.replace(/(\d{4})/g, "$1 ").trim()}
                            </span>
                          </div>
                        </div>
                      </div>

                    {/* Success Rate */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-32">
                          <Progress value={successRate} className="h-1.5" />
                          <div className="text-xs text-gray-600 mt-1">
                            Успешные сделки: {requisite.successfulDeals || 0} из{" "}
                            {requisite.totalDeals || 0}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {successRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                      {/* Status */}
                      <div className="flex-shrink-0">
                        {!requisite.isArchived &&
                        requisite.hasDevice &&
                        requisite.device?.isOnline ? (
                          <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium">
                            В работе
                          </div>
                        ) : (
                          <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium">
                            Выключен реквизит
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>

          {filteredRequisites.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-[#006039] mb-4" />
              <p className="text-gray-500">Реквизиты не найдены</p>
            </div>
          )}
        </div>

        {/* Add Requisite Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Добавить реквизит</DialogTitle>
              <DialogDescription>
                Заполните данные для добавления нового платежного реквизита
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="method">Метод</Label>
                  <Select
                    value={requisiteForm.methodType}
                    onValueChange={(value) =>
                      setRequisiteForm({ ...requisiteForm, methodType: value })
                    }
                  >
                    <SelectTrigger id="method">
                      <SelectValue placeholder="Выберите метод" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="c2c">Карта → Карта</SelectItem>
                      <SelectItem value="sbp">СБП</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bank">Банк</Label>
                  <Select
                    value={requisiteForm.bankType}
                    onValueChange={(value) =>
                      setRequisiteForm({ ...requisiteForm, bankType: value })
                    }
                  >
                    <SelectTrigger id="bank">
                      <SelectValue placeholder="Выберите банк" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SBERBANK">Сбербанк</SelectItem>
                      <SelectItem value="TBANK">Т-Банк</SelectItem>
                      <SelectItem value="VTB">ВТБ</SelectItem>
                      <SelectItem value="ALFABANK">Альфа-Банк</SelectItem>
                      <SelectItem value="RAIFFEISEN">Райффайзен</SelectItem>
                      <SelectItem value="GAZPROMBANK">Газпромбанк</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardNumber">Номер карты</Label>
                  <Input
                    id="cardNumber"
                    placeholder="0000 0000 0000 0000"
                    value={requisiteForm.cardNumber}
                    onChange={(e) =>
                      setRequisiteForm({
                        ...requisiteForm,
                        cardNumber: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Номер телефона</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+7 900 000 00 00"
                    value={requisiteForm.phoneNumber}
                    onChange={(e) =>
                      setRequisiteForm({
                        ...requisiteForm,
                        phoneNumber: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="recipientName">Имя получателя</Label>
                <Input
                  id="recipientName"
                  placeholder="Иван Иванович И."
                  value={requisiteForm.recipientName}
                  onChange={(e) =>
                    setRequisiteForm({
                      ...requisiteForm,
                      recipientName: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minAmount">Мин. сумма транзакции</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    value={requisiteForm.minAmount}
                    onChange={(e) =>
                      setRequisiteForm({
                        ...requisiteForm,
                        minAmount: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="maxAmount">Макс. сумма транзакции</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    value={requisiteForm.maxAmount}
                    onChange={(e) =>
                      setRequisiteForm({
                        ...requisiteForm,
                        maxAmount: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dailyLimit">Дневной лимит</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    value={requisiteForm.dailyLimit}
                    onChange={(e) =>
                      setRequisiteForm({
                        ...requisiteForm,
                        dailyLimit: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="monthlyLimit">Месячный лимит</Label>
                  <Input
                    id="monthlyLimit"
                    type="number"
                    value={requisiteForm.monthlyLimit}
                    onChange={(e) =>
                      setRequisiteForm({
                        ...requisiteForm,
                        monthlyLimit: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="device">
                  Привязать к устройству (опционально)
                </Label>
                <Select
                  value={requisiteForm.deviceId}
                  onValueChange={(value) =>
                    setRequisiteForm({ ...requisiteForm, deviceId: value })
                  }
                >
                  <SelectTrigger id="device">
                    <SelectValue placeholder="Выберите устройство" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без устройства</SelectItem>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name} {device.isOnline && "(В сети)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Отмена
              </Button>
              <Button
                className="bg-[#006039] hover:bg-[#006039]/90"
                onClick={handleCreateRequisite}
                disabled={addingRequisite}
              >
                {addingRequisite && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Добавить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Requisite Info Modal */}
        {selectedRequisiteForInfo && (
          <RequisiteInfoModal
            open={!!selectedRequisiteForInfo}
            onOpenChange={(open) => !open && setSelectedRequisiteForInfo(null)}
            requisite={{
              id: selectedRequisiteForInfo.id,
              bankType: selectedRequisiteForInfo.bankType,
              cardNumber: selectedRequisiteForInfo.cardNumber,
              recipientName: selectedRequisiteForInfo.recipientName,
              phoneNumber: selectedRequisiteForInfo.phoneNumber,
              accountNumber: "40817810490069500347", // Mock account number
              status: selectedRequisiteForInfo.isArchived
                ? "inactive"
                : "active",
              device: selectedRequisiteForInfo.device,
              stats: {
                turnover24h: 0,
                deals24h: 0,
                profit24h: 0,
                conversion24h: 0,
              },
              verifications: {
                cardNumber: false,
                accountNumber: false,
                phoneNumber: selectedRequisiteForInfo.phoneNumber
                  ? true
                  : false,
              },
            }}
          />
        )}
      </AuthLayout>
    </ProtectedRoute>
  );
}
