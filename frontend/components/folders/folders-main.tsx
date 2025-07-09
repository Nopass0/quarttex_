"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Plus,
  Folder,
  FolderOpen,
  MoreVertical,
  Edit2,
  Trash2,
  CreditCard,
  AlertCircle,
  ChevronRight,
  Copy,
  CheckCircle2,
  Star,
  StarOff,
  Settings,
  ChevronDown,
  ArrowUpDown,
  SlidersHorizontal,
  Filter,
  Grid3X3,
  List
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { TraderHeader } from "@/components/trader/trader-header"
import { cn } from "@/lib/utils"

interface BankProfile {
  id: number
  name: string
  cardNumber: string
  bank: string
  logo: string
  isActive: boolean
  limit?: string
  used: number
  conversion: string
  status: "working" | "not_working" | "warning"
  groupId?: number
}

interface ProfileGroup {
  id: number
  name: string
  profilesCount: number
  isExpanded: boolean
  profiles: BankProfile[]
}

const mockProfiles: BankProfile[] = [
  {
    id: 327192,
    name: "Верозуб В.В.",
    cardNumber: "ВТБ счет",
    bank: "VTB",
    logo: "/banks/vtb.svg",
    isActive: false,
    limit: "Не указано",
    used: 0,
    conversion: "0%",
    status: "not_working"
  },
  {
    id: 283623,
    name: "Ермолин Я.Д.",
    cardNumber: "4125",
    bank: "VTB",
    logo: "/banks/vtb.svg",
    isActive: false,
    limit: "200k",
    used: 0,
    conversion: "0%",
    status: "not_working"
  },
  {
    id: 240022,
    name: "Гияев М.З.",
    cardNumber: "9658",
    bank: "VTB",
    logo: "/banks/vtb.svg",
    isActive: false,
    limit: "1kk",
    used: 0,
    conversion: "0%",
    status: "not_working"
  },
  {
    id: 305039,
    name: "Саларцорцян С.М.",
    cardNumber: "0174",
    bank: "Tinkoff",
    logo: "/banks/tinkoff.svg",
    isActive: false,
    limit: "Не указано",
    used: 0,
    conversion: "0%",
    status: "not_working"
  },
  {
    id: 305014,
    name: "Саларцорцян П.М.",
    cardNumber: "9012",
    bank: "Tinkoff",
    logo: "/banks/tinkoff.svg",
    isActive: false,
    limit: "Не указано",
    used: 0,
    conversion: "0%",
    status: "not_working"
  }
]

const mockGroups: ProfileGroup[] = [
  {
    id: 6208,
    name: "Профили без группы",
    profilesCount: 30,
    isExpanded: true,
    profiles: mockProfiles
  }
]

