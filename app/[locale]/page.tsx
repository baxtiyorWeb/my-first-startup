"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";

export default function LocaleHome() {
  const router = useRouter();
  const { session, isLoaded } = useAuth();
  const { localePath } = useI18n();

  useEffect(() => {
    if (!isLoaded) return;
    if (!session.isAuthenticated) {
      router.replace(localePath("/auth/login"));
    } else {
      router.replace(localePath("/dashboard"));
    }
  }, [session, isLoaded, router, localePath]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-6 h-6 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
