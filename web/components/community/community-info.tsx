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
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";
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
    month: "long",
    year: "numeric",
  }).format(new Date(overview.community.createdAt));

  return (
    <aside
      className={`flex h-full w-full flex-col overflow-y-auto bg-[#0b0e14] px-4 py-4 [scrollbar-width:thin] ${className}`}
      aria-label="Guruh ma'lumoti"
    >
      {onClose && (
        <div className="mb-2 flex justify-end xl:hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Community card */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#12161f] p-4">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-teal-500/25 bg-[#0b0e14]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Geters logotipi" className="h-11 w-11 object-contain" />
          </div>
          <h2 className="mt-3 flex items-center gap-1.5 text-[15px] font-bold text-white">
            {overview.community.name}
            {overview.community.verified && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-400 text-[9px] font-black text-slate-950">
                ✓
              </span>
            )}
          </h2>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-zinc-400">
            {overview.community.description}
          </p>
        </div>

        <dl className="mt-4 space-y-2 border-t border-white/[0.06] pt-3 text-[11.5px]">
          <div className="flex items-center gap-2 text-zinc-300">
            <Users size={14} className="text-zinc-500" />
            <dd>{formatMembers(overview.memberCount)}</dd>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <Globe2 size={14} className="text-zinc-500" />
            <dd>{overview.community.isOfficial ? "Ommaviy guruh" : "Guruh"}</dd>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <CalendarDays size={14} className="text-zinc-500" />
            <dd>{createdLabel} da yaratilgan</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] font-semibold text-zinc-200 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <Info size={14} />
          Guruh haqida
        </button>
      </section>

      {/* Media */}
      <section className="mt-3 rounded-2xl border border-white/[0.07] bg-[#12161f] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold text-white">
            <Images size={14} className="text-zinc-400" />
            Media ({overview.mediaCounts.image + overview.mediaCounts.video})
          </h3>
          <button
            type="button"
            onClick={() => openGallery("image")}
            aria-label="Barcha medialarni ko'rish"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {images.length === 0 ? (
          <p className="text-[11px] text-zinc-500">Hozircha rasm va videolar yo'q.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {images.slice(0, 6).map((item) =>
              item.attachment.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${item.messageId}_${item.attachment.url}`}
                  src={item.attachment.url}
                  alt={item.attachment.name}
                  loading="lazy"
                  className="h-16 w-full rounded-lg border border-white/[0.05] object-cover"
                />
              ) : (
                <div
                  key={`${item.messageId}_${item.attachment.url}`}
                  className="flex h-16 items-center justify-center rounded-lg border border-white/[0.05] bg-white/[0.04] text-zinc-400"
                >
                  <Play size={16} />
                </div>
              )
            )}
          </div>
        )}

        <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11.5px] font-semibold text-zinc-300">
              Fayllar ({overview.mediaCounts.file})
            </h4>
            <button
              type="button"
              onClick={() => openGallery("file")}
              className="text-[10.5px] font-semibold text-teal-300 hover:text-teal-200"
            >
              Barchasi
            </button>
          </div>

          {files.length === 0 ? (
            <p className="text-[11px] text-zinc-500">Hozircha fayllar yo'q.</p>
          ) : (
            files.slice(0, 4).map((item) => (
              <a
                key={`${item.messageId}_${item.attachment.url}`}
                href={item.attachment.url}
                target="_blank"
                rel="noreferrer"
                download={item.attachment.name}
                className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-white/[0.05]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                  <FileText size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-medium text-zinc-200">
                    {item.attachment.name}
                  </span>
                  <span className="block text-[10px] text-zinc-500">
                    {formatBytes(item.attachment.sizeBytes)}
                  </span>
                </span>
                <Download size={13} className="shrink-0 text-zinc-500" />
              </a>
            ))
          )}
        </div>
      </section>

      {/* Members */}
      <section className="mt-3 rounded-2xl border border-white/[0.07] bg-[#12161f] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold text-white">
            <Users size={14} className="text-zinc-400" />
            A'zolar
          </h3>
          <span className="text-[10.5px] text-teal-300">
            {overview.onlineCount} onlayn
          </span>
        </div>

        {membersLoading && members.length === 0 ? (
          <div className="flex items-center gap-2 py-2 text-[11px] text-zinc-500">
            <Loader2 size={13} className="animate-spin" />
            Yuklanmoqda...
          </div>
        ) : members.length === 0 ? (
          <p className="text-[11px] text-zinc-500">A'zolar topilmadi.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((member) => (
              <li key={member.id}>
                <Link
                  href={localePath(`/dashboard/profile?user=${encodeURIComponent(member.handle)}`)}
                  className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-white/[0.05]"
                >
                  <span className="relative shrink-0">
                    <UserAvatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
                    {member.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#12161f] bg-emerald-500" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-semibold text-zinc-200">
                      {member.name}
                    </span>
                    <span className="block truncate text-[10px] text-zinc-500">
                      @{member.handle.replace(/^@+/, "")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {membersHasMore && (
          <button
            type="button"
            onClick={() => loadMembers(membersCursor)}
            disabled={membersLoading}
            className="mt-2 w-full rounded-lg border border-white/[0.08] py-1.5 text-[11px] font-semibold text-zinc-300 transition-colors hover:bg-white/[0.05] disabled:opacity-50"
          >
            {membersLoading ? "Yuklanmoqda..." : "Yana ko'rsatish"}
          </button>
        )}
      </section>

      {/* Rules */}
      <section className="mt-3 mb-2 rounded-2xl border border-white/[0.07] bg-[#12161f] p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-white">
          <Shield size={14} className="text-zinc-400" />
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
