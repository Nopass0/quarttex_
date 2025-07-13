"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { DisputesListEnhanced } from "@/components/disputes/disputes-list-enhanced"

export default function TraderDisputesDealsPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <DisputesListEnhanced userType="trader" />
      </AuthLayout>
    </ProtectedRoute>
  )
}