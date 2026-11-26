"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Image as ImageIcon,
  Video,
  FileText,
  Layers,
  HardDrive,
  UploadCloud,
  Search,
  RotateCw,
  Plus,
  Play,
  MoreVertical,
  Trash2,
  Copy,
  ExternalLink,
  Download,
  Check,
  X,
  Loader2,
  Folder,
  RefreshCw,
  Cloud,
  CheckCircle2,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/client";

interface MediaItem {
  id: string;
  title: string;
  mediaType: "youtube" | "video" | "image" | "file";
  url: string;
  thumbnailUrl?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  fileExtension: string;
  fileSizeBytes: number;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  youtubeVideoId?: string | null;
  bunnyVideoId?: string | null;
  collectionName?: string | null;
  createdAt: string;
  updatedAt: string;
  uploaderName?: string | null;
}

interface MediaCollection {
  id: string;
  name: string;
  count: number;
  totalSize: number;
  isStream: boolean;
}

interface AccountInfo {
  streamLibraryId: string;
  streamLibraryName: string;
  streamCdnHostname: string;
  storageZone: string;
  storageCdnUrl: string;
  balance: string;
}

interface MediaStats {
  totalCount: number;
  videoCount: number;
  streamVideoCount: number;
  youtubeCount: number;
  imageCount: number;
  fileCount: number;
  recentCount: number;
  storage: {
    totalBytes: number;
    videoBytes: number;
    imageBytes: number;
    fileBytes: number;
    maxLimitBytes: number;
    percentUsed: number;
  };
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function YouTubeRedIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`text-red-500 shrink-0 ${className}`}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function MediaEnginePage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [collections, setCollections] = useState<MediaCollection[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Filters & Search
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedSort, setSelectedSort] = useState("newest");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dropdown states
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Modals
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeCollection, setYoutubeCollection] = useState("tutorials");
  const [addingYouTube, setAddingYouTube] = useState(false);

  const [showCreateCollModal, setShowCreateCollModal] = useState(false);
  const [newCollName, setNewCollName] = useState("");
  const [creatingColl, setCreatingColl] = useState(false);

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCollection, setUploadCollection] = useState<string>("tutorials");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load media list
  const loadMedia = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (selectedType !== "all") params.set("type", selectedType);
      if (selectedCollection !== "all") params.set("collection", selectedCollection);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedDate !== "all") params.set("date", selectedDate);
      if (selectedSort !== "newest") params.set("sort", selectedSort);

      const res = await apiClient<{
        items: MediaItem[];
        stats: MediaStats;
        collections: MediaCollection[];
        accountInfo: AccountInfo;
      }>(`/api/admin/media?${params.toString()}`);

      if (res.data) {
        setItems(res.data.items || []);
        setStats(res.data.stats || null);
        setCollections(res.data.collections || []);
        setAccountInfo(res.data.accountInfo || null);
      }
    } catch {
      toast.error("Media fayllarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType, selectedCollection, searchQuery, selectedDate, selectedSort]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  // Sync with Bunny.net
  const handleSyncWithBunny = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/media/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Sinxronlashda xatolik");
      }
      toast.success(
        `Bunny.net bilan sinxronlandi! (Jami ${data.data?.totalFiles || 0} ta fayl, ${data.data?.collections?.length || 0} ta to'plam)`
      );
      loadMedia();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Bunny.net bilan sinxronlashda xatolik yuz berdi");
    } finally {
      setSyncing(false);
    }
  };

  // Create new Bunny Stream collection
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollName.trim()) return;

    setCreatingColl(true);
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_collection",
          name: newCollName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "To'plam yaratishda xatolik");
      }
      toast.success(`"${newCollName}" to'plami Bunny Stream'da muvaffaqiyatli yaratildi!`);
      setShowCreateCollModal(false);
      setNewCollName("");
      loadMedia();
    } catch (err: any) {
      toast.error(err.message || "To'plam yaratishda xatolik yuz berdi");
    } finally {
      setCreatingColl(false);
    }
  };

  // Handle Drag & Drop Upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(15);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
    formData.append("collection", uploadCollection || "tutorials");

    try {
      setUploadProgress(45);
      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Fayl yuklashda xatolik");
      }

      setUploadProgress(100);
      toast.success(`"${file.name}" muvaffaqiyatli yuklandi!`);
      loadMedia();
    } catch (err: any) {
      toast.error(err.message || "Faylni yuklashda xatolik yuz berdi");
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles[0]) {
      handleFileUpload(droppedFiles[0]);
    }
  };

  // Add YouTube video
  const handleAddYouTube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) {
      toast.error("YouTube havolasini kiriting");
      return;
    }

    setAddingYouTube(true);
    try {
      const res = await apiClient("/api/admin/media", {
        method: "POST",
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          title: youtubeTitle.trim() || undefined,
          collection: youtubeCollection || "tutorials",
        }),
      });

      if (res.data) {
        toast.success("YouTube video muvaffaqiyatli qo'shildi!");
        setShowYouTubeModal(false);
        setYoutubeUrl("");
        setYoutubeTitle("");
        loadMedia();
      }
    } catch (err: any) {
      toast.error(err.message || "YouTube videoni qo'shishda xatolik yuz berdi");
    } finally {
      setAddingYouTube(false);
    }
  };

  // Delete media item
  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`Haqiqatan ham "${title}" faylini o'chirmoqchimisiz?`)) return;

    try {
      await apiClient(`/api/admin/media/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Fayl o'chirildi");
      loadMedia();
    } catch (err: any) {
      toast.error(err.message || "O'chirishda xatolik yuz berdi");
    } finally {
      setOpenActionId(null);
    }
  };

  // Copy link
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Havola nusxalandi!");
    setOpenActionId(null);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenActionId(null);
      setShowAddMenu(false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Compute segmented storage progress percentages safely
  const totalStorageBytes = stats?.storage?.totalBytes || 0;
  const videoStorageBytes = stats?.storage?.videoBytes || 0;
  const imageStorageBytes = stats?.storage?.imageBytes || 0;
  const fileStorageBytes = stats?.storage?.fileBytes || 0;

  const videoBarPercent = totalStorageBytes > 0 ? (videoStorageBytes / totalStorageBytes) * 100 : 0;
  const imageBarPercent = totalStorageBytes > 0 ? (imageStorageBytes / totalStorageBytes) * 100 : 0;
  const fileBarPercent = totalStorageBytes > 0 ? (fileStorageBytes / totalStorageBytes) * 100 : 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 shadow-xs">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Media Engine</h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Bunny.net Live</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Bunny Stream, Bunny Storage va YouTube videolarini bitta joydan boshqarish
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 relative">
          {/* Sync with Bunny Button */}
          <button
            onClick={handleSyncWithBunny}
            disabled={syncing}
            title="Bunny.net Storage va Stream'dagi barcha yangi fayllarni sinxronlash"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-slate-300 hover:text-white hover:bg-zinc-800 text-sm font-medium transition cursor-pointer disabled:opacity-50"
          >
            <Cloud className={`w-4 h-4 text-sky-400 ${syncing ? "animate-bounce" : ""}`} />
            <span>{syncing ? "Sinxronlanmoqda..." : "Bunny sinxronlash"}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => loadMedia(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-slate-300 hover:text-white hover:bg-zinc-800 text-sm font-medium transition cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
            <span>Yangilash</span>
          </button>

          {/* Add Media Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowAddMenu((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Media qo'shish</span>
              <span className="text-xs opacity-75">▾</span>
            </button>

            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setShowAddMenu(false);
                    setShowYouTubeModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-zinc-800/80 transition text-left cursor-pointer"
                >
                  <YouTubeRedIcon className="w-4 h-4" />
                  <div>
                    <div className="font-medium">YouTube video</div>
                    <div className="text-[11px] text-slate-400">Havola orqali video qo'shish</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowAddMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-zinc-800/80 transition text-left cursor-pointer"
                >
                  <Video className="w-4 h-4 text-sky-400" />
                  <div>
                    <div className="font-medium">Video yuklash (Bunny Stream)</div>
                    <div className="text-[11px] text-slate-400">MP4, MOV • CDN Streaming</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowAddMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-zinc-800/80 transition text-left cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-medium">Rasm yuklash (Bunny Storage)</div>
                    <div className="text-[11px] text-slate-400">JPG, PNG, WebP</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowAddMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-zinc-800/80 transition text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-medium">Fayl yuklash (PDF, DOCX)</div>
                    <div className="text-[11px] text-slate-400">Hujjat va boshqa fayllar</div>
                  </div>
                </button>
                <div className="my-1 border-t border-zinc-800" />
                <button
                  onClick={() => {
                    setShowAddMenu(false);
                    setShowCreateCollModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-amber-400 hover:bg-zinc-800/80 transition text-left cursor-pointer"
                >
                  <Folder className="w-4 h-4" />
                  <div>
                    <div className="font-medium">+ Yangi to'plam ochish</div>
                    <div className="text-[11px] text-slate-400">Bunny Stream'da yangi kategoriya</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Real Stats Cards (Exact 4 Cards from Image 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Jami media */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-400">Jami media</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats ? stats.totalCount.toLocaleString() : "..."}
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-400 mt-1.5 font-medium">
              <span>▲ +{stats?.recentCount ?? 0}</span>
              <span className="text-slate-500 font-normal">(oxirgi 7 kunda)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Videolar */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-400">Videolar</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats ? stats.videoCount : "..."}
            </div>
            <div className="text-xs text-slate-400 mt-1.5 font-normal">
              {stats?.streamVideoCount ?? 0} Bunny Stream • {stats?.youtubeCount ?? 0} YouTube
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <Play className="w-5 h-5 fill-red-400" />
          </div>
        </div>

        {/* Card 3: Rasmlar */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-400">Rasmlar</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats ? stats.imageCount.toLocaleString() : "..."}
            </div>
            <div className="text-xs text-emerald-400 mt-1.5 font-medium">
              Bunny CDN Storage xotirasida
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Fayllar */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-400">Fayllar</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats ? stats.fileCount : "..."}
            </div>
            <div className="text-xs text-slate-400 mt-1.5 font-normal">
              Hujjat va boshqa fayllar
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Drag & Drop Zone and Real Storage Usage (Row 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`lg:col-span-8 rounded-2xl border-2 border-dashed p-7 flex flex-col items-center justify-center text-center transition-all ${
            isDragging
              ? "border-blue-500 bg-blue-950/40 scale-[1.005]"
              : "border-blue-500/30 bg-blue-950/15 hover:border-blue-500/50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <div className="w-12 h-12 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>

          <h3 className="text-base font-semibold text-white">
            Fayllarni shu yerga sudrab tashlang yoki tanlang
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-3">
            Videolar to'g'ridan-to'g'ri <strong>Bunny Stream</strong> kutubxonasiga, rasmlar va fayllar <strong>Bunny Storage</strong>ga yuklanadi.
          </p>

          {/* Collection Selector before uploading */}
          <div className="flex items-center gap-2 mb-4 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400">Yuklanadigan to'plam:</span>
            <select
              value={uploadCollection}
              onChange={(e) => setUploadCollection(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="tutorials" className="bg-zinc-900 text-white">tutorials (Bunny Stream)</option>
              <option value="shorts" className="bg-zinc-900 text-white">shorts (Bunny Stream)</option>
              <option value="projects" className="bg-zinc-900 text-white">projects (Storage)</option>
              <option value="covers" className="bg-zinc-900 text-white">covers (Storage)</option>
              <option value="avatars" className="bg-zinc-900 text-white">avatars (Storage)</option>
            </select>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            <span>{isUploading ? "Yuklanmoqda..." : "Fayl tanlash"}</span>
          </button>

          {isUploading && (
            <div className="w-full max-w-xs mt-4">
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{uploadProgress}% yuklandi</p>
            </div>
          )}
        </div>

        {/* Real Storage Usage Card */}
        <div className="lg:col-span-4 bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-semibold text-white">Xotira ishlatilishi</h3>
              </div>
              <span className="text-[11px] text-slate-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/60">
                Bunny CDN
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-4">
              <div className="text-xl font-bold text-white">
                {formatBytes(stats?.storage?.totalBytes || 0)}{" "}
                <span className="text-sm font-normal text-slate-400">
                  / {formatBytes(stats?.storage?.maxLimitBytes || 100 * 1024 * 1024 * 1024)}
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-300">
                {stats?.storage?.percentUsed ?? 0} %
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden flex mt-3">
              {videoBarPercent > 0 && (
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{ width: `${videoBarPercent}%` }}
                  title={`Video: ${formatBytes(videoStorageBytes)}`}
                />
              )}
              {imageBarPercent > 0 && (
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${imageBarPercent}%` }}
                  title={`Rasm: ${formatBytes(imageStorageBytes)}`}
                />
              )}
              {fileBarPercent > 0 && (
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{ width: `${fileBarPercent}%` }}
                  title={`Fayl: ${formatBytes(fileStorageBytes)}`}
                />
              )}
              {totalStorageBytes === 0 && (
                <div className="bg-zinc-700 h-full w-full" />
              )}
            </div>
          </div>

          {/* Legend Items */}
          <div>
            <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-zinc-800/80 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-300">Video: {formatBytes(videoStorageBytes)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Rasm: {formatBytes(imageStorageBytes)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-300">Fayl: {formatBytes(fileStorageBytes)}</span>
              </div>
            </div>

            {/* Live Bunny.net Account Badge */}
            <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span>Lib: <strong className="text-slate-200">{accountInfo?.streamLibraryName || "local-network-videos"}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <span>Balans:</span>
                <span className="text-emerald-400 font-semibold">{accountInfo?.balance || "$7.85"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Real Collections Bar (Bunny Stream & Storage) */}
      <div className="flex items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-2xl overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider shrink-0">
            To'plamlar:
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-1">
          <button
            onClick={() => setSelectedCollection("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              selectedCollection === "all"
                ? "bg-zinc-200 text-zinc-950 font-semibold shadow-xs"
                : "bg-zinc-800/60 text-slate-300 hover:text-white hover:bg-zinc-800"
            }`}
          >
            Barcha to'plamlar ({stats?.totalCount ?? 0})
          </button>

          {collections.map((coll) => {
            const isActive = selectedCollection === coll.name;
            return (
              <button
                key={coll.id}
                onClick={() => setSelectedCollection(coll.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                    : "bg-zinc-800/60 text-slate-300 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <span>{coll.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-zinc-700 text-slate-400"
                }`}>
                  {coll.count}
                </span>
                {coll.isStream && (
                  <span className="text-[9px] px-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Stream
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowCreateCollModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-medium transition cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Yangi to'plam</span>
        </button>
      </div>

      {/* 5. Search and Media Type Filters Bar (Row 4) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-2xl">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Media nomi, to'plami yoki kengaytmasi bo'yicha qidiring..."
            className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/80 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {[
            { id: "all", label: "Barchasi" },
            { id: "video", label: `Videolar (${stats?.videoCount ?? 0})`, icon: Video },
            { id: "image", label: `Rasmlar (${stats?.imageCount ?? 0})`, icon: ImageIcon },
            { id: "file", label: `Fayllar (${stats?.fileCount ?? 0})`, icon: FileText },
            { id: "youtube", label: `YouTube (${stats?.youtubeCount ?? 0})`, customIcon: YouTubeRedIcon },
          ].map((tab) => {
            const isActive = selectedType === tab.id;
            const Icon = tab.icon;
            const CustomIcon = tab.customIcon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-zinc-800/70"
                }`}
              >
                {CustomIcon && <CustomIcon className="w-3.5 h-3.5" />}
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dropdowns on Right */}
        <div className="flex items-center gap-2">
          {/* Date Filter */}
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">📅 Barcha sanalar</option>
            <option value="today">Bugun</option>
            <option value="week">Oxirgi 7 kun</option>
            <option value="month">Shu oy</option>
          </select>

          {/* Sort Filter */}
          <select
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
            className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="newest">⇅ Yangi qo'shilgan</option>
            <option value="oldest">Eskilar avval</option>
            <option value="size_desc">Eng katta hajm</option>
            <option value="size_asc">Eng kichik hajm</option>
            <option value="title">Nom bo'yicha (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 6. Media Grid (Exact Card Layout from Image 2) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-zinc-900/60 rounded-2xl h-64 border border-zinc-800/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl">
          <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">Hech qanday media topilmadi</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Qidiruv so'zini yoki to'plam filtrini o'zgartiring, yoki yuqoridagi tugma orqali yangi media yuklang.
          </p>
          <button
            onClick={handleSyncWithBunny}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-sky-400" />
            <span>Bunny.net'dan qayta sinxronlash</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isYouTube = item.mediaType === "youtube";
            const isUploadedVideo = item.mediaType === "video";
            const isImage = item.mediaType === "image";
            const isFile = item.mediaType === "file";

            return (
              <div
                key={item.id}
                className={`group bg-zinc-900/90 border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between hover:border-zinc-700 ${
                  isSelected ? "border-blue-500 shadow-md shadow-blue-500/10" : "border-zinc-800/80"
                }`}
              >
                {/* Visual Preview Box */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="aspect-video relative bg-zinc-950/80 overflow-hidden flex items-center justify-center cursor-pointer select-none"
                >
                  {/* Image or Video Thumbnail */}
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : isFile ? (
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className={`w-14 h-16 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-md ${
                          item.fileExtension.toUpperCase() === "PDF"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : item.fileExtension.toUpperCase() === "DOCX" ||
                              item.fileExtension.toUpperCase() === "DOC"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-zinc-800 text-slate-300 border border-zinc-700"
                        }`}
                      >
                        {item.fileExtension || "FILE"}
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-zinc-800/80 flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  {/* Top-Left Category Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                    {isYouTube && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-semibold text-white shadow-xs">
                        <YouTubeRedIcon className="w-3.5 h-3.5" />
                        <span>YouTube</span>
                      </span>
                    )}
                    {isUploadedVideo && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-500/30 backdrop-blur-md text-[11px] font-semibold text-indigo-300 shadow-xs">
                        <Video className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{item.bunnyVideoId ? "Bunny Stream" : "Video"}</span>
                      </span>
                    )}
                    {isImage && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/30 backdrop-blur-md text-[11px] font-semibold text-emerald-300 shadow-xs">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Rasm</span>
                      </span>
                    )}
                    {isFile && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-500/30 backdrop-blur-md text-[11px] font-semibold text-blue-300 shadow-xs">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Fayl</span>
                      </span>
                    )}
                  </div>

                  {/* Top-Right Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                    className={`absolute top-2.5 right-2.5 z-10 w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-black/50 border-white/20 text-transparent hover:border-white/50"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-3" />
                  </button>

                  {/* Center Play Button for Videos */}
                  {(isYouTube || isUploadedVideo) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white group-hover:scale-110 transition shadow-lg">
                        <Play className="w-4 h-4 fill-white translate-x-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Bottom-Right Duration */}
                  {item.durationSeconds && item.durationSeconds > 0 && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-semibold text-white">
                      {formatDuration(item.durationSeconds)}
                    </span>
                  )}
                </div>

                {/* Bottom Details Section */}
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className="text-sm font-semibold text-white truncate cursor-pointer hover:text-blue-400 transition flex-1"
                      title={item.title}
                      onClick={() => setPreviewItem(item)}
                    >
                      {item.title}
                    </h4>
                    {item.collectionName && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-slate-300 border border-zinc-700/60 shrink-0">
                        {item.collectionName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                    <div className="flex items-center gap-1.5 truncate">
                      {isYouTube ? (
                        <>
                          <YouTubeRedIcon className="w-3 h-3" />
                          <span>YouTube</span>
                          {item.durationSeconds && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(item.durationSeconds)}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-300">
                            {item.fileExtension || (isImage ? "JPG" : "FILE")}
                          </span>
                          {item.durationSeconds && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(item.durationSeconds)}</span>
                            </>
                          )}
                          {item.fileSizeBytes > 0 && (
                            <>
                              <span>•</span>
                              <span>{formatBytes(item.fileSizeBytes)}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {/* 3-dots Menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() =>
                          setOpenActionId((prev) => (prev === item.id ? null : item.id))
                        }
                        className="p-1 rounded-lg hover:bg-zinc-800 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openActionId === item.id && (
                        <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                          <button
                            onClick={() => handleCopyLink(item.url)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-zinc-800 hover:text-white transition text-left cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Havolani nusxalash</span>
                          </button>
                          <button
                            onClick={() => {
                              setPreviewItem(item);
                              setOpenActionId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-zinc-800 hover:text-white transition text-left cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ko'rish / Ochish</span>
                          </button>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-zinc-800 hover:text-white transition text-left"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Yuklab olish</span>
                          </a>
                          <div className="my-1 border-t border-zinc-800" />
                          <button
                            onClick={() => handleDeleteItem(item.id, item.title)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition text-left cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>O'chirish</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Modal: Add YouTube Video */}
      {showYouTubeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowYouTubeModal(false)}
        >
          <div
            className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <YouTubeRedIcon className="w-5 h-5" />
                <h3 className="text-base font-semibold text-white">YouTube video qo'shish</h3>
              </div>
              <button
                onClick={() => setShowYouTubeModal(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddYouTube} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  YouTube video havolasi (URL) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://www.youtube.com/watch?v=... yoki https://youtu.be/..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Sarlavha (ixtiyoriy, bo'sh qolsa YouTube'dan avtomatik olinadi)
                </label>
                <input
                  type="text"
                  placeholder="Video nomini kiriting..."
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Qaysi to'plamga biriktirilsin?
                </label>
                <select
                  value={youtubeCollection}
                  onChange={(e) => setYoutubeCollection(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="tutorials">tutorials (Darsliklar)</option>
                  <option value="shorts">shorts (Qisqa videolar)</option>
                  <option value="general">general (Umumiy)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowYouTubeModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-slate-300 hover:bg-zinc-800 text-sm font-medium transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={addingYouTube}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {addingYouTube && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{addingYouTube ? "Yuklanmoqda..." : "Qo'shish"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: Create Bunny Stream Collection */}
      {showCreateCollModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowCreateCollModal(false)}
        >
          <div
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Folder className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Yangi to'plam ochish</h3>
              </div>
              <button
                onClick={() => setShowCreateCollModal(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  To'plam nomi (masalan: darsliklar, kurslar, yangiliklar) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="To'plam nomi..."
                  value={newCollName}
                  onChange={(e) => setNewCollName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Bu to'plam to'g'ridan-to'g'ri Bunny Stream Library'da (ID: 813790) yangi kategoriya sifatida yaratiladi.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateCollModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-slate-300 hover:bg-zinc-800 text-sm font-medium transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={creatingColl}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {creatingColl && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{creatingColl ? "Yaratilmoqda..." : "Yaratish"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Modal: Media Preview & Player (Supports Bunny Stream iframe, YouTube, Images) */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                  {previewItem.mediaType}
                </span>
                <h3 className="text-base font-semibold text-white truncate max-w-md">
                  {previewItem.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Media Content */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden min-h-90 p-2">
              {previewItem.mediaType === "youtube" && previewItem.youtubeVideoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${previewItem.youtubeVideoId}?autoplay=1`}
                  title={previewItem.title}
                  className="w-full h-full aspect-video rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : previewItem.bunnyVideoId ? (
                <iframe
                  src={`https://iframe.mediadelivery.net/embed/${accountInfo?.streamLibraryId || "813790"}/${previewItem.bunnyVideoId}?autoplay=true&loop=false&muted=false&preload=true`}
                  loading="lazy"
                  className="w-full h-full aspect-video rounded-lg border-0"
                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                  allowFullScreen
                />
              ) : previewItem.mediaType === "video" ? (
                <video
                  src={previewItem.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[60vh] rounded-lg shadow-lg"
                />
              ) : previewItem.mediaType === "image" ? (
                <img
                  src={previewItem.url}
                  alt={previewItem.title}
                  className="max-w-full max-h-[65vh] object-contain rounded-lg"
                />
              ) : (
                <div className="text-center p-10">
                  <FileText className="w-20 h-20 text-blue-400 mx-auto mb-4" />
                  <p className="text-sm font-semibold text-white mb-2">{previewItem.title}</p>
                  <p className="text-xs text-slate-400 mb-6">
                    {previewItem.fileExtension} • {formatBytes(previewItem.fileSizeBytes)}
                  </p>
                  <a
                    href={previewItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-md transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Faylni yuklab olish</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer Info */}
            <div className="px-6 py-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/50 shrink-0 text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span>Hajmi: <strong className="text-white">{formatBytes(previewItem.fileSizeBytes)}</strong></span>
                {previewItem.collectionName && (
                  <span>To'plam: <strong className="text-white">{previewItem.collectionName}</strong></span>
                )}
                {previewItem.durationSeconds && (
                  <span>Davomiyligi: <strong className="text-white">{formatDuration(previewItem.durationSeconds)}</strong></span>
                )}
                <span>Sana: <strong className="text-white">{new Date(previewItem.createdAt).toLocaleDateString()}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyLink(previewItem.url)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Havolani nusxalash</span>
                </button>
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>To'liq ochish</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