export function FoldersMain() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeView, setActiveView] = useState<"groups" | "profiles">("groups")
  const [sortBy, setSortBy] = useState("newest")
  const [groups, setGroups] = useState(mockGroups)
  const [selectedProfiles, setSelectedProfiles] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)

  const filteredProfiles = mockProfiles.filter(profile =>
    profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.cardNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.bank.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectProfile = (profileId: number) => {
    if (selectedProfiles.includes(profileId)) {
      setSelectedProfiles(selectedProfiles.filter(id => id !== profileId))
    } else {
      setSelectedProfiles([...selectedProfiles, profileId])
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProfiles([])
    } else {
      setSelectedProfiles(filteredProfiles.map(p => p.id))
    }
    setSelectAll(!selectAll)
  }

  const handleToggleGroup = (groupId: number) => {
    setGroups(groups.map(g => 
      g.id === groupId ? { ...g, isExpanded: !g.isExpanded } : g
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "working": return "text-green-600"
      case "warning": return "text-orange-600"
      case "not_working": return "text-red-600"
      default: return "text-gray-600"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "working": return "В работе"
      case "warning": return "Предупреждение"
      case "not_working": return "Не в работе"
      default: return "Неизвестно"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            <span className="hidden sm:inline">Банковские профили</span>
            <span className="sm:hidden">Профили</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <TraderHeader />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-[#006039] hover:bg-[#006039]/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Добавить</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <CreditCard className="h-4 w-4 mr-2 text-[#006039]" />
                Профиль
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Folder className="h-4 w-4 mr-2 text-gray-400" />
                Группу
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <Label className="text-sm font-medium">Поиск по ID</Label>
            <div className="mt-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Введите ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <Label className="text-sm font-medium">Параметры поиска</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="mt-2">
                      <SlidersHorizontal className="h-4 w-4 mr-2 text-[#006039]" />
                      <span className="text-gray-500">Не выбраны</span>
                      <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>По статусу</DropdownMenuItem>
                    <DropdownMenuItem>По банку</DropdownMenuItem>
                    <DropdownMenuItem>По лимиту</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Сортировка результатов</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="mt-2">
                    <ArrowUpDown className="h-4 w-4 mr-2 text-[#006039]" />
                    Сначала новые
                    <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy("newest")}>
                    Сначала новые
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                    Сначала старые
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Filters */}
          <div className="md:hidden">
            <Button variant="outline" className="w-full">
              <span>Расширенный поиск</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      <div className="space-y-4">
        {/* View Toggle */}
        <div className="flex justify-center">
          <div className="p-1 bg-gray-50 rounded-lg">
            <div className="relative flex">
              <div 
                className={cn(
                  "absolute h-full bg-green-50 rounded-lg transition-all duration-200",
                  activeView === "groups" ? "left-0 w-1/2" : "left-1/2 w-1/2"
                )}
              />
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "relative z-10 h-10 px-4",
                  activeView === "groups" 
                    ? "text-[#006039] font-semibold" 
                    : "text-gray-600"
                )}
                onClick={() => setActiveView("groups")}
              >
                <Folder className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "relative z-10 h-10 px-4",
                  activeView === "profiles" 
                    ? "text-[#006039] font-semibold" 
                    : "text-gray-600"
                )}
                onClick={() => setActiveView("profiles")}
              >
                <Grid3X3 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Groups View */}
        {activeView === "groups" && (
          <div className="space-y-4">
            {groups.map((group) => (
              <Card key={group.id} className="overflow-hidden">
                {/* Group Header */}
                <div 
                  className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleToggleGroup(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#006039] text-white rounded-lg">
                        <Folder className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{group.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 hidden sm:inline">
                        {group.profilesCount} <span className="text-gray-400">БП</span>
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm">
                            <span className="hidden sm:inline">Настроить</span>
                            <Settings className="h-4 w-4 sm:hidden" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <CheckCircle2 className="h-4 w-4 mr-2 text-[#006039]" />
                            Включить профили
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <AlertCircle className="h-4 w-4 mr-2 text-[#006039]" />
                            Выключить профили
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleGroup(group.id)
                        }}
                      >
                        <ChevronDown 
                          className={cn(
                            "h-4 w-4 transition-transform",
                            group.isExpanded ? "rotate-180" : ""
                          )} 
                        />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Group Content */}
                {group.isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Select All */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Выбрать все</span>
                    </label>

                    {/* Profiles List */}
                    <div className="space-y-3">
                      {filteredProfiles.slice(0, 5).map((profile) => (
                        <div key={profile.id} className="flex items-center gap-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedProfiles.includes(profile.id)}
                              onChange={() => handleSelectProfile(profile.id)}
                              className="rounded border-gray-300"
                            />
                          </label>
                          
                          <div className="flex-1 flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {profile.bank.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{profile.name}</p>
                                <p className="text-sm text-gray-500">
                                  #{profile.id} {profile.bank}
                                </p>
                              </div>
                            </div>

                            <div className="hidden sm:flex items-center gap-6 text-sm">
                              <span>{profile.limit || "Не указано"}</span>
                              <span>{profile.used} <span className="text-gray-400">RUB</span></span>
                              <span className="text-gray-400">{profile.conversion}</span>
                              <div className="flex items-center gap-1">
                                <span className={getStatusColor(profile.status)}>
                                  {getStatusText(profile.status)}
                                </span>
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Show All Link */}
                    <Button variant="link" className="text-[#006039] p-0">
                      Показать все ({group.profilesCount})
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Profiles View */}
        {activeView === "profiles" && (
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map((profile) => (
                <div key={profile.id} className="p-4 border border-gray-200 rounded-lg hover:border-[#006039] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {profile.bank.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{profile.name}</p>
                        <p className="text-sm text-gray-500">
                          #{profile.id} {profile.bank}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {profile.cardNumber}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Копировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Статус</span>
                      <span className={getStatusColor(profile.status)}>
                        {getStatusText(profile.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredProfiles.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Профили не найдены</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}