"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-context";

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
    __onesignal_logged_user_id?: string | null;
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

  // If SDK already loaded and initialized — call directly
  if (window.OneSignal && typeof window.OneSignal.init === "function") {
    return callOneSignal(window.OneSignal);
  }

  // SDK not yet loaded — push into the deferred queue
  return new Promise((resolve) => {
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        resolve(await callOneSignal(OneSignal));
      });
    } catch {
      resolve(false);
    }
  });
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

    const syncUser = async (OneSignal: any) => {
      try {
        if (!OneSignal || typeof OneSignal.login !== "function") return;

        if (session.isAuthenticated && session.user?.id) {
          if (window.__onesignal_logged_user_id !== session.user.id) {
            await OneSignal.login(session.user.id);
            window.__onesignal_logged_user_id = session.user.id;
            if (process.env.NODE_ENV !== "production") {
              console.log("[ONESIGNAL] Synced user login external_id:", session.user.id);
            }
          }
        } else if (!session.isAuthenticated && window.__onesignal_logged_user_id) {
          if (typeof OneSignal.logout === "function") {
            await OneSignal.logout();
          }
          window.__onesignal_logged_user_id = null;
        }
      } catch (err: any) {
        console.warn("[ONESIGNAL AUTH SYNC WARN]:", err?.message || err);
      }
    };

    // If SDK already initialized, call directly; otherwise queue it
    if (window.OneSignal && typeof window.OneSignal.init === "function") {
      syncUser(window.OneSignal);
    } else {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(syncUser);
    }
  }, [session.isAuthenticated, session.user?.id]);

  return null;
}
