"use client";

import { useAuth } from "@/components/auth/auth-context";
import { PushPermissionModal } from "@/components/notifications/push-permission-modal";

/**
 * Renders PushPermissionModal only for authenticated users.
 * Placed inside AuthProvider so we can read session state.
 */
export function AuthedPushModal() {
  const { session, isLoaded } = useAuth();
  if (!isLoaded || !session.isAuthenticated) return null;
  return <PushPermissionModal />;
}
