"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface PwaInstallContextType {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isModalOpen: boolean;
  promptInstall: () => Promise<void>;
  openInstallModal: () => void;
  closeInstallModal: () => void;
}

const PwaInstallContext = createContext<PwaInstallContextType>({
  canInstall: false,
  isInstalled: false,
  isIOS: false,
  isModalOpen: false,
  promptInstall: async () => {},
  openInstallModal: () => {},
  closeInstallModal: () => {},
});

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Detect if already installed (Standalone display mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setIsInstalled(isStandalone);

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    // 3. Listen for Chromium/Android `beforeinstallprompt`
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsModalOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const openInstallModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeInstallModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setIsModalOpen(false);
        }
      } catch (err) {
        console.warn("[PWA INSTALL ERROR]:", err);
        openInstallModal();
      }
    } else {
      // For iOS or browsers without direct prompt event, open guide modal
      openInstallModal();
    }
  }, [deferredPrompt, openInstallModal]);

  const canInstall = !isInstalled;

  return (
    <PwaInstallContext.Provider
      value={{
        canInstall,
        isInstalled,
        isIOS,
        isModalOpen,
        promptInstall,
        openInstallModal,
        closeInstallModal,
      }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}
