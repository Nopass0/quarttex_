"use client"

import { MerchantProtectedRoute } from "@/components/auth/merchant-protected-route"
import { MerchantLayout } from "@/components/layouts/merchant-layout"
import { MerchantDisputesList } from "@/components/merchant/disputes-list"

export default function MerchantDisputesPage() {
  return (
    <MerchantProtectedRoute>
      <MerchantLayout>
        <MerchantDisputesList />
      </MerchantLayout>
    </MerchantProtectedRoute>
  )
}