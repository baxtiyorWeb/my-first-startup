"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";

export default function Home() {
  const router = useRouter();
  const { session, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!session.isAuthenticated) {
      router.replace("/auth/login");
    } else {
      router.replace("/dashboard");
    }
  }, [session, isLoaded, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-6 h-6 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
