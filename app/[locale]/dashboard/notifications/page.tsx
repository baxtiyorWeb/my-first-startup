"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BellIcon } from "@/components/icons";
import { Check, Heart, MessageSquare, UserPlus, FileText, Loader2, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { NotificationItem } from "@/lib/api/notifications";
import { useI18n } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";

export default function NotificationsPage() {
  const { localePath } = useI18n();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.notifications.getNotifications({ limit: 30 });
      setItems(Array.isArray(res.items) ? res.items : []);
      setUnreadCount(typeof res.unreadCount === "number" ? res.unreadCount : 0);
      setError(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Bildirishnomalarni yuklab bo'lmadi";
      setError(message);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAsRead();
      setUnreadCount(0);
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      console.error("[NOTIFICATIONS] Mark all read error:", err);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await api.notifications.markAsRead(item.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i))
        );
      } catch (err) {
        console.error("[NOTIFICATIONS] Mark single read error:", err);
      }
    }
  };

  const renderIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case "comment":
      case "reply":
        return <MessageSquare className="w-4 h-4 text-indigo-500 fill-indigo-500/20" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-emerald-500" />;
      case "new_post":
        return <FileText className="w-4 h-4 text-amber-500" />;
      default:
        return <BellIcon size={16} className="text-slate-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 w-full animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </p>
        <button
          type="button"
          onClick={fetchNotifications}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Qayta urinib ko'rish</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-3xl mx-auto">
      {/* Top action header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Bildirishnomalar
          </h2>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
              {unreadCount} ta o'qilmagan
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Barchasini o'qilgan deb belgilash</span>
          </button>
        )}
      </div>

      {/* Notification List */}
      {items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <BellIcon size={24} />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Hozircha hech qanday bildirishnoma yo'q
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Boshqa foydalanuvchilar postlaringizga like bossa yoki sizga obuna bo'lsa bildirishnomalar shu yerda ko'rinadi.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden shadow-xs">
          {items.map((item) => (
            <Link
              key={item.id}
              href={localePath(item.link || "/dashboard")}
              onClick={() => handleItemClick(item)}
              className={`flex items-start gap-3.5 p-4 text-xs transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                !item.isRead
                  ? "bg-indigo-50/40 dark:bg-indigo-950/20 font-medium"
                  : "opacity-90"
              }`}
            >
              <div className="relative shrink-0 mt-0.5">
                {item.actor ? (
                  <UserAvatar
                    name={item.actor.name}
                    avatarUrl={item.actor.avatarUrl}
                    size="md"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {renderIcon(item.type)}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-800">
                  {renderIcon(item.type)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-slate-900 dark:text-slate-100 text-sm leading-snug">
                  <span className="font-bold">{item.title}</span> — {item.message}
                </p>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 block font-normal">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>

              {!item.isRead && (
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 mt-2" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
