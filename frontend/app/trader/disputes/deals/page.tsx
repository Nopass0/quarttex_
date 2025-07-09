"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { DisputedDealsList } from "@/components/disputes/disputed-deals-list"

export default function TraderDisputesDealsPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <DisputedDealsList />
      </AuthLayout>
    </ProtectedRoute>
  )
}