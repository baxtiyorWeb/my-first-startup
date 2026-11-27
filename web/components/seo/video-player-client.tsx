"use client";

import React, { useState, useRef } from "react";
import { Play, Clock } from "lucide-react";
import type { VideoChapter } from "@/server/db/schema";

interface VideoPlayerClientProps {
  title: string;
  videoUrl: string | null;
  youtubeVideoId: string | null;
  bunnyVideoId: string | null;
  thumbnailUrl: string | null;
  chapters: VideoChapter[];
}

export function VideoPlayerClient({
  title,
  videoUrl,
  youtubeVideoId,
  bunnyVideoId,
  thumbnailUrl,
  chapters,
}: VideoPlayerClientProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [seekSeconds, setSeekSeconds] = useState<number>(0);
  const [activeChapterIdx, setActiveChapterIdx] = useState<number>(0);

  const handleSeek = (seconds: number, idx: number) => {
    setActiveChapterIdx(idx);
    setSeekSeconds(seconds);
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => null);
    }
  };

  const isBunnyIframe = Boolean(
    bunnyVideoId || (videoUrl && videoUrl.includes("mediadelivery.net/embed"))
  );

  const renderPlayer = () => {
    if (youtubeVideoId) {
      const startParam = seekSeconds > 0 ? `&start=${seekSeconds}&autoplay=1` : "";
      return (
        <iframe
          key={`yt-${youtubeVideoId}-${seekSeconds}`}
          src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?rel=0${startParam}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      );
    }

    if (isBunnyIframe && videoUrl) {
      const sep = videoUrl.includes("?") ? "&" : "?";
      const timeParam = seekSeconds > 0 ? `${sep}t=${seekSeconds}&autoplay=true` : "";
      return (
        <iframe
          key={`bunny-${seekSeconds}`}
          src={`${videoUrl}${timeParam}`}
          title={title}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      );
    }

    if (videoUrl) {
      return (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl || undefined}
          controls
          preload="metadata"
          className="w-full h-full bg-black"
        />
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-[#000000] text-slate-400 text-sm">
        Video manbasi biriktirilmagan
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-video w-full rounded-[16px] overflow-hidden bg-black border border-slate-200/80 dark:border-[#2f3336] shadow-lg">
        {renderPlayer()}
      </div>

      {/* Interactive Video Key Moments (Chapters) */}
      {chapters.length > 0 && (
        <div className="rounded-[16px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            <Clock className="w-4 h-4 text-[#2dd4bf]" />
            <span>Video bo‘limlari (Key Moments)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {chapters.map((ch, idx) => (
              <button
                key={`${ch.seconds}-${idx}`}
                type="button"
                onClick={() => handleSeek(ch.seconds, idx)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeChapterIdx === idx
                    ? "bg-blue-50 dark:bg-[#0c272c] border-[#2dd4bf]/50 text-blue-700 dark:text-[#2dd4bf]"
                    : "bg-slate-50 dark:bg-[#16181c] border-slate-200/70 dark:border-[#2f3336] text-slate-700 dark:text-slate-300 hover:border-[#2dd4bf]/40"
                }`}
              >
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2dd4bf]/15 text-[#2dd4bf] font-mono text-xs font-bold shrink-0">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  {ch.time}
                </span>
                <span className="text-xs font-semibold truncate">{ch.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
