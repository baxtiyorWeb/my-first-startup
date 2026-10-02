"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-context";

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
    __onesignal_initialized?: boolean;
    __onesignal_logged_user_id?: string | null;
  }
}

/**
 * Prompt user for Push Notifications via OneSignal Web SDK v16
 */
export async function promptPushNotification(): Promise<boolean> {
  if (typeof window === "undefined" || !window.OneSignal) return false;

  try {
    // 1. Request native permission
    if (window.OneSignal.Notifications && typeof window.OneSignal.Notifications.requestPermission === "function") {
      await window.OneSignal.Notifications.requestPermission();
    } else if (typeof Notification !== "undefined") {
      await Notification.requestPermission();
    }

    const isGranted =
      window.OneSignal?.Notifications?.permission === "granted" ||
      (typeof Notification !== "undefined" && Notification.permission === "granted");

    // 2. Explicitly Opt In to Push Subscription in OneSignal v16
    if (isGranted && window.OneSignal?.User?.PushSubscription?.optIn) {
      await window.OneSignal.User.PushSubscription.optIn();
    }

    return Boolean(isGranted);
  } catch (err) {
    console.warn("[ONESIGNAL PROMPT WARN]:", err);
  }
  return false;
}

/**
 * Check if the current user has opted in to Push Notifications
 */
export function getPushPermissionStatus(): "default" | "granted" | "denied" {
  if (typeof window === "undefined") return "default";
  if (window.OneSignal?.Notifications?.permission) {
    return window.OneSignal.Notifications.permission;
  }
  if (typeof Notification !== "undefined") {
    return Notification.permission as "default" | "granted" | "denied";
  }
  return "default";
}

/**
 * Get detailed subscription state
 */
export function getPushSubscriptionDetails(): {
  permission: "default" | "granted" | "denied";
  subscriptionId?: string | null;
  optedIn: boolean;
} {
  if (typeof window === "undefined") return { permission: "default", optedIn: false };
  const permission = getPushPermissionStatus();
  const subscriptionId = window.OneSignal?.User?.PushSubscription?.id || null;
  const optedIn = Boolean(window.OneSignal?.User?.PushSubscription?.optedIn);
  return { permission, subscriptionId, optedIn };
}

export function OneSignalInitializer() {
  const { session } = useAuth();
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  // 1. One-time SDK initialization (Guarded against Fast Refresh / React StrictMode)
  useEffect(() => {
    if (!appId || typeof window === "undefined") return;

    if (window.__onesignal_initialized) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        if (window.__onesignal_initialized || OneSignal?.initialized) {
          window.__onesignal_initialized = true;
          return;
        }

        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false,
          },
        });

        window.__onesignal_initialized = true;

        if (process.env.NODE_ENV !== "production") {
          console.log("[ONESIGNAL] SDK initialized successfully.");
        }

        // Listen for subscription changes (e.g., when user clicks Allow)
        if (OneSignal.User?.PushSubscription?.addEventListener) {
          OneSignal.User.PushSubscription.addEventListener("change", (change: any) => {
            if (process.env.NODE_ENV !== "production") {
              console.log("[ONESIGNAL] PushSubscription changed:", change?.current);
            }
          });
        }

        // Prompt politely if user hasn't chosen yet
        setTimeout(() => {
          if (typeof Notification !== "undefined" && Notification.permission === "default") {
            if (OneSignal.Slidedown?.promptPush) {
              OneSignal.Slidedown.promptPush({ force: true }).catch(() => {});
            }
          }
        }, 2500);
      } catch (err: any) {
        if (err?.message?.includes("already initialized")) {
          window.__onesignal_initialized = true;
          return;
        }
        console.warn("[ONESIGNAL CLIENT INIT WARN]:", err);
      }
    });
  }, [appId]);

  // 2. Safe User Login / Logout mapping (Separated to prevent re-calling init)
  useEffect(() => {
    if (!appId || typeof window === "undefined") return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        if (session.isAuthenticated && session.user?.id) {
          if (window.__onesignal_logged_user_id !== session.user.id) {
            await OneSignal.login(session.user.id);
            window.__onesignal_logged_user_id = session.user.id;
            if (process.env.NODE_ENV !== "production") {
              console.log("[ONESIGNAL] Logged in external_id:", session.user.id);
            }
          }
        } else if (!session.isAuthenticated && window.__onesignal_logged_user_id) {
          await OneSignal.logout();
          window.__onesignal_logged_user_id = null;
        }
      } catch (err: any) {
        console.warn("[ONESIGNAL AUTH SYNC WARN]:", err?.message || err);
      }
    });
  }, [appId, session.isAuthenticated, session.user?.id]);

  if (!appId) return null;

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
      defer
    />
  );
}
