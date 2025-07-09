"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { MessagesList } from "@/components/trader/messages-list"

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <AuthLayout variant="trader">
        <MessagesList />
      </AuthLayout>
    </ProtectedRoute>
  )
}