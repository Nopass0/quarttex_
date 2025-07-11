"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { traderApi } from "@/services/api"
import {
  Folder,
  FolderOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  CreditCard,
  Loader2,
  Edit,
  Trash2,
  Settings,
  PlayCircle,
  PauseCircle,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Requisite {
  id: string
  cardNumber: string
  bankType: string
  recipientName: string
  isActive: boolean
  dailyTurnover: number
  dailyLimit: number
  monthlyTurnover: number
  monthlyLimit: number
  folderId?: string
}

interface Folder {
  id: string
  title: string
  requisites: Requisite[]
  isExpanded?: boolean
}

export function FoldersEnhanced() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [requisites, setRequisites] = useState<Requisite[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [selectedRequisites, setSelectedRequisites] = useState<string[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch requisites
      const requisitesResponse = await traderApi.getRequisites()
      const requisitesData = requisitesResponse.data || requisitesResponse.requisites || requisitesResponse || []
      
      // Mock folders data
      const mockFolders: Folder[] = [
        {
          id: "1",
          title: "Основные карты",
          requisites: []
        },
        {
          id: "2", 
          title: "Резервные карты",
          requisites: []
        }
      ]
      
      // Assign some requisites to folders
      const allRequisites = Array.isArray(requisitesData) ? requisitesData : []
      if (allRequisites.length > 0) {
        mockFolders[0].requisites = allRequisites.slice(0, 2)
        mockFolders[1].requisites = allRequisites.slice(2, 4)
      }
      
      setRequisites(allRequisites)
      setFolders(mockFolders)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Не удалось загрузить данные")
    } finally {
      setLoading(false)
    }
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Введите название папки")
      return
    }

    if (selectedRequisites.length === 0) {
      toast.error("Выберите хотя бы один реквизит")
      return
    }

    try {
      // Simulate creating folder
      const newFolder: Folder = {
        id: Date.now().toString(),
        title: newFolderName,
        requisites: requisites.filter(r => selectedRequisites.includes(r.id))
      }
      
      setFolders([...folders, newFolder])
      toast.success("Папка создана")
      setShowCreateDialog(false)
      setNewFolderName("")
      setSelectedRequisites([])
    } catch (error) {
      toast.error("Не удалось создать папку")
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      setFolders(folders.filter(f => f.id !== folderId))
      toast.success("Папка удалена")
    } catch (error) {
      toast.error("Не удалось удалить папку")
    }
  }

  const handleToggleAllRequisites = async (folderId: string, activate: boolean) => {
    try {
      const folder = folders.find(f => f.id === folderId)
      if (!folder) return

      // Update all requisites in the folder
      const updatedFolders = folders.map(f => {
        if (f.id === folderId) {
          return {
            ...f,
            requisites: f.requisites.map(r => ({ ...r, isActive: activate }))
          }
        }
        return f
      })
      
      setFolders(updatedFolders)
      toast.success(activate ? "Все реквизиты запущены" : "Все реквизиты остановлены")
    } catch (error) {
      toast.error("Не удалось изменить статус реквизитов")
    }
  }

  const handleToggleRequisite = async (requisiteId: string, activate: boolean) => {
    try {
      const updatedFolders = folders.map(folder => ({
        ...folder,
        requisites: folder.requisites.map(r => 
          r.id === requisiteId ? { ...r, isActive: activate } : r
        )
      }))
      
      setFolders(updatedFolders)
      toast.success(activate ? "Реквизит запущен" : "Реквизит остановлен")
    } catch (error) {
      toast.error("Не удалось изменить статус реквизита")
    }
  }

  const getUnassignedRequisites = () => {
    const assignedIds = new Set(folders.flatMap(f => f.requisites.map(r => r.id)))
    return requisites.filter(r => !assignedIds.has(r.id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Папки реквизитов</h1>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#006039] hover:bg-[#006039]/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Создать папку
        </Button>
      </div>

      {/* Folders List */}
      <div className="space-y-4">
        {folders.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Нет созданных папок</p>
            <p className="text-sm mt-2">Создайте папку для группировки реквизитов</p>
          </Card>
        ) : (
          folders.map((folder) => {
            const isExpanded = expandedFolders.has(folder.id)
            const activeCount = folder.requisites.filter(r => r.isActive).length
            const totalCount = folder.requisites.length

            return (
              <Card key={folder.id} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleFolder(folder.id)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <>
                            <FolderOpen className="h-6 w-6 text-[#006039]" />
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </>
                        ) : (
                          <>
                            <Folder className="h-6 w-6 text-[#006039]" />
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          </>
                        )}
                        <div className="text-left">
                          <h3 className="font-semibold">{folder.title}</h3>
                          <p className="text-sm text-gray-500">
                            {totalCount} реквизитов • {activeCount} активных
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAllRequisites(folder.id, true)}
                          disabled={activeCount === totalCount}
                        >
                          <PlayCircle className="h-4 w-4 mr-1 text-green-600" />
                          Запустить все
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAllRequisites(folder.id, false)}
                          disabled={activeCount === 0}
                        >
                          <PauseCircle className="h-4 w-4 mr-1 text-red-600" />
                          Остановить все
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFolder(folder)
                            setShowEditDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFolder(folder.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="border-t">
                      {folder.requisites.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <p>В папке нет реквизитов</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {folder.requisites.map((requisite) => (
                            <div key={requisite.id} className="p-4 hover:bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <CreditCard className="h-5 w-5 text-gray-400" />
                                  <div>
                                    <div className="font-medium">
                                      {requisite.cardNumber}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {requisite.bankType} • {requisite.recipientName}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-sm">
                                      Оборот: {(requisite.dailyTurnover || 0).toLocaleString()} / {(requisite.dailyLimit || 0).toLocaleString()} ₽
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      За месяц: {(requisite.monthlyTurnover || 0).toLocaleString()} / {(requisite.monthlyLimit || 0).toLocaleString()} ₽
                                    </div>
                                  </div>
                                  
                                  <Badge
                                    variant={requisite.isActive ? "success" : "secondary"}
                                    className={cn(
                                      "min-w-[80px] justify-center",
                                      requisite.isActive ? "bg-green-100 text-green-800" : ""
                                    )}
                                  >
                                    {requisite.isActive ? "Активен" : "Выключен"}
                                  </Badge>
                                  
                                  <Switch
                                    checked={requisite.isActive}
                                    onCheckedChange={(checked) => handleToggleRequisite(requisite.id, checked)}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })
        )}
      </div>

      {/* Unassigned Requisites */}
      {getUnassignedRequisites().length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold">Реквизиты без папки</h3>
          </div>
          <div className="space-y-2">
            {getUnassignedRequisites().map((requisite) => (
              <div key={requisite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{requisite.cardNumber}</span>
                  <span className="text-sm text-gray-500">{requisite.bankType}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Не назначен
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать папку</DialogTitle>
            <DialogDescription>
              Создайте папку для группировки реквизитов
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Название папки</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Например, Основные карты"
              />
            </div>
            
            <div>
              <Label>Выберите реквизиты</Label>
              <div className="border rounded-lg max-h-60 overflow-y-auto p-3 space-y-2">
                {requisites.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Нет доступных реквизитов
                  </p>
                ) : (
                  requisites.map((requisite) => (
                    <label
                      key={requisite.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedRequisites.includes(requisite.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRequisites([...selectedRequisites, requisite.id])
                          } else {
                            setSelectedRequisites(selectedRequisites.filter(id => id !== requisite.id))
                          }
                        }}
                      />
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{requisite.cardNumber}</div>
                        <div className="text-xs text-gray-500">
                          {requisite.bankType} • {requisite.recipientName}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false)
              setNewFolderName("")
              setSelectedRequisites([])
            }}>
              Отмена
            </Button>
            <Button
              onClick={handleCreateFolder}
              className="bg-[#006039] hover:bg-[#006039]/90"
              disabled={!newFolderName.trim() || selectedRequisites.length === 0}
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}