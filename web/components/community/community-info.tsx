"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Globe2,
  CalendarDays,
  Info,
  ChevronRight,
  Images,
  Play,
  FileText,
  Shield,
  Loader2,
  X,
  ImageIcon,
  Download,
  MoreVertical,
  ArrowRight,
  SquarePen,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type {
  CommunityMediaItem,
  CommunityMember,
  CommunityOverview,
} from "./types";
import { loadCommunityMedia, loadCommunityMembers } from "./use-community";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatMembers(count: number): string {
  return `${count.toLocaleString("uz-UZ")} a'zo`;
}

export function CommunityInfo({
  overview,
  onClose,
  className = "",
}: {
  overview: CommunityOverview;
  onClose?: () => void;
  className?: string;
}) {
  const { localePath } = useI18n();
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersHasMore, setMembersHasMore] = useState(false);
  const [membersCursor, setMembersCursor] = useState<string | null>(null);
  const [images, setImages] = useState<CommunityMediaItem[]>([]);
  const [files, setFiles] = useState<CommunityMediaItem[]>([]);
  const [galleryOpen, setGalleryOpen] = useState<null | "image" | "video" | "file">(null);
  const [galleryItems, setGalleryItems] = useState<CommunityMediaItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const loadMembers = useCallback(async (cursor?: string | null) => {
    setMembersLoading(true);
    try {
      const data = await loadCommunityMembers(cursor, 12);
      setMembers((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setMembersHasMore(data.hasMore);
      setMembersCursor(data.nextCursor);
    } catch {
      setMembersHasMore(false);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers(null);
    loadCommunityMedia("image", null, 6)
      .then((data) => setImages(data.items))
      .catch(() => setImages([]));
    loadCommunityMedia("file", null, 4)
      .then((data) => setFiles(data.items))
      .catch(() => setFiles([]));
  }, [loadMembers]);

  const openGallery = async (kind: "image" | "video" | "file") => {
    setGalleryOpen(kind);
    setGalleryLoading(true);
    try {
      const data = await loadCommunityMedia(kind, null, 40);
      setGalleryItems(data.items);
    } catch {
      setGalleryItems([]);
    } finally {
      setGalleryLoading(false);
    }
  };

  const createdLabel = new Intl.DateTimeFormat("uz-UZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(overview.community.createdAt));

  return (
    <aside
      className={`flex h-full w-full flex-col overflow-y-auto bg-[#f7f9f9] dark:bg-[#070a0f] px-3.5 py-3.5 [scrollbar-width:thin] ${className}`}
      aria-label="Guruh ma'lumoti"
    >
      {onClose && (
        <div className="mb-2 flex justify-end xl:hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-lg p-1.5 text-[#536471] dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#0f1419] dark:hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Community Hero Card (Aurora Emerald Banner) */}
      <section className="overflow-hidden rounded-2xl border border-[#cfd9de] dark:border-white/[0.08] bg-white dark:bg-[#0d1117]">
        <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-[#e6faf7] via-[#ccf5ef] to-[#f7f9f9] dark:from-[#041817] dark:via-[#0c3b36] dark:to-[#090d14] px-4">
          <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-[#2dd4bf]/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 right-0 h-28 w-28 rounded-full bg-[#14b8a6]/15 blur-2xl" />

          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            aria-label="Guruh haqida"
            title="Guruh haqida"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-[#cfd9de] dark:border-white/10 bg-white/80 dark:bg-black/40 text-[#536471] dark:text-zinc-300 backdrop-blur-sm transition-colors hover:border-[#0d9488] dark:hover:border-[#2dd4bf]/40 hover:text-[#0f1419] dark:hover:text-white cursor-pointer"
          >
            <SquarePen size={13} />
          </button>

          <div className="relative z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[#14b8a6]/30 bg-[#070b10] shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Geters logotipi" className="h-9 w-9 object-contain" />
          </div>
        </div>

        <div className="p-4">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-[#0f1419] dark:text-white">
            <span>{overview.community.name}</span>
            {overview.community.verified && <VerifiedBadge size={15} />}
          </h2>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#536471] dark:text-zinc-400">
            {overview.community.description}
          </p>

          <dl className="mt-3.5 grid grid-cols-3 gap-2 border-t border-[#cfd9de] dark:border-white/[0.06] pt-3 text-[10.5px]">
            <div className="flex items-start gap-1.5 text-[#0f1419] dark:text-zinc-300">
              <Users size={13} className="mt-0.5 shrink-0 text-[#536471] dark:text-zinc-500" />
              <dd className="leading-tight font-medium">
                {formatMembers(overview.memberCount)}
              </dd>
            </div>
            <div className="flex items-start gap-1.5 text-[#0f1419] dark:text-zinc-300">
              <Globe2 size={13} className="mt-0.5 shrink-0 text-[#536471] dark:text-zinc-500" />
              <dd className="leading-tight font-medium">
                {overview.community.isOfficial ? "Ommaviy guruh" : "Guruh"}
              </dd>
            </div>
            <div className="flex items-start gap-1.5 text-[#0f1419] dark:text-zinc-300">
              <CalendarDays size={13} className="mt-0.5 shrink-0 text-[#536471] dark:text-zinc-500" />
              <dd className="leading-tight font-medium">{createdLabel}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#cfd9de] dark:border-white/[0.08] bg-[#f7f9f9] dark:bg-white/[0.04] px-3 py-2 text-[12px] font-semibold text-[#0f1419] dark:text-zinc-200 transition-colors hover:border-[#0d9488] dark:hover:border-[#2dd4bf]/30 hover:bg-[#eff3f4] dark:hover:bg-white/[0.07] cursor-pointer"
          >
            <Info size={14} />
            Guruh haqida
          </button>
        </div>
      </section>

      {/* Media & Fayllar */}
      <section className="mt-3 rounded-2xl border border-[#cfd9de] dark:border-white/[0.08] bg-white dark:bg-[#0d1117] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#0f1419] dark:text-white">
            <Images size={14} className="text-[#536471] dark:text-zinc-400" />
            Media ({overview.mediaCounts.image + overview.mediaCounts.video})
          </h3>
          <button
            type="button"
            onClick={() => openGallery("image")}
            aria-label="Barcha medialarni ko'rish"
            className="rounded-md p-1 text-[#536471] dark:text-zinc-400 transition-colors hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#0f1419] dark:hover:text-white cursor-pointer"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {images.length === 0 ? (
          <p className="text-[11px] text-[#536471] dark:text-zinc-500">Hozircha rasm va videolar yo&apos;q.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {images.slice(0, 6).map((item) =>
              item.attachment.kind === "image" ? (
                <button
                  key={`${item.messageId}_${item.attachment.url}`}
                  type="button"
                  onClick={() => openGallery("image")}
                  className="overflow-hidden rounded-xl border border-[#cfd9de] dark:border-white/[0.06] cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.attachment.url}
                    alt={item.attachment.name}
                    loading="lazy"
                    className="h-16 w-full object-cover transition-transform hover:scale-105"
                  />
                </button>
              ) : (
                <button
                  key={`${item.messageId}_${item.attachment.url}`}
                  type="button"
                  onClick={() => openGallery("video")}
                  className="flex h-16 items-center justify-center rounded-xl border border-[#cfd9de] dark:border-white/[0.06] bg-[#f7f9f9] dark:bg-white/[0.04] text-[#536471] dark:text-zinc-400 hover:text-[#0f1419] dark:hover:text-white cursor-pointer"
                >
                  <Play size={16} />
                </button>
              )
            )}
          </div>
        )}

        <div className="mt-3.5 space-y-2 border-t border-[#cfd9de] dark:border-white/[0.06] pt-3">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0f1419] dark:text-zinc-200">
              <FileText size={13} className="text-[#536471] dark:text-zinc-400" />
              Fayllar ({overview.mediaCounts.file})
            </h4>
            {overview.mediaCounts.file > 0 && (
              <button
                type="button"
                onClick={() => openGallery("file")}
                className="text-[10.5px] font-semibold text-[#0d9488] dark:text-[#2dd4bf] hover:underline cursor-pointer"
              >
                Barchasi
              </button>
            )}
          </div>

          {files.length === 0 ? (
            <p className="text-[11px] text-[#536471] dark:text-zinc-500">Hozircha fayllar yo&apos;q.</p>
          ) : (
            files.slice(0, 4).map((item) => (
              <a
                key={`${item.messageId}_${item.attachment.url}`}
                href={item.attachment.url}
                target="_blank"
                rel="noreferrer"
                download={item.attachment.name}
                className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-[#f7f9f9] dark:hover:bg-white/[0.05]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e6faf7] dark:bg-[#0c272c] text-[#0d9488] dark:text-[#2dd4bf]">
                  <FileText size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-medium text-[#0f1419] dark:text-zinc-200">
                    {item.attachment.name}
                  </span>
                  <span className="block text-[10px] text-[#536471] dark:text-zinc-500">
                    {formatBytes(item.attachment.sizeBytes)}
                  </span>
                </span>
                <Download size={13} className="shrink-0 text-[#536471] dark:text-zinc-500" />
              </a>
            ))
          )}
        </div>
      </section>

      {/* Members */}
      <section className="mt-3 mb-2 rounded-2xl border border-[#cfd9de] dark:border-white/[0.08] bg-white dark:bg-[#0d1117] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#0f1419] dark:text-white">
            <Users size={14} className="text-[#536471] dark:text-zinc-400" />
            A&apos;zolar ({overview.memberCount.toLocaleString("uz-UZ")})
          </h3>
          {membersHasMore ? (
            <button
              type="button"
              onClick={() => loadMembers(membersCursor)}
              disabled={membersLoading}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0d9488] dark:text-[#2dd4bf] hover:underline disabled:opacity-50 cursor-pointer"
            >
              <span>Barchasi</span>
              <ArrowRight size={12} />
            </button>
          ) : (
            <span className="text-[10.5px] font-medium text-[#0d9488] dark:text-[#2dd4bf]">
              {overview.onlineCount} onlayn
            </span>
          )}
        </div>

        {membersLoading && members.length === 0 ? (
          <div className="flex items-center gap-2 py-2 text-[11px] text-[#536471] dark:text-zinc-500">
            <Loader2 size={13} className="animate-spin text-[#0d9488] dark:text-[#2dd4bf]" />
            Yuklanmoqda...
          </div>
        ) : members.length === 0 ? (
          <p className="text-[11px] text-[#536471] dark:text-zinc-500">A&apos;zolar topilmadi.</p>
        ) : (
          <ul className="space-y-1.5">
            {members.map((member) => (
              <li key={member.id}>
                <Link
                  href={localePath(`/dashboard/profile?user=${encodeURIComponent(member.handle)}`)}
                  className="group flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-[#f7f9f9] dark:hover:bg-white/[0.05]"
                >
                  <UserAvatar
                    name={member.name}
                    avatarUrl={member.avatarUrl}
                    size="sm"
                    isOnline={member.isOnline}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 truncate text-[12px] font-semibold text-[#0f1419] dark:text-zinc-100 group-hover:text-[#0d9488] dark:group-hover:text-[#2dd4bf] transition-colors">
                      <span className="truncate">{member.name}</span>
                      {member.verified && <VerifiedBadge size={12} />}
                    </span>
                    <span className="block truncate text-[10.5px] text-[#536471] dark:text-zinc-500">
                      @{member.handle.replace(/^@+/, "")}
                    </span>
                  </span>
                  <MoreVertical size={14} className="shrink-0 text-[#8b98a5] dark:text-zinc-600 group-hover:text-[#0f1419] dark:group-hover:text-zinc-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Rules */}
      <section className="mt-3 mb-2 rounded-2xl border border-[#cfd9de] dark:border-white/[0.08] bg-white dark:bg-[#0d1117] p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-[#0f1419] dark:text-white">
          <Shield size={14} className="text-[#536471] dark:text-zinc-400" />
          Guruh qoidalari
        </h3>
        <ol className="space-y-2">
          {overview.rules.map((rule, index) => (
            <li key={rule} className="flex gap-2 text-[11.5px] leading-snug text-zinc-300">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[9.5px] font-bold text-zinc-400">
                {index + 1}
              </span>
              {rule}
            </li>
          ))}
        </ol>
      </section>

      {aboutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Guruh haqida"
          onClick={() => setAboutOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12161f] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-[14px] font-bold text-white">Guruh haqida</h3>
              <button
                type="button"
                onClick={() => setAboutOpen(false)}
                aria-label="Yopish"
                className="rounded-md p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-zinc-300">
              {overview.community.description}
            </p>
            <p className="mt-3 text-[11.5px] text-zinc-500">
              {formatMembers(overview.memberCount)} · Ommaviy guruh · {createdLabel} da yaratilgan
            </p>
            <h4 className="mt-4 text-[12px] font-semibold text-white">Qoidalar</h4>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11.5px] text-zinc-300">
              {overview.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Media galereyasi"
          onClick={() => setGalleryOpen(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#12161f] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-[14px] font-bold text-white">
                {galleryOpen === "file" ? <FileText size={15} /> : <ImageIcon size={15} />}
                {galleryOpen === "file" ? "Fayllar" : "Media"}
              </h3>
              <button
                type="button"
                onClick={() => setGalleryOpen(null)}
                aria-label="Yopish"
                className="rounded-md p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {galleryLoading ? (
              <div className="flex items-center gap-2 py-6 text-[12px] text-zinc-400">
                <Loader2 size={14} className="animate-spin" />
                Yuklanmoqda...
              </div>
            ) : galleryItems.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-zinc-500">Hozircha bo'sh.</p>
            ) : galleryOpen === "image" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {galleryItems.map((item) => (
                  <a
                    key={`${item.messageId}_${item.attachment.url}`}
                    href={item.attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl border border-white/[0.06]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.attachment.url}
                      alt={item.attachment.name}
                      loading="lazy"
                      className="h-32 w-full object-cover transition-transform hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {galleryItems.map((item) => (
                  <li key={`${item.messageId}_${item.attachment.url}`}>
                    <a
                      href={item.attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      download={item.attachment.name}
                      className="flex items-center gap-2 rounded-xl border border-white/[0.06] px-3 py-2 hover:bg-white/[0.04]"
                    >
                      <FileText size={15} className="shrink-0 text-zinc-400" />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-200">
                        {item.attachment.name}
                      </span>
                      <span className="text-[10.5px] text-zinc-500">
                        {formatBytes(item.attachment.sizeBytes)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
