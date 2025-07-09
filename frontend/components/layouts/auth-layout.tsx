"use client"

import { Sidebar } from "@/components/navigation/sidebar"
import { SupportChat } from "@/components/support/support-chat"

interface AuthLayoutProps {
  children: React.ReactNode
  variant: "trader" | "admin" | "agent" | "merchant"
}

export function AuthLayout({ children, variant }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="flex">
          <div className="hidden md:block">
            <Sidebar variant={variant} />
          </div>
          <main className="flex-1 pb-20 md:pb-0">
            <div className="px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <div className="md:hidden">
        <Sidebar variant={variant} />
      </div>
      {variant !== "admin" && <SupportChat variant={variant} />}
    </div>
  )
}