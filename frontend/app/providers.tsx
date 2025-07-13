"use client"

import { ServerCheck } from "@/components/server-check"
import { AuthInitializer } from "@/components/auth/auth-initializer"
import { ThemeProvider } from "@/providers/theme-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AuthInitializer />
      <ServerCheck>
        {children}
      </ServerCheck>
    </ThemeProvider>
  )
}