"use client"

import { Sidebar } from "@/components/navigation/sidebar"
import { SupportChat } from "@/components/support/support-chat"

interface AuthLayoutProps {
  children: React.ReactNode
  variant: "trader" | "admin" | "agent" | "merchant"
}

export function AuthLayout({ children, variant }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f]">
      <div className="mx-auto max-w-[1920px] px-0 lg:px-6 xl:px-12 2xl:px-20">
        <div className="flex">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <Sidebar variant={variant} />
          </div>
          
          {/* Main Content Area */}
          <main className="flex-1 min-w-0 pb-20 md:pb-0">
            <div className="h-full px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl py-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="md:hidden">
        <Sidebar variant={variant} />
      </div>
      
      {/* Support Chat */}
      {variant !== "admin" && <SupportChat variant={variant} />}
    </div>
  )
}