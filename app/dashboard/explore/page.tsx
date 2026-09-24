"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, ArrowRight, Sparkles, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import type { Post } from "@/types/social";

export default function ExplorePage() {
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
          <span>Hamjamiyat va Mualliflar</span>
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-950 dark:text-white tracking-tight">
          O‘zbekiston intellektual maydonini kashf qiling
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
          Tajribali mutaxassislar profillarini ko‘ring, chuqur tahlillarni o‘qing va mazmunli munozaralarda qatnashing.
        </p>
      </div>

      {/* Featured Authors */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Faol fikr egalari
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
            Hozircha mualliflar ro‘yxati shakllanmoqda.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {authors.map((author) => (
              <Link
                key={author.handle}
                href={`/dashboard/profile?user=${encodeURIComponent(author.handle)}`}
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
            E’tiborga molik tahlillar
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
            Hozircha tahliliy fikrlar mavjud emas.
          </div>
        ) : (
          <div className="space-y-3">
            {posts.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/dashboard?post=${item.id}`}
                className="block p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.author.name} ({item.author.handle})
                  </span>
                  <span className="text-[11px]">
                    {item.commentsCount} ta fikr-mulohaza
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
