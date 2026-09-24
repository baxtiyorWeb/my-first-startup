"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, ArrowRight, Sparkles, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import type { Post } from "@/types/social";
import { useI18n } from "@/lib/i18n/context";

export default function ExplorePage() {
  const { t, localePath } = useI18n();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.posts
      .getFeed({ limit: 10 })
      .then((data) => {
        if (isMounted) {
          setPosts(data.posts);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPosts([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Extract unique authors from posts
  const authors = React.useMemo(() => {
    const authorMap = new Map<string, Post["author"]>();
    for (const post of posts) {
      if (!authorMap.has(post.author.handle)) {
        authorMap.set(post.author.handle, post.author);
      }
    }
    return Array.from(authorMap.values());
  }, [posts]);

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Header Banner */}
      <div className="p-5 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{t("explore.badge")}</span>
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-950 dark:text-white tracking-tight">
          {t("explore.title")}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
          {t("explore.subtitle")}
        </p>
      </div>

      {/* Featured Authors */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {t("explore.activeAuthors")}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              />
            ))}
          </div>
        ) : authors.length === 0 ? (
          <div className="py-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-500">
            {t("explore.authorsBuilding")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {authors.map((author) => (
              <Link
                key={author.handle}
                href={localePath(`/dashboard/profile?user=${encodeURIComponent(author.handle)}`)}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm flex items-center justify-center shrink-0">
                    {author.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:underline">
                        {author.name}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        {author.handle}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {author.role}
                    </p>
                    {author.intent && author.intent !== "none" && (
                      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 mt-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                        {author.intent === "looking_for_cofounder" && t("intents.badge_cofounder")}
                        {author.intent === "open_to_work" && t("intents.badge_open_to_work")}
                        {author.intent === "raising_funds" && t("intents.badge_raising")}
                        {author.intent === "open_to_advisory" && t("intents.badge_advisory")}
                      </span>
                    )}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Featured Perspectives */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {t("explore.featuredPerspectives")}
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-500">
            {t("explore.perspectivesEmpty")}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={localePath(`/dashboard?post=${item.id}`)}
                className="block p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.author.name}
                    </span>
                    {item.postType === "project" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {t("project.badge")}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] shrink-0">
                    {item.commentsCount} {t("explore.perspectivesComments")}
                  </span>
                </div>
                {item.title && (
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white group-hover:underline mb-1">
                    {item.title}
                  </h3>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {item.content}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
