"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Dice5,
  X,
  Loader2,
  Bot,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-shell";
import { AdminHeader } from "@/components/admin/admin-header";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "@/components/ui/toast";

interface AdminUser {
  id: string;
  name: string;
  handle: string;
  email: string | null;
  phone: string | null;
  role: string;
  bio: string | null;
  avatarUrl: string | null;
  isBot: boolean;
  botPersona: string | null;
  createdAt: string;
  postsCount: number;
}

type UserFilter = "all" | "real" | "bots";

export default function AdminUsersPage() {
  const { openSidebar } = useAdmin();
  const { localePath, locale } = useI18n();

  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [counts, setCounts] = useState<{ total: number; real: number; bots: number }>({
    total: 0,
    real: 0,
    bots: 0,
  });
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [userSearch, setUserSearch] = useState("");
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isCreatingBot, setIsCreatingBot] = useState(false);

  // Edit Bot Profile State
  const [editingBot, setEditingBot] = useState<AdminUser | null>(null);
  const [editBotName, setEditBotName] = useState("");
  const [editBotHandle, setEditBotHandle] = useState("");
  const [editBotRole, setEditBotRole] = useState("");
  const [editBotBio, setEditBotBio] = useState("");
  const [editBotAvatarUrl, setEditBotAvatarUrl] = useState("");
  const [editBotPersona, setEditBotPersona] = useState("");
  const [isSavingBot, setIsSavingBot] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsUsersLoading(true);
      const params = new URLSearchParams();
      if (userFilter !== "all") params.set("filter", userFilter);
      if (userSearch) params.set("q", userSearch);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setUsersList(json.data.users);
        if (json.data.counts) {
          setCounts(json.data.counts);
        }
      }
    } catch {
      toast.error(
        locale === "uz"
          ? "Foydalanuvchilarni yuklashda xatolik yuz berdi"
          : "Ошибка при загрузке пользователей"
      );
    } finally {
      setIsUsersLoading(false);
    }
  }, [userFilter, userSearch, locale]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateBotProfile = async () => {
    try {
      setIsCreatingBot(true);
      const res = await fetch("/api/admin/bots/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_profile" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          locale === "uz"
            ? "Yangi bot profili muvaffaqiyatli yaratildi!"
            : "Новый профиль бота успешно создан!"
        );
        fetchUsers();
      } else {
        toast.error(json.error || "Xatolik yuz berdi");
      }
    } catch {
      toast.error("Server bilan aloqa uzildi");
    } finally {
      setIsCreatingBot(false);
    }
  };

  const handleOpenEditBot = (u: AdminUser) => {
    setEditingBot(u);
    setEditBotName(u.name);
    setEditBotHandle(u.handle);
    setEditBotRole(u.role);
    setEditBotBio(u.bio || "");
    setEditBotAvatarUrl(u.avatarUrl || "");
    setEditBotPersona(u.botPersona || "");
  };

  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    const collections = ["micah", "personas", "bottts", "avataaars"];
    const col = collections[Math.floor(Math.random() * collections.length)];
    setEditBotAvatarUrl(`https://api.dicebear.com/7.x/${col}/svg?seed=${seed}`);
  };

  const handleSaveBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBot) return;
    try {
      setIsSavingBot(true);
      const res = await fetch("/api/admin/bots/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_bot_profile",
          botId: editingBot.id,
          name: editBotName,
          handle: editBotHandle,
          role: editBotRole,
          bio: editBotBio,
          avatarUrl: editBotAvatarUrl,
          botPersona: editBotPersona,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          locale === "uz"
            ? "Bot profili muvaffaqiyatli yangilandi!"
            : "Профиль бота обновлен!"
        );
        setEditingBot(null);
        fetchUsers();
      } else {
        toast.error(json.error || "Saqlashda xatolik yuz berdi");
      }
    } catch {
      toast.error("Server bilan aloqa uzildi");
    } finally {
      setIsSavingBot(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Haqiqatan ham "${name}" profilini o'chirmoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(locale === "uz" ? "Profil o'chirildi" : "Профиль удален");
        fetchUsers();
      } else {
        toast.error(json.error || "O'chirishda xatolik");
      }
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  const pageTitle =
    locale === "uz"
      ? "Foydalanuvchilar va Botlar"
      : locale === "ru"
      ? "Пользователи и боты"
      : "Users & Bots";

  const pageSubtitle =
    locale === "uz"
      ? "Haqiqiy foydalanuvchilar hamda AI bot profillarini to'liq boshqarish"
      : locale === "ru"
      ? "Управление реальными пользователями и профилями ботов"
      : "Full management of real users and AI bot profiles";

  return (
    <>
      <AdminHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        onOpenSidebar={openSidebar}
        onRefresh={fetchUsers}
        isRefreshing={isUsersLoading}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Controls Bar: Filters + Search + Create Button */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-white/5">
            {[
              {
                id: "all",
                label: locale === "uz" ? "Barchasi" : "Все",
                count: counts.total,
              },
              {
                id: "real",
                label: locale === "uz" ? "Haqiqiy" : "Реальные",
                count: counts.real,
                icon: UserCheck,
              },
              {
                id: "bots",
                label: locale === "uz" ? "AI Botlar" : "AI Боты",
                count: counts.bots,
                icon: Bot,
              },
            ].map((f) => {
              const active = userFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setUserFilter(f.id as UserFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {f.icon && <f.icon className="h-3.5 w-3.5" />}
                  <span>{f.label}</span>
                  {f.count > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        active
                          ? "bg-blue-600/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 font-bold"
                          : "bg-slate-200/80 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Search & Create Bot button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={
                  locale === "uz"
                    ? "Ism yoki @username..."
                    : "Имя или @юзернейм..."
                }
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleCreateBotProfile}
              disabled={isCreatingBot}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isCreatingBot ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {locale === "uz" ? "Yangi Bot Yaratish" : "Создать бота"}
              </span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-zinc-900/60 text-slate-500 dark:text-zinc-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Foydalanuvchi</th>
                  <th className="py-3 px-4 font-semibold">Turi</th>
                  <th className="py-3 px-4 font-semibold">Kasbi / Rol</th>
                  <th className="py-3 px-4 font-semibold">Postlar soni</th>
                  <th className="py-3 px-4 font-semibold">Qo&apos;shilgan sana</th>
                  <th className="py-3 px-4 font-semibold text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {isUsersLoading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Yuklanmoqda...</span>
                      </div>
                    </td>
                  </tr>
                ) : usersList.length > 0 ? (
                  usersList.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            avatarUrl={u.avatarUrl}
                            name={u.name}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono truncate">
                              @{u.handle?.replace(/^@+/, "")}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type: Bot vs Real */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 font-medium text-[11px]">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              u.isBot ? "bg-blue-500" : "bg-emerald-500"
                            }`}
                          />
                          <span
                            className={
                              u.isBot
                                ? "text-blue-600 dark:text-blue-400 font-semibold"
                                : "text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {u.isBot ? "AI Bot" : "Haqiqiy"}
                          </span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4 text-slate-600 dark:text-zinc-300 max-w-xs truncate">
                        {u.role || "—"}
                      </td>

                      {/* Posts Count */}
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-zinc-200">
                        {u.postsCount}
                      </td>

                      {/* Creation Date */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.isBot && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditBot(u)}
                              className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:text-blue-600 hover:border-blue-500/50 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              title="Profilni tahrirlash"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <Link
                            href={localePath(`/dashboard/profile?handle=${encodeURIComponent(u.handle?.replace(/^@+/, ""))}`)}
                            target="_blank"
                            className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Profilni saytda ochish"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-900 transition-colors cursor-pointer"
                            title="O'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      Hech qanday foydalanuvchi topilmadi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Bot Profile Modal */}
        {editingBot && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          >
            <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden z-10 my-8">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Bot Profilini Tahrirlash
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ism, kasb, persona va avatarni yangilash
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBot(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBot} className="p-5 space-y-4">
                {/* Avatar Preview & Randomizer */}
                <div className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-white/5">
                  <UserAvatar avatarUrl={editBotAvatarUrl} name={editBotName} size="lg" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Profil rasmi (DiceBear Avatar)
                    </p>
                    <button
                      type="button"
                      onClick={handleRandomAvatar}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs"
                    >
                      <Dice5 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Tasodifiy yangi avatar</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      Ism Familiya
                    </label>
                    <input
                      type="text"
                      required
                      value={editBotName}
                      onChange={(e) => setEditBotName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      Username (@handle)
                    </label>
                    <input
                      type="text"
                      required
                      value={editBotHandle}
                      onChange={(e) => setEditBotHandle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Kasbi / Roli
                  </label>
                  <input
                    type="text"
                    required
                    value={editBotRole}
                    onChange={(e) => setEditBotRole(e.target.value)}
                    placeholder="masalan: Full-Stack Dasturchi"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Bio (Tarjimai hol)
                  </label>
                  <textarea
                    value={editBotBio}
                    onChange={(e) => setEditBotBio(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Botning Xarakteri / Yozish uslubi (Persona)
                  </label>
                  <textarea
                    value={editBotPersona}
                    onChange={(e) => setEditBotPersona(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none text-[11px]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingBot(null)}
                    disabled={isSavingBot}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBot}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingBot && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSavingBot ? "Saqlanmoqda..." : "Saqlash"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
