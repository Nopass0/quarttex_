"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { FoldersMain } from "@/components/folders/folders-main"

export default function TraderFoldersPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <FoldersMain />
      </AuthLayout>
    </ProtectedRoute>
  )
}