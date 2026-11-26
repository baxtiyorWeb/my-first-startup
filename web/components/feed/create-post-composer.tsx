"use client";

import React, { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PenSquare,
  FileText,
  Newspaper,
  Image as ImageIcon,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { Post } from "@/types/social";

interface CreatePostComposerProps {
  onPostCreated?: (post: Post) => void;
}

export function CreatePostComposer({ onPostCreated }: CreatePostComposerProps) {
  const router = useRouter();
  const { session } = useAuth();
  const { t, localePath } = useI18n();

  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const authorInitials = useMemo(() => {
    const name = session.user?.name || "B";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [session.user?.name]);

  const handleInputClick = () => {
    if (!session.isAuthenticated) {
      toast.info(t("auth.loginRequired") || "Post yaratish uchun tizimga kiring");
      router.push(localePath("/auth/login?redirect=/dashboard"));
      return;
    }
    setIsExpanded(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleStudioNavigate = (kind: "article" | "video" | "news") => {
    const target = `/dashboard/create?kind=${kind}`;
    if (!session.isAuthenticated) {
      toast.info(t("auth.loginRequired") || "Kontent yaratish uchun tizimga kiring");
      router.push(localePath(`/auth/login?redirect=${encodeURIComponent(target)}`));
      return;
    }
    router.push(localePath(target));
  };

  const handleImageButtonClick = () => {
    if (!session.isAuthenticated) {
      toast.info(t("auth.loginRequired") || "Rasm yuklash uchun tizimga kiring");
      router.push(localePath("/auth/login?redirect=/dashboard"));
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 3 - mediaUrls.length;
    if (remainingSlots <= 0) {
      toast.error("Ko‘pi bilan 3 tagacha rasm biriktirish mumkin");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    setIsExpanded(true);

    try {
      let uploadedCount = 0;
      const limit = Math.min(files.length, remainingSlots);
      if (files.length > remainingSlots) {
        toast.info("Ko‘pi bilan 3 tagacha rasm yuklanadi");
      }
      for (let i = 0; i < limit; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Fayl hajmi 10MB dan oshmasligi kerak");
          continue;
        }
        const result = await api.upload.uploadFile(file);
        setMediaUrls((prev) => [...prev, result.url].slice(0, 3));
        uploadedCount += 1;
      }
      if (uploadedCount > 0) {
        toast.success("Rasm yuklandi");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tasvirni yuklashda xatolik yuz berdi");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = content.trim();
    if (!trimmed && mediaUrls.length === 0) {
      toast.error("Iltimos, post matnini kiriting yoki rasm biriktiring");
      return;
    }
    if (mediaUrls.length === 0 && trimmed.length < 5) {
      toast.error("Post matni kamida 5 ta belgidan iborat bo‘lishi kerak");
      return;
    }

    if (!session.isAuthenticated) {
      toast.info("Post yaratish uchun tizimga kiring");
      return;
    }

    setIsSubmitting(true);
    try {
      const newPost = await api.posts.createPost({
        content: trimmed,
        postType: "thought",
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      });

      toast.success("Postingiz muvaffaqiyatli ulashildi!");
      setContent("");
      setMediaUrls([]);
      setIsExpanded(false);
      onPostCreated?.(newPost);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Post yaratishda xatolik yuz berdi";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-node-id="11:5"
      data-name="Post yaratish"
      className="w-full bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] rounded-[16px] p-3.5 sm:p-4 mb-3.5 shadow-xs transition-all duration-200"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Row: User Avatar + Input Area */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {session.user?.avatarUrl ? (
            <UserAvatar
              name={session.user.name || "Foydalanuvchi"}
              avatarUrl={session.user.avatarUrl}
              size="md"
              className="size-[42px] sm:size-[46px] rounded-full border border-slate-200 dark:border-[#2f3336]"
            />
          ) : (
            <div className="size-[42px] sm:size-[46px] rounded-full flex items-center justify-center bg-gradient-to-b from-slate-700 to-slate-900 dark:from-[#2f3336] dark:to-[#16181c] text-white border border-slate-300 dark:border-[#3e4144] shadow-xs">
              <span className="font-semibold text-[15px] sm:text-[16px]">
                {authorInitials}
              </span>
            </div>
          )}
        </div>

        {/* Input/Textarea Container */}
        <div className="flex-1 min-w-0">
          {!isExpanded ? (
            <div
              onClick={handleInputClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleInputClick();
                }
              }}
              className="w-full h-[46px] sm:h-[50px] bg-slate-50 dark:bg-[#16181c] border border-slate-200 dark:border-[#2f3336] rounded-[14px] px-4 flex items-center cursor-pointer hover:border-slate-300 dark:hover:border-[#3e4144] transition-colors group"
            >
              <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-[#cfd9de] group-hover:text-slate-700 dark:group-hover:text-slate-200 truncate select-none">
                Nima haqida ulashmoqchisiz?
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#16181c] border border-slate-200 dark:border-[#2f3336] rounded-[14px] p-3 transition-all">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nima haqida ulashmoqchisiz? (fikrlar, yangiliklar, g'oyalar...)"
                rows={3}
                className="w-full bg-transparent text-[13.5px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-[#71767b] resize-none focus:outline-none"
              />

              {/* Uploaded Media Thumbnails */}
              {mediaUrls.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-slate-200/80 dark:border-[#2f3336]">
                  {mediaUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative size-16 rounded-[10px] overflow-hidden border border-slate-200 dark:border-[#2f3336] group/thumb"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Biriktirilgan tasvir"
                        className="size-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(idx)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 hover:bg-black text-white cursor-pointer transition-colors"
                        aria-label="O'chirish"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Uploading indicator */}
              {isUploading && (
                <div className="flex items-center gap-2 mt-2 text-xs text-blue-500">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Tasvir yuklanmoqda...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Format Option Buttons + Primary Submit */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#2f3336] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none shrink min-w-0 py-0.5">
          {/* Post option */}
          <button
            type="button"
            onClick={handleInputClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-slate-600 dark:text-[#e7e9ea] hover:bg-slate-100 dark:hover:bg-[#16181c] transition-colors cursor-pointer text-[12px] font-medium shrink-0"
          >
            <PenSquare size={16} className="text-slate-500 dark:text-[#8b98a5]" />
            <span>Post</span>
          </button>

          {/* Maqola option */}
          <button
            type="button"
            onClick={() => handleStudioNavigate("article")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-slate-600 dark:text-[#e7e9ea] hover:bg-slate-100 dark:hover:bg-[#16181c] transition-colors cursor-pointer text-[12px] font-medium shrink-0"
          >
            <FileText size={16} className="text-[#1d9bf0]" />
            <span>Maqola</span>
          </button>

          {/* Yangilik option */}
          <button
            type="button"
            onClick={() => handleStudioNavigate("news")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-slate-600 dark:text-[#e7e9ea] hover:bg-slate-100 dark:hover:bg-[#16181c] transition-colors cursor-pointer text-[12px] font-medium shrink-0"
          >
            <Newspaper size={16} className="text-amber-500" />
            <span>Yangilik</span>
          </button>

          {/* Rasm option */}
          <button
            type="button"
            onClick={handleImageButtonClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-slate-600 dark:text-[#e7e9ea] hover:bg-slate-100 dark:hover:bg-[#16181c] transition-colors cursor-pointer text-[12px] font-medium shrink-0"
          >
            <ImageIcon size={16} className="text-slate-500 dark:text-[#8b98a5]" />
            <span>Rasm</span>
          </button>
        </div>

        {/* Action Buttons: Cancel (when expanded) & Primary Submit */}
        <div className="flex items-center gap-2 shrink-0">
          {isExpanded && (
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setContent("");
                setMediaUrls([]);
              }}
              className="px-3 py-1.5 rounded-[11px] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
          )}

          <button
            type="button"
            disabled={isSubmitting || isUploading || (isExpanded && !content.trim() && mediaUrls.length === 0)}
            onClick={() => {
              if (!isExpanded) {
                handleInputClick();
              } else {
                handleSubmit();
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-50 text-white font-semibold text-[13px] h-[36px] px-4 rounded-[11px] transition-all cursor-pointer shadow-xs active:scale-98"
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            <span>{isExpanded ? "Ulashish" : "Yaratish"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
