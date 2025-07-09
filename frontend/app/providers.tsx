"use client"

import { ServerCheck } from "@/components/server-check"
import { AuthInitializer } from "@/components/auth/auth-initializer"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthInitializer />
      <ServerCheck>
        {children}
      </ServerCheck>
    </>
  )
}