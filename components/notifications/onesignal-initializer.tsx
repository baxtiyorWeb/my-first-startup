"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-context";

declare global {
  interface Window {
    OneSignalDeferred?: any[];
  }
}

export function OneSignalInitializer() {
  const { session } = useAuth();
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  useEffect(() => {
    if (!appId || typeof window === "undefined") return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: appId,
          allowLocalhostAsSecureOrigin: true,
        });

        // Request browser push notification permission if default
        if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === "function") {
          if (OneSignal.Notifications.permission !== "granted") {
            OneSignal.Notifications.requestPermission();
          }
        } else if (typeof Notification !== "undefined" && Notification.permission === "default") {
          Notification.requestPermission();
        }

        // Map logged-in user to OneSignal external_id for targeted push notifications
        if (session.isAuthenticated && session.user?.id) {
          await OneSignal.login(session.user.id);
        }
      } catch (err) {
        console.warn("[ONESIGNAL CLIENT WARN]:", err);
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
