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
 * Prompt user for Push Notifications via OneSignal Web SDK v16 or Native Browser Notification
 */
export async function promptPushNotification(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    let isGranted = false;

    // 1. Try OneSignal Slidedown (polite custom UI)
    if (window.OneSignal?.Slidedown?.promptPush) {
      await window.OneSignal.Slidedown.promptPush({ force: true }).catch(() => {});
    }

    // 2. Request native permission through OneSignal or Native Browser API
    if (window.OneSignal?.Notifications && typeof window.OneSignal.Notifications.requestPermission === "function") {
      await window.OneSignal.Notifications.requestPermission().catch(() => {});
      isGranted = window.OneSignal?.Notifications?.permission === "granted";
    } else if (typeof Notification !== "undefined" && typeof Notification.requestPermission === "function") {
      const res = await Notification.requestPermission();
      isGranted = res === "granted";
    }

    // 3. Explicitly Opt In to Push Subscription in OneSignal v16 if available
    if (isGranted && window.OneSignal?.User?.PushSubscription?.optIn) {
      await window.OneSignal.User.PushSubscription.optIn().catch(() => {});
    }

    return Boolean(isGranted);
  } catch (err) {
    console.warn("[PUSH NOTIFICATION PROMPT WARN]:", err);
    return false;
  }
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
        // Fallback to Window Notification API
        try {
          const notif = new Notification(title, { body: options.body, icon: iconUrl });
          notif.onclick = () => {
            window.focus();
            window.location.href = linkUrl;
          };
        } catch {}
      });
  } else {
    // Standard Desktop Notification API
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
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  // Politely ask for notification permission on desktop/mobile
  useEffect(() => {
    if (typeof window === "undefined") return;

    const timer = setTimeout(() => {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        promptPushNotification().catch(() => {});
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

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
          safari_web_id: "web.onesignal.auto.48cecb45-b9e1-42c4-afaa-e45f7f034833",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: true,
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

  return null;
}
