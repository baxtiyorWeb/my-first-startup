"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HeartIcon } from "@/components/icons";
import type { DiscussionReply } from "@/types/social";

interface ProfileDiscussionReplyCardProps {
  reply: DiscussionReply;
}

export function ProfileDiscussionReplyCard({
  reply,
}: ProfileDiscussionReplyCardProps) {
  const [isLiked, setIsLiked] = useState(reply.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(reply.likesCount);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
  };

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 transition-colors hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs">
      {/* 1. Parent Discussion Context Header */}
      <div className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-0.5">
            Muhokamada bildirilgan javob:
          </span>
          <Link
            href={`/dashboard?post=${reply.parentPostId}`}
            className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-slate-100 hover:underline line-clamp-1"
          >
            «{reply.parentPostTitle}»
          </Link>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Asoschisi: {reply.parentAuthorName} ({reply.parentAuthorHandle})
          </span>
        </div>
      </div>

      {/* 2. Author's Thoughtful Reply Body */}
      <div className="mt-3">
        <p className="text-xs sm:text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line font-normal">
          {reply.replyContent}
        </p>
      </div>

      {/* 3. Footer: Agreement metrics & Time */}
      <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={handleLike}
          aria-pressed={isLiked}
          className={`flex items-center gap-1.5 font-medium cursor-pointer transition-colors px-1 py-0.5 rounded ${
            isLiked
              ? "text-slate-950 dark:text-slate-100 font-semibold"
              : "hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <HeartIcon
            size={13}
            className={isLiked ? "fill-current stroke-current" : ""}
          />
          <span className="tabular-nums">{likesCount} ta qo‘llab-quvvatlash</span>
        </button>

        <time className="text-slate-400">{reply.createdAt}</time>
      </div>
    </article>
  );
}
