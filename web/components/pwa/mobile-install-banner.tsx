"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Download, X } from "lucide-react";
import { usePwaInstall } from "./pwa-install-context";

export function MobileInstallBanner() {
  const { isInstalled, promptInstall } = usePwaInstall();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user dismissed banner previously in this session
    const dismissed = sessionStorage.getItem("pwa_banner_dismissed");
    if (!dismissed && !isInstalled) {
      // Delay slightly for smooth UX
      const timer = setTimeout(() => setIsDismissed(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pwa_banner_dismissed", "true");
    }
  };

  if (isInstalled || isDismissed) return null;

  return (
    <div className="md:hidden fixed bottom-16 left-3 right-3 z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white border border-slate-700/60 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm bg-slate-950 shrink-0 border border-slate-700">
            <Image
              src="/logo.png"
              alt="The Go-getters"
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">The Go-getters ilovasi</p>
            <p className="text-[10px] text-slate-300 truncate">
              Bosh ekranga o‘rnating va tezroq kiring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={promptInstall}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs active:scale-95 transition-all"
          >
            <Download size={13} />
            <span>O‘rnatish</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            aria-label="Yopish"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
