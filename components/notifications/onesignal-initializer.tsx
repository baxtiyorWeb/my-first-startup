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
    if (window.OneSignal.Notifications && typeof window.OneSignal.Notifications.requestPermission === "function") {
      await window.OneSignal.Notifications.requestPermission();
      return window.OneSignal.Notifications.permission === "granted";
    }
    if (typeof Notification !== "undefined") {
      const res = await Notification.requestPermission();
      return res === "granted";
    }
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
        // non-blocking
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
