"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  LayoutDashboard, 
  Receipt, 
  AlertCircle, 
  Settings,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Code
} from "lucide-react"
import { useMerchantAuth } from "@/stores/merchant-auth"

const sidebarItems = [
  {
    title: "Панель управления",
    href: "/merchant",
    icon: LayoutDashboard,
  },
  {
    title: "Транзакции",
    href: "/merchant/transactions",
    icon: Receipt,
  },
  {
    title: "Споры",
    href: "/merchant/disputes",
    icon: AlertCircle,
  },
  {
    title: "API документация",
    href: "/merchant/api-docs",
    icon: Code,
  },
  {
    title: "Настройки",
    href: "/merchant/settings",
    icon: Settings,
  },
  {
    title: "Помощь",
    href: "/merchant/help",
    icon: HelpCircle,
  },
]

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { logout, merchantName } = useMerchantAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div
        className={cn(
          "relative z-50 flex flex-col border-r bg-background transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
                M
              </div>
              <span className="font-semibold">Merchant</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(!sidebarOpen && "mx-auto")}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* User info */}
        {sidebarOpen && merchantName && (
          <div className="px-4 py-3 border-b">
            <p className="text-sm text-muted-foreground">Мерчант</p>
            <p className="font-medium truncate">{merchantName}</p>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground",
                    !sidebarOpen && "justify-center"
                  )}
                  title={!sidebarOpen ? item.title : undefined}
                >
                  <Icon className={cn("h-4 w-4", !sidebarOpen && "h-5 w-5")} />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1">{item.title}</span>
                      {isActive && <ChevronRight className="h-4 w-4" />}
                    </>
                  )}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Logout button */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className={cn(
              "w-full",
              !sidebarOpen && "px-2"
            )}
            onClick={() => logout()}
          >
            <LogOut className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
            {sidebarOpen && "Выйти"}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-16 border-b bg-background flex items-center px-6">
          <h2 className="text-lg font-semibold">
            {sidebarItems.find(item => item.href === pathname)?.title || "Мерчант"}
          </h2>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  )
}