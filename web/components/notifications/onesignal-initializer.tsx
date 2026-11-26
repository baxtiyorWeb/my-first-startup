"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-context";

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
    __onesignal_logged_user_id?: string | null;
    __onesignal_initialized?: boolean;
    __onesignal_ready_promise?: Promise<any | null>;
  }
}

/**
 * Wait until OneSignal.init() has actually finished resolving (avoiding calling
 * OneSignal.login / Slidedown while the SDK is still initializing).
 */
async function waitForOneSignalReady(timeoutMs = 10000): Promise<any | null> {
  if (typeof window === "undefined") return null;
  if (window.__onesignal_initialized && window.OneSignal) {
    return window.OneSignal;
  }
  if (!window.__onesignal_ready_promise) {
    return null;
  }
  try {
    const result = await Promise.race([
      window.__onesignal_ready_promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return window.__onesignal_initialized && result ? result : null;
  } catch {
    return null;
  }
}

/**
 * Prompt user for Push Notifications via OneSignal Web SDK v16 or Native Browser Notification.
 * Works whether SDK is already initialized or not yet loaded.
 */
export async function promptPushNotification(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const callOneSignal = async (OS: any): Promise<boolean> => {
    try {
      if (OS?.Slidedown?.promptPush) {
        await OS.Slidedown.promptPush({ force: true });
      } else if (OS?.Notifications?.requestPermission) {
        await OS.Notifications.requestPermission();
      } else if (typeof Notification !== "undefined" && typeof Notification.requestPermission === "function") {
        await Notification.requestPermission();
      }
      // Opt-in to push subscription if not already
      if (OS?.User?.PushSubscription?.optIn) {
        await OS.User.PushSubscription.optIn().catch(() => {});
      }
      const isGranted =
        (typeof Notification !== "undefined" && Notification.permission === "granted") ||
        OS?.Notifications?.permission === "granted";
      return Boolean(isGranted);
    } catch (err) {
      console.warn("[OneSignal prompt error]:", err);
      return false;
    }
  };

  const OS = await waitForOneSignalReady(5000);
  if (OS) {
    return callOneSignal(OS);
  }

  // Fallback to native browser Notification API if OneSignal is unavailable/blocked
  if (typeof Notification !== "undefined" && typeof Notification.requestPermission === "function") {
    try {
      const perm = await Notification.requestPermission();
      return perm === "granted";
    } catch {
      return false;
    }
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
  const optedIn = Boolean(window.OneSignal?.User?.PushSubscription?.optedIn || permission === "granted");
  return { permission, subscriptionId, optedIn };
}

/**
 * Show OS-level System Notification Banner on Desktop / Mobile / PWA
 */
export function showSystemNotification(
  title: string,
  options: { body: string; icon?: string; link?: string }
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const iconUrl = options.icon || "/logo.png";
  const linkUrl = options.link || "/dashboard/notifications";

  // Use Service Worker showNotification if active (best for Android, PWA, background tabs)
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification(title, {
          body: options.body,
          icon: iconUrl,
          badge: iconUrl,
          data: { url: linkUrl },
        });
      })
      .catch(() => {
        try {
          const notif = new Notification(title, { body: options.body, icon: iconUrl });
          notif.onclick = () => {
            window.focus();
            window.location.href = linkUrl;
          };
        } catch {}
      });
  } else {
    try {
      const notif = new Notification(title, { body: options.body, icon: iconUrl });
      notif.onclick = () => {
        window.focus();
        window.location.href = linkUrl;
      };
    } catch {}
  }
}

export function OneSignalInitializer() {
  const { session } = useAuth();

  // Safe User Login / Logout mapping with OneSignal External ID
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const syncUser = async () => {
      const OneSignal = await waitForOneSignalReady(15000);
      if (cancelled || !OneSignal || !window.__onesignal_initialized) return;
      if (typeof OneSignal.login !== "function") return;
      if (
        OneSignal.Notifications?.isPushSupported &&
        !OneSignal.Notifications.isPushSupported()
      ) {
        return;
      }

      try {
        if (session.isAuthenticated && session.user?.id) {
          if (window.__onesignal_logged_user_id === session.user.id) return;

          if (OneSignal.User?.externalId === session.user.id) {
            window.__onesignal_logged_user_id = session.user.id;
            return;
          }

          await OneSignal.login(session.user.id);
          window.__onesignal_logged_user_id = session.user.id;
          if (process.env.NODE_ENV !== "production") {
            console.log("[ONESIGNAL] Synced user login external_id:", session.user.id);
          }
        } else if (!session.isAuthenticated && window.__onesignal_logged_user_id) {
          if (typeof OneSignal.logout === "function") {
            await OneSignal.logout();
          }
          window.__onesignal_logged_user_id = null;
        }
      } catch (err: any) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[ONESIGNAL AUTH SYNC WARN]:", err?.message || err);
        }
      }
    };

    syncUser();

    return () => {
      cancelled = true;
    };
  }, [session.isAuthenticated, session.user?.id]);

  return null;
}
