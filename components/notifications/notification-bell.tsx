"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { BellIcon } from "@/components/icons";
import { Check, Heart, MessageSquare, UserPlus, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { NotificationItem } from "@/lib/api/notifications";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";

export function NotificationBell() {
  const { session } = useAuth();
  const { localePath } = useI18n();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!session.isAuthenticated) return;
    try {
      const count = await api.notifications.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error("[NOTIFICATIONS] Error fetching unread count:", err);
    }
  }, [session.isAuthenticated]);

  const loadNotifications = useCallback(async () => {
    if (!session.isAuthenticated) return;
    setIsLoading(true);
    try {
      const res = await api.notifications.getNotifications({ limit: 15 });
      setItems(Array.isArray(res.items) ? res.items : []);
      setUnreadCount(typeof res.unreadCount === "number" ? res.unreadCount : 0);
    } catch (err) {
      console.error("[NOTIFICATIONS] Error fetching notifications:", err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [session.isAuthenticated]);

  useEffect(() => {
    if (!session.isAuthenticated) return;
    fetchUnreadCount();
    // Poll unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [session.isAuthenticated, fetchUnreadCount]);

  // Fetch items when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
    setIsOpen(false);
  };

  if (!session.isAuthenticated) return null;

  const renderIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "like":
        return <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />;
      case "comment":
      case "reply":
        return <MessageSquare className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500/20" />;
      case "follow":
        return <UserPlus className="w-3.5 h-3.5 text-emerald-500" />;
      case "new_post":
        return <FileText className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <BellIcon size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-1.5 sm:p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 active:scale-95 cursor-pointer focus-visible:outline-none transition-all shrink-0"
        aria-label="Bildirishnomalar"
        aria-expanded={isOpen}
      >
        <BellIcon size={20} className="text-slate-800 dark:text-slate-100 stroke-slate-800 dark:stroke-slate-100" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-extrabold text-white shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bildirishnomalar
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  {unreadCount} ta yangi
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>O‘qilgan deb belgilash</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
            {isLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Yuklanmoqda...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center px-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Hozircha bildirishnomalar yo‘q
                </p>
              </div>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={localePath(item.link || "/dashboard")}
                  onClick={() => handleItemClick(item)}
                  className={`flex items-start gap-3 p-3 text-xs transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !item.isRead
                      ? "bg-indigo-50/40 dark:bg-indigo-950/20 font-medium"
                      : "opacity-85"
                  }`}
                >
                  <div className="relative shrink-0 mt-0.5">
                    {item.actor ? (
                      <UserAvatar
                        name={item.actor.name}
                        avatarUrl={item.actor.avatarUrl}
                        size="sm"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {renderIcon(item.type)}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-800">
                      {renderIcon(item.type)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 dark:text-slate-100 text-xs leading-snug line-clamp-2">
                      <span className="font-semibold">{item.title}</span> — {item.message}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-2" />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
