"use client";

import React, { useState, useEffect } from "react";
import { Video, Plus, Trash2, Clock, Film, Link2, FileText } from "lucide-react";
import type { VideoChapterItem } from "@/types/social";
import { parseTimeToSeconds, formatSecondsToTime, extractYouTubeVideoId } from "@/lib/seo/slugify";

interface LibraryMediaVideo {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
}

interface VideoTutorialBoxProps {
  videoUrl: string;
  onVideoUrlChange: (val: string) => void;
  durationSeconds: number | null;
  onDurationSecondsChange: (secs: number | null) => void;
  chapters: VideoChapterItem[];
  onChaptersChange: (chapters: VideoChapterItem[]) => void;
  transcript: string;
  onTranscriptChange: (val: string) => void;
}

export function VideoTutorialBox({
  videoUrl,
  onVideoUrlChange,
  durationSeconds,
  onDurationSecondsChange,
  chapters,
  onChaptersChange,
  transcript,
  onTranscriptChange,
}: VideoTutorialBoxProps) {
  const [libraryVideos, setLibraryVideos] = useState<LibraryMediaVideo[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  const [newChapTime, setNewChapTime] = useState("00:00");
  const [newChapTitle, setNewChapTitle] = useState("");
  const [durationStr, setDurationStr] = useState(
    durationSeconds ? formatSecondsToTime(durationSeconds) : ""
  );

  useEffect(() => {
    if (durationSeconds && !durationStr) {
      setDurationStr(formatSecondsToTime(durationSeconds));
    }
  }, [durationSeconds, durationStr]);

  useEffect(() => {
    fetch("/api/studio/media?type=video")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setLibraryVideos(res.data);
        }
      })
      .catch(() => null);
  }, []);

  const handleAddChapter = () => {
    const cleanTitle = newChapTitle.trim();
    if (!cleanTitle) return;
    const secs = parseTimeToSeconds(newChapTime);
    const updated = [
      ...chapters,
      { time: formatSecondsToTime(secs), seconds: secs, title: cleanTitle },
    ].sort((a, b) => a.seconds - b.seconds);
    onChaptersChange(updated);
    setNewChapTime("");
    setNewChapTitle("");
  };

  const ytPreviewId = extractYouTubeVideoId(videoUrl);

  return (
    <div className="rounded-[16px] bg-white dark:bg-[#101117] border border-emerald-500/30 dark:border-emerald-500/25 p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <Video className="w-4 h-4" />
          <span>Video Darslik &amp; VideoObject SEO Sozlamalari</span>
        </div>

        {libraryVideos.length > 0 && (
          <button
            type="button"
            onClick={() => setShowLibrary((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Media kutubxonadan tanlash ({libraryVideos.length})</span>
          </button>
        )}
      </div>

      {/* Optional Bunny / Media Picker Drawer */}
      {showLibrary && libraryVideos.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] space-y-2 max-h-48 overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Serverga yuklangan videolar:
          </div>
          {libraryVideos.map((vid) => (
            <button
              key={vid.id}
              type="button"
              onClick={() => {
                onVideoUrlChange(vid.url);
                if (vid.durationSeconds) {
                  onDurationSecondsChange(vid.durationSeconds);
                  setDurationStr(formatSecondsToTime(vid.durationSeconds));
                }
                setShowLibrary(false);
              }}
              className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-[#1a1c26] border border-transparent hover:border-[#3995ff]/40 text-left transition-all cursor-pointer"
            >
              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {vid.title}
              </span>
              <span className="text-[10px] font-mono text-[#3995ff] shrink-0">
                Tanlash
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Video URL + Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
            <Link2 className="w-3 h-3 text-[#3995ff]" />
            <span>YouTube, Bunny Stream yoki MP4 URL *</span>
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... yoki https://iframe.mediadelivery.net/embed/..."
            className="w-full rounded-xl bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
          />
          {ytPreviewId && (
            <p className="text-[10px] text-emerald-500 mt-1 font-medium">
              YouTube video aniqlandi (ID: {ytPreviewId}) — muqova avtomatik olinadi.
            </p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
            <Clock className="w-3 h-3 text-[#3995ff]" />
            <span>Davomiyligi (MM:SS)</span>
          </label>
          <input
            type="text"
            value={durationStr}
            onChange={(e) => {
              setDurationStr(e.target.value);
              const secs = parseTimeToSeconds(e.target.value);
              onDurationSecondsChange(secs > 0 ? secs : null);
            }}
            placeholder="14:30"
            className="w-full rounded-xl bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
          />
        </div>
      </div>

      {/* Video Chapters / Key Moments Builder */}
      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-[#1c1e29]">
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">
          Vaqt Kodlari / Key Moments (Google Video qidiruvida alohida bo‘lim bo‘lib chiqadi)
        </label>

        {chapters.length > 0 && (
          <div className="space-y-1.5">
            {chapters.map((ch, idx) => (
              <div
                key={`${ch.seconds}-${idx}`}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200/70 dark:border-[#24252f] text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-[#3995ff] shrink-0">
                    {ch.time}
                  </span>
                  <span className="truncate text-slate-800 dark:text-slate-200">
                    {ch.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChaptersChange(chapters.filter((_, i) => i !== idx))
                  }
                  className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newChapTime}
            onChange={(e) => setNewChapTime(e.target.value)}
            placeholder="02:15"
            className="w-20 rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
          />
          <input
            type="text"
            value={newChapTitle}
            onChange={(e) => setNewChapTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddChapter();
              }
            }}
            placeholder="Bo'lim nomi (masalan: SSR va ISR farqi)"
            className="flex-1 rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff]"
          />
          <button
            type="button"
            onClick={handleAddChapter}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#3995ff] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Qo‘shish</span>
          </button>
        </div>
      </div>

      {/* Transcript / Summary Notes */}
      <div className="space-y-1">
        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <FileText className="w-3 h-3 text-[#3995ff]" />
          <span>Video Transkripti / Qisqa Konspekt (Google matn indeksatsiyasi uchun)</span>
        </label>
        <textarea
          rows={3}
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Video darsda tushuntirilgan asosiy tezislar va terminlar..."
          className="w-full rounded-xl bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3995ff] resize-y"
        />
      </div>
    </div>
  );
}
