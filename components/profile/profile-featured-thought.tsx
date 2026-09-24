"use client";

import React from "react";
import Link from "next/link";
import { MessageIcon, HeartIcon } from "@/components/icons";
import { Eye } from "lucide-react";
import type { Post } from "@/types/social";
import { RichContent } from "@/components/feed/rich-content";
import { useI18n } from "@/lib/i18n/context";

interface ProfileFeaturedThoughtProps {
  post: Post;
}

export function ProfileFeaturedThought({
  post,
}: ProfileFeaturedThoughtProps) {
  const { t, localePath, formatRelativeTime } = useI18n();

  return (
    <Link
      href={localePath(`/dashboard/posts/${post.id}`)}
      className="block group focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-xl"
    >
      <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-linear-to-b from-slate-50/80 to-white dark:from-slate-800/30 dark:to-slate-900 p-4 sm:p-5 transition-all group-hover:border-slate-300 dark:group-hover:border-slate-700 shadow-xs cursor-pointer">
        {/* Editorial Marker */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
            <span className="text-sm">📌</span>
            <span className="tracking-tight">{t("profile.featuredThought") || "Muallifning tanlangan qarashi"}</span>
          </div>
        </div>

        {/* Title (if present) */}
        {post.title && (
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug group-hover:underline">
            {post.title}
          </h3>
        )}

        {/* Thought Content */}
        <div className="mt-1.5 line-clamp-3">
          <RichContent
            content={post.content}
            className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300"
          />
        </div>

        {/* Discussion Footer */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
              <MessageIcon size={14} />
              <span className="tabular-nums">{post.commentsCount}</span>
              <span className="hidden sm:inline text-[11px] text-slate-400">
                {t("post.comment")}
              </span>
            </span>

            <span className="flex items-center gap-1 text-[11px]">
              <HeartIcon size={13} />
              <span className="tabular-nums">{post.likesCount}</span>
            </span>

            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Eye size={14} className="stroke-[1.75]" />
              <span className="tabular-nums">{post.viewsCount ?? 0}</span>
              <span className="hidden sm:inline text-[11px]">{t("common.views")}</span>
            </span>
          </div>

          <time className="text-[11px] text-slate-400">
            {formatRelativeTime(post.createdAt)}
          </time>
        </div>
      </div>
    </Link>
  );
}
