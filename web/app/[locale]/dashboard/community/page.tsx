"use client";

import React from "react";
import { useAuth } from "@/components/auth/auth-context";
import { CommunityChat } from "@/components/community/community-chat";

export default function CommunityPage() {
  const { session, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-[#070a0f]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0d9488] dark:border-[#2dd4bf] border-t-transparent" />
      </div>
    );
  }

  if (!session.isAuthenticated || !session.user?.id) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-[#070a0f] p-6">
        <div className="max-w-sm rounded-2xl border border-[#cfd9de] dark:border-white/[0.08] bg-[#f7f9f9] dark:bg-[#12161f] p-6 text-center">
          <h1 className="text-[15px] font-bold text-[#0f1419] dark:text-white">Geters Community</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#536471] dark:text-zinc-400">
            Guruhda yozish uchun tizimga kiring. Barcha ro&apos;yxatdan o&apos;tgan
            foydalanuvchilar rasmiy guruhning a&apos;zosidir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CommunityChat
      viewer={{
        id: session.user.id,
        name: session.user.name,
        handle: session.user.handle,
        avatarUrl: session.user.avatarUrl,
        verified: session.user.verified,
        role: session.user.role,
      }}
    />
  );
}
