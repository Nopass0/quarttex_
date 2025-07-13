'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Smartphone,
  Tablet,
  Monitor,
  Activity,
  AlertCircle,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  User,
  CreditCard,
  Calendar,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { adminApi } from '@/services/api'

type Device = {
  id: string
  deviceId: string
  name: string
  model: string
  manufacturer: string
  fingerprint: string
  appVersion: string
  isActive: boolean
  isConnected: boolean
  trader: {
    id: string
    name: string
    email: string
  }
  bankDetails: Array<{
    id: string
    bankType: string
    cardNumber: string
    recipientName: string
    isActive: boolean
  }>
  lastActiveAt: string
  createdAt: string
}

type Statistics = {
  total: number
  active: number
  inactive: number
}

export function DevicesManagement() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    active: 0,
    inactive: 0,
  })
  const [devices, setDevices] = useState<Device[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  })
  
  // Filters
  const [filters, setFilters] = useState({
    traderId: '',
    isActive: '',
    deviceId: '',
    model: '',
    appVersion: '',
  })
  
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const fetchDevices = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true)
      const params: any = {
        page,
        pageSize: pagination.pageSize,
      }

      // Apply filters
      if (filters.traderId) params.traderId = filters.traderId
      if (filters.isActive !== '') params.isActive = filters.isActive
      if (filters.deviceId) params.deviceId = filters.deviceId
      if (filters.model) params.model = filters.model
      if (filters.appVersion) params.appVersion = filters.appVersion
      if (debouncedSearchQuery) params.search = debouncedSearchQuery

      const response = await adminApi.getDevices(params)
      
      setStatistics(response.statistics)
      setDevices(response.devices)
      setPagination(response.pagination)
    } catch (error) {
      toast.error('Failed to fetch devices')
      console.error('Error fetching devices:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters, debouncedSearchQuery, pagination.pageSize])

  useEffect(() => {
    fetchDevices(1)
  }, [filters, debouncedSearchQuery])

  const handlePageChange = (newPage: number) => {
    fetchDevices(newPage)
  }

  const clearFilters = () => {
    setFilters({
      traderId: '',
      isActive: '',
      deviceId: '',
      model: '',
      appVersion: '',
    })
    setSearchQuery('')
  }

  const handleToggleActive = async (device: Device) => {
    try {
      await adminApi.updateDevice(device.id, { isActive: !device.isActive })
      await fetchDevices(pagination.page)
      toast.success(`Device ${device.isActive ? 'deactivated' : 'activated'}`)
    } catch (error) {
      toast.error('Failed to update device status')
    }
  }

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return

    try {
      await adminApi.deleteDevice(selectedDevice.id)
      await fetchDevices(pagination.page)
      toast.success('Device deleted successfully')
      setShowDeleteDialog(false)
      setSelectedDevice(null)
    } catch (error) {
      toast.error('Failed to delete device')
    }
  }

  const navigateToDetails = (deviceId: string) => {
    router.push(`/admin/devices/${deviceId}`)
  }

  const getDeviceIcon = (model: string) => {
    const modelLower = model.toLowerCase()
    if (modelLower.includes('tablet') || modelLower.includes('ipad')) {
      return Tablet
    } else if (modelLower.includes('desktop') || modelLower.includes('pc')) {
      return Monitor
    }
    return Smartphone
  }

  const getLastActiveStatus = (lastActiveAt: string) => {
    const lastActive = new Date(lastActiveAt)
    const now = new Date()
    const diffHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 1) {
      return { label: 'Online', variant: 'default' as const, color: 'text-green-600' }
    } else if (diffHours < 24) {
      return { label: 'Today', variant: 'secondary' as const, color: 'text-blue-600' }
    } else if (diffHours < 168) { // 7 days
      return { label: `${Math.floor(diffHours / 24)}d ago`, variant: 'outline' as const, color: 'text-gray-600' }
    } else {
      return { label: 'Inactive', variant: 'destructive' as const, color: 'text-red-600' }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{statistics.total}</p>
              <Smartphone className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-green-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-green-600">{statistics.active}</p>
              <Activity className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-red-600">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-red-600">{statistics.inactive}</p>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search & Filters</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchDevices(pagination.page)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by device ID, name, model, or trader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.isActive}
                    onValueChange={(value) => setFilters({ ...filters, isActive: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Device ID</Label>
                  <Input
                    placeholder="Filter by device ID"
                    value={filters.deviceId}
                    onChange={(e) => setFilters({ ...filters, deviceId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    placeholder="Filter by model"
                    value={filters.model}
                    onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>App Version</Label>
                  <Input
                    placeholder="e.g., 1.0.0"
                    value={filters.appVersion}
                    onChange={(e) => setFilters({ ...filters, appVersion: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={clearFilters} disabled={isLoading}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Devices List</CardTitle>
          <CardDescription>
            Manage all registered devices across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && devices.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device ID/Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trader</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => {
                      const DeviceIcon = getDeviceIcon(device.model)
                      const lastActiveStatus = getLastActiveStatus(device.lastActiveAt)
                      
                      return (
                        <TableRow 
                          key={device.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => navigateToDetails(device.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DeviceIcon className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-mono text-sm">{device.deviceId}</div>
                                <div className="text-xs text-gray-500">{device.fingerprint}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{device.name}</div>
                              <div className="text-sm text-gray-500">{device.model} • {device.manufacturer}</div>
                              <Badge variant="outline" className="mt-1 text-xs">{device.appVersion}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge 
                                variant={device.isActive ? "default" : "secondary"}
                                className="w-fit"
                              >
                                {device.isActive ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inactive
                                  </>
                                )}
                              </Badge>
                              <Badge 
                                variant={device.isConnected ? "outline" : "outline"}
                                className={cn(
                                  "w-fit",
                                  device.isConnected ? "text-green-600 border-green-200" : "text-gray-600 border-gray-200"
                                )}
                              >
                                {device.isConnected ? (
                                  <>
                                    <Wifi className="h-3 w-3 mr-1" />
                                    Connected
                                  </>
                                ) : (
                                  <>
                                    <WifiOff className="h-3 w-3 mr-1" />
                                    Disconnected
                                  </>
                                )}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium">{device.trader.name}</div>
                                <div className="text-sm text-gray-500">{device.trader.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {device.bankDetails.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-gray-400" />
                                <div>
                                  <div className="text-sm">{device.bankDetails.length} linked</div>
                                  <div className="text-xs text-gray-500">
                                    {device.bankDetails.filter(bd => bd.isActive).length} active
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">No bank details</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className={cn("text-sm font-medium", lastActiveStatus.color)}>
                                  {lastActiveStatus.label}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(device.lastActiveAt)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigateToDetails(device.id)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleActive(device)
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {device.isActive ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedDevice(device)
                                    setShowDeleteDialog(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {devices.length} of {pagination.total} devices
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages || isLoading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Device?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this device? This action cannot be undone.
              {selectedDevice && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">
                    <strong>Device:</strong> {selectedDevice.name} ({selectedDevice.model})
                  </p>
                  <p className="text-sm">
                    <strong>Trader:</strong> {selectedDevice.trader.name}
                  </p>
                  <p className="text-sm">
                    <strong>Device ID:</strong> {selectedDevice.deviceId}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setSelectedDevice(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDevice}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}