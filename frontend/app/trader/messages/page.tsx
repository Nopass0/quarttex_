"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { MessagesListNew } from "@/components/trader/messages-list-new";

export default function MessagesPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <MessagesListNew />
      </AuthLayout>
    </ProtectedRoute>
  );
}
