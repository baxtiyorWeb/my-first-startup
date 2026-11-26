"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  Code,
  FileCode2,
  List,
  ListOrdered,
  Link2,
  Highlighter,
  Undo2,
  Redo2,
  ArrowLeft,
  Eraser,
  Globe,
  ImageIcon,
  X,
  Loader2,
  Sparkles,
  Paperclip,
  BookOpen,
  PlayCircle,
  Newspaper,
  MessageSquare,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import { compressAvatarImage } from "@/lib/image-compressor";
import { generateSeoSlug } from "@/lib/seo/slugify";
import type { ContentKind, VideoChapterItem } from "@/types/social";
import { SeoInspectorPanel } from "@/components/studio/seo-inspector-panel";
import { VideoTutorialBox } from "@/components/studio/video-tutorial-box";

interface FloatingToolbarState {
  visible: boolean;
  top: number;
  left: number;
}

function StudioEditorWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const initialKindParam = searchParams.get("kind");

  const { t, localePath } = useI18n();
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [contentKind, setContentKind] = useState<ContentKind>(
    initialKindParam === "video" || initialKindParam === "news" || initialKindParam === "thought"
      ? initialKindParam
      : "article"
  );
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [contentLocale, setContentLocale] = useState<"uz" | "ru" | "en">("uz");
  const [category, setCategory] = useState("umumiy");
  const [tagsInput, setTagsInput] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [coverImageAlt, setCoverImageAlt] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [isIndexable, setIsIndexable] = useState(true);

  // Video specific state
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);
  const [videoChapters, setVideoChapters] = useState<VideoChapterItem[]>([]);
  const [transcript, setTranscript] = useState("");

  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [htmlSnapshot, setHtmlSnapshot] = useState("");

  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(1);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalText, setLinkModalText] = useState("");
  const [linkModalUrl, setLinkModalUrl] = useState("");
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const [floatingToolbar, setFloatingToolbar] = useState<FloatingToolbarState>({
    visible: false,
    top: 0,
    left: 0,
  });

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    h2: false,
    h3: false,
    quote: false,
    code: false,
    highlight: false,
    ul: false,
    ol: false,
    link: false,
  });

  // Load existing item if ?edit=<id>
  useEffect(() => {
    if (!editId) return;
    setIsLoadingEdit(true);
    api.posts
      .getPost(editId)
      .then((post) => {
        setTitle(post.title || "");
        setSlug(post.slug || "");
        setSlugManuallyEdited(Boolean(post.slug));
        setContentKind((post.contentKind as ContentKind) || "article");
        setContentLocale(
          post.locale === "ru" || post.locale === "en" ? post.locale : "uz"
        );
        setCategory(String(post.category || "umumiy"));
        setTagsInput((post.tags || []).join(", "));
        setSeoTitle(post.seoTitle || "");
        setSeoDescription(post.seoDescription || "");
        setFocusKeyword(post.focusKeyword || "");
        setCoverImageAlt(post.coverImageAlt || "");
        setStatus(post.status === "draft" ? "draft" : "published");
        setIsIndexable(Boolean(post.isIndexable));
        setVideoUrl(post.videoUrl || "");
        setVideoDurationSeconds(post.videoDurationSeconds ?? null);
        setVideoChapters(post.videoChapters || []);
        setTranscript(post.transcript || "");
        setMediaUrls(post.mediaUrls || []);

        if (editorRef.current) {
          editorRef.current.innerHTML = post.content || "";
          setHtmlSnapshot(post.content || "");
          const text = editorRef.current.innerText.trim();
          const words = text ? text.split(/\s+/).length : 0;
          setWordCount(words);
          setReadingTime(Math.max(1, Math.ceil(words / 180)));
          historyRef.current = [post.content || ""];
          historyIndexRef.current = 0;
        }
      })
      .catch(() => toast.error("Tahrirlanadigan material topilmadi"))
      .finally(() => setIsLoadingEdit(false));
  }, [editId]);

  // Auto-derive slug from title unless manually edited
  useEffect(() => {
    if (!slugManuallyEdited && title.trim()) {
      setSlug(generateSeoSlug(title));
    }
  }, [title, slugManuallyEdited]);

  // Toggle indexable default automatically based on contentKind (only on create)
  useEffect(() => {
    if (!editId) {
      setIsIndexable(contentKind !== "thought");
    }
  }, [contentKind, editId]);

  const updateEditorStats = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    setWordCount(words);
    setReadingTime(Math.max(1, Math.ceil(words / 180)));
    setHtmlSnapshot(editorRef.current.innerHTML);
  }, []);

  const getActiveFormats = useCallback(() => {
    const result = {
      bold: false,
      italic: false,
      h2: false,
      h3: false,
      quote: false,
      code: false,
      highlight: false,
      ul: false,
      ol: false,
      link: false,
    };
    if (typeof window === "undefined" || !editorRef.current) return result;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return result;

    let node: Node | null = selection.anchorNode;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement) {
        const tag = node.tagName.toLowerCase();
        if (tag === "b" || tag === "strong" || node.style.fontWeight === "bold") result.bold = true;
        if (tag === "i" || tag === "em" || node.style.fontStyle === "italic") result.italic = true;
        if (tag === "h2") result.h2 = true;
        if (tag === "h3") result.h3 = true;
        if (tag === "blockquote") result.quote = true;
        if (tag === "code") result.code = true;
        if (tag === "mark") result.highlight = true;
        if (tag === "ul") result.ul = true;
        if (tag === "ol") result.ol = true;
        if (tag === "a") result.link = true;
      }
      node = node.parentNode;
    }

    try {
      if (document.queryCommandState("bold")) result.bold = true;
      if (document.queryCommandState("italic")) result.italic = true;
      if (document.queryCommandState("insertUnorderedList")) result.ul = true;
      if (document.queryCommandState("insertOrderedList")) result.ol = true;
    } catch {
      // ignore
    }

    return result;
  }, []);

  const saveHistory = useCallback(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const prevHtml = historyRef.current[historyIndexRef.current];
    if (currentHtml === prevHtml) return;

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(currentHtml);
    if (newHistory.length > 50) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  useEffect(() => {
    if (editorRef.current && historyRef.current.length === 0) {
      historyRef.current = [editorRef.current.innerHTML || ""];
      historyIndexRef.current = 0;
    }
  }, []);

  const checkSelection = useCallback(() => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();

    if (
      !selection ||
      selection.isCollapsed ||
      !editorRef.current ||
      !editorRef.current.contains(selection.anchorNode)
    ) {
      setFloatingToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      setActiveFormats(getActiveFormats());
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setFloatingToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      setActiveFormats(getActiveFormats());
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const toolbarWidth = 320;
      const top = Math.max(8, rect.top - 46);
      const left = Math.max(
        8,
        Math.min(window.innerWidth - toolbarWidth - 8, rect.left + rect.width / 2 - toolbarWidth / 2)
      );

      setFloatingToolbar({ visible: true, top, left });
      setActiveFormats(getActiveFormats());
    } catch {
      setFloatingToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    }
  }, [getActiveFormats]);

  useEffect(() => {
    document.addEventListener("selectionchange", checkSelection);
    window.addEventListener("resize", checkSelection);
    return () => {
      document.removeEventListener("selectionchange", checkSelection);
      window.removeEventListener("resize", checkSelection);
    };
  }, [checkSelection]);

  const executeUndo = useCallback(() => {
    if (!editorRef.current) return;
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      editorRef.current.innerHTML = historyRef.current[historyIndexRef.current];
      updateEditorStats();
      checkSelection();
    } else {
      document.execCommand("undo");
      updateEditorStats();
    }
  }, [updateEditorStats, checkSelection]);

  const executeRedo = useCallback(() => {
    if (!editorRef.current) return;
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      editorRef.current.innerHTML = historyRef.current[historyIndexRef.current];
      updateEditorStats();
      checkSelection();
    } else {
      document.execCommand("redo");
      updateEditorStats();
    }
  }, [updateEditorStats, checkSelection]);

  const openLinkModal = useCallback(() => {
    if (typeof window === "undefined" || !editorRef.current) return;
    const selection = window.getSelection();
    let initialText = "";
    let initialUrl = "";
    let rangeToSave: Range | null = null;

    if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
      rangeToSave = selection.getRangeAt(0).cloneRange();
      initialText = selection.toString();
      let node: Node | null = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node instanceof HTMLAnchorElement) {
          initialUrl = node.getAttribute("href") || "";
          if (!initialText) initialText = node.textContent || "";
          break;
        }
        node = node.parentNode;
      }
    }

    setSavedRange(rangeToSave);
    setLinkModalText(initialText);
    setLinkModalUrl(initialUrl || "/uz/hub/");
    setIsLinkModalOpen(true);
  }, []);

  const executeCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    saveHistory();
    const current = getActiveFormats();

    if (command === "undo") return executeUndo();
    if (command === "redo") return executeRedo();
    if (command === "link") return openLinkModal();

    if (command === "bold") {
      document.execCommand("bold", false);
    } else if (command === "italic") {
      document.execCommand("italic", false);
    } else if (command === "formatBlock" && (value === "<h2>" || value === "H2")) {
      document.execCommand("formatBlock", false, current.h2 ? "<p>" : "<h2>");
    } else if (command === "formatBlock" && (value === "<h3>" || value === "H3")) {
      document.execCommand("formatBlock", false, current.h3 ? "<p>" : "<h3>");
    } else if (command === "formatBlock" && (value === "<blockquote>" || value === "BLOCKQUOTE")) {
      document.execCommand("formatBlock", false, current.quote ? "<p>" : "<blockquote>");
    } else if (command === "codeblock") {
      document.execCommand(
        "insertHTML",
        false,
        "<pre><code>// Kod misolini shu yerga yozing\nconst example = true;</code></pre><p><br /></p>"
      );
    } else if (command === "code") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const text = sel.toString();
        if (text) {
          const el = document.createElement("code");
          el.textContent = text;
          const r = sel.getRangeAt(0);
          r.deleteContents();
          r.insertNode(el);
        } else {
          document.execCommand("insertHTML", false, "<code>kod</code>&nbsp;");
        }
      }
    } else if (command === "highlight") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.toString()) {
        const mark = document.createElement("mark");
        mark.textContent = sel.toString();
        const r = sel.getRangeAt(0);
        r.deleteContents();
        r.insertNode(mark);
      }
    } else if (command === "clearFormat") {
      document.execCommand("removeFormat", false);
      document.execCommand("formatBlock", false, "<p>");
    } else {
      document.execCommand(command, false, value);
    }

    saveHistory();
    updateEditorStats();
    checkSelection();
  };

  const handleApplyLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorRef.current) return;
    let targetUrl = linkModalUrl.trim();
    if (!targetUrl) {
      toast.error("Iltimos, havola manzilini kiriting");
      return;
    }
    if (!/^https?:\/\//i.test(targetUrl) && !targetUrl.startsWith("/")) {
      targetUrl = `https://${targetUrl}`;
    }

    editorRef.current.focus();
    if (savedRange && window.getSelection()) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange);
    }

    const displayText = linkModalText.trim() || targetUrl;
    const isInternal = targetUrl.startsWith("/") || targetUrl.includes("geters.uz");
    const sel = window.getSelection();

    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      document.execCommand("createLink", false, targetUrl);
    } else {
      const targetAttr = isInternal ? "" : ' target="_blank" rel="noopener noreferrer"';
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${targetUrl}"${targetAttr}>${displayText}</a>&nbsp;`
      );
    }

    saveHistory();
    updateEditorStats();
    setIsLinkModalOpen(false);
    toast.success("Havola qo‘shildi");
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    saveHistory();
    updateEditorStats();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mediaUrls.length + files.length > 3) {
      toast.error("Ko‘pi bilan 3 tagacha rasm yuklash mumkin");
      return;
    }

    setIsUploadingImage(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Rasm hajmi 10MB dan oshmasligi kerak");
          continue;
        }
        const compressedBlob = await compressAvatarImage(file);
        const compressedFile = new File([compressedBlob], `editorial-${Date.now()}-${i}.webp`, {
          type: "image/webp",
        });
        const uploadRes = await api.upload.uploadFile(compressedFile, "projects");
        newUrls.push(uploadRes.url);
      }
      setMediaUrls((prev) => [...prev, ...newUrls].slice(0, 3));
    } catch {
      toast.error("Rasmni yuklashda xatolik yuz berdi");
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plainText = editorRef.current?.innerText.trim() || "";
    let htmlContent = editorRef.current?.innerHTML.trim() || "";

    if (!plainText) {
      toast.error("Iltimos, material matnini kiriting");
      editorRef.current?.focus();
      return;
    }

    if (contentKind !== "thought" && !title.trim()) {
      toast.error("Maqola, video darslik yoki yangilik uchun sarlavha (H1) shart");
      return;
    }

    if (contentKind === "video" && !videoUrl.trim()) {
      toast.error("Video darslik uchun YouTube yoki Bunny Stream havolasini kiriting");
      return;
    }

    htmlContent = htmlContent
      .replace(/<div><br\s*\/?><\/div>/gi, "<p><br /></p>")
      .replace(/<div>(.*?)<\/div>/gi, "<p>$1</p>")
      .replace(/<p><\/p>/gi, "<p><br /></p>");

    const parsedTags = tagsInput
      .split(",")
      .map((s) => s.replace(/^#/, "").trim())
      .filter(Boolean)
      .slice(0, 10);

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim() || undefined,
        slug: slug.trim() || undefined,
        content: htmlContent || plainText,
        postType: "thought" as const,
        contentKind,
        status,
        isIndexable: contentKind === "thought" ? false : isIndexable,
        locale: contentLocale,
        category,
        tags: parsedTags,
        coverImageUrl: mediaUrls[0] || undefined,
        coverImageAlt: coverImageAlt.trim() || undefined,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        focusKeyword: focusKeyword.trim() || undefined,
        videoUrl: contentKind === "video" ? videoUrl.trim() : undefined,
        videoDurationSeconds: contentKind === "video" ? videoDurationSeconds : undefined,
        videoChapters: contentKind === "video" ? videoChapters : [],
        transcript: contentKind === "video" ? transcript.trim() || undefined : undefined,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      };

      const saved = editId
        ? await api.posts.updatePost(editId, payload)
        : await api.posts.createPost(payload);

      toast.success(
        editId ? "Material muvaffaqiyatli yangilandi!" : "Material muvaffaqiyatli chop etildi!"
      );

      if (status === "published" && saved.slug && contentKind !== "thought") {
        const seg =
          contentKind === "video" ? "videos" : contentKind === "news" ? "news" : "articles";
        router.push(`/${contentLocale}/${seg}/${saved.slug}`);
      } else {
        router.push(localePath("/dashboard"));
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Saqlashda xatolik yuz berdi";
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  const kindCards: Array<{ id: ContentKind; label: string; desc: string; Icon: React.ElementType }> = [
    { id: "article", label: "Maqola", desc: "Chuqur qo‘llanma", Icon: BookOpen },
    { id: "video", label: "Video darslik", desc: "Video + Konspekt", Icon: PlayCircle },
    { id: "news", label: "IT Yangilik", desc: "Tezkor xabar", Icon: Newspaper },
    { id: "thought", label: "Qisqa fikr", desc: "Ichki lenta", Icon: MessageSquare },
  ];

  const toolBtn = (active: boolean) =>
    `p-1.5 rounded-lg transition-colors cursor-pointer ${
      active
        ? "bg-[#3995ff] text-white font-bold"
        : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e202b]"
    }`;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 pb-12 text-slate-800 dark:text-slate-200">
      {/* Top Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#24252f]">
        <div className="flex items-center gap-3">
          <Link
            href={localePath("/dashboard")}
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-white dark:bg-[#101117] border border-slate-200 dark:border-[#24252f]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Orqaga</span>
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white">
              {editId ? "Materialni tahrirlash (SEO Studio)" : "Geters SEO Editorial Studio"}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Maqolalar, video darsliklar va yangiliklarni Google/Yandex standartida chop eting
            </p>
          </div>
        </div>

        <div className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#101117] border border-slate-200 dark:border-[#24252f] px-3 py-1.5 rounded-xl">
          {wordCount} {t("create.words") || "so‘z"} • ~{readingTime} min
        </div>
      </div>

      {/* Floating Selection Toolbar */}
      {floatingToolbar.visible && (
        <div
          style={{ position: "fixed", top: `${floatingToolbar.top}px`, left: `${floatingToolbar.left}px`, zIndex: 60 }}
          className="flex items-center gap-0.5 p-1 rounded-xl bg-[#0b0c13] text-white shadow-xl border border-[#24252f]"
        >
          <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("bold"); }} className={toolBtn(activeFormats.bold)}>
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("italic"); }} className={toolBtn(activeFormats.italic)}>
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("formatBlock", "<h2>"); }} className={`px-1.5 py-1 text-[11px] rounded-lg cursor-pointer ${activeFormats.h2 ? "bg-[#3995ff] text-white" : "text-slate-200 hover:bg-[#1e202b]"}`}>
            H2
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("formatBlock", "<h3>"); }} className={`px-1.5 py-1 text-[11px] rounded-lg cursor-pointer ${activeFormats.h3 ? "bg-[#3995ff] text-white" : "text-slate-200 hover:bg-[#1e202b]"}`}>
            H3
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("highlight"); }} className={toolBtn(activeFormats.highlight)}>
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("code"); }} className={toolBtn(activeFormats.code)}>
            <Code className="w-3.5 h-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("link"); }} className={toolBtn(activeFormats.link)}>
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#101117] border border-slate-200 dark:border-[#24252f] rounded-2xl shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1c1e29]">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#3995ff]" />
                Havola qo‘shish (Ichki / Tashqi SEO)
              </h3>
              <button type="button" onClick={() => setIsLinkModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleApplyLink} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Ankor matn (Anchor text)
                </label>
                <input
                  type="text"
                  value={linkModalText}
                  onChange={(e) => setLinkModalText(e.target.value)}
                  placeholder="Masalan: Next.js qo'llanmasi"
                  className="w-full rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  URL (/uz/hub/nextjs yoki https://...)
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={linkModalUrl}
                    onChange={(e) => setLinkModalUrl(e.target.value)}
                    className="w-full rounded-lg bg-slate-50 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsLinkModalOpen(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#24252f] text-xs cursor-pointer">
                  Bekor qilish
                </button>
                <button type="submit" className="px-3.5 py-1.5 rounded-lg bg-[#3995ff] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer">
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoadingEdit ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#3995ff]" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Main Authoring Column */}
          <div className="lg:col-span-8 space-y-4">
            {/* Content Type Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {kindCards.map((kc) => {
                const active = contentKind === kc.id;
                return (
                  <button
                    key={kc.id}
                    type="button"
                    onClick={() => setContentKind(kc.id)}
                    className={`p-3 rounded-[14px] border text-left transition-all cursor-pointer ${
                      active
                        ? "bg-blue-50 dark:bg-[#162038] border-[#3995ff] shadow-xs"
                        : "bg-white dark:bg-[#101117] border-slate-200/90 dark:border-[#24252f] hover:border-[#3995ff]/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <kc.Icon className={`w-4 h-4 ${active ? "text-[#3995ff]" : "text-slate-400"}`} />
                      <span className={`text-xs font-bold ${active ? "text-[#3995ff]" : "text-slate-900 dark:text-white"}`}>
                        {kc.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{kc.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Title (H1) & WYSIWYG Editor */}
            <div className="rounded-[16px] bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#1c1e29]">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Asosiy Sarlavha (H1) — kalit so'z bilan aniq va jozibador yozing..."
                  className="w-full text-lg sm:text-2xl font-extrabold bg-transparent text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Editor Toolbar */}
              <div className="flex items-center flex-wrap gap-1 px-3 py-2 bg-slate-50 dark:bg-[#14151d] border-b border-slate-200 dark:border-[#24252f]">
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeUndo(); }} title="Bekor qilish" className={toolBtn(false)}>
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeRedo(); }} title="Qaytarish" className={toolBtn(false)}>
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
                <span className="w-px h-4 bg-slate-200 dark:bg-[#24252f] mx-1" />
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("bold"); }} title="Qalin" className={toolBtn(activeFormats.bold)}>
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("italic"); }} title="Kursiv" className={toolBtn(activeFormats.italic)}>
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("formatBlock", "<h2>"); }} title="H2 Sarlavha" className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-0.5 cursor-pointer ${activeFormats.h2 ? "bg-[#3995ff] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e202b]"}`}>
                  <Heading2 className="w-3.5 h-3.5" /> H2
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("formatBlock", "<h3>"); }} title="H3 Kichik sarlavha" className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-0.5 cursor-pointer ${activeFormats.h3 ? "bg-[#3995ff] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e202b]"}`}>
                  <Heading3 className="w-3.5 h-3.5" /> H3
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("formatBlock", "<blockquote>"); }} title="Iqtibos" className={toolBtn(activeFormats.quote)}>
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("insertUnorderedList"); }} title="Ro'yxat" className={toolBtn(activeFormats.ul)}>
                  <List className="w-3.5 h-3.5" />
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("insertOrderedList"); }} title="Raqamli ro'yxat" className={toolBtn(activeFormats.ol)}>
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("highlight"); }} title="Ajratib ko'rsatish" className={toolBtn(activeFormats.highlight)}>
                  <Highlighter className="w-3.5 h-3.5" />
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("code"); }} title="Inline kod" className={toolBtn(activeFormats.code)}>
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("codeblock"); }} title="Ko'p qatorli kod bloki (<pre>)" className="px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e202b] cursor-pointer">
                  <FileCode2 className="w-3.5 h-3.5 text-[#3995ff]" />
                  <span>Kod bloki</span>
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("link"); }} title="Havola (Ctrl+K)" className="px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 text-[#3995ff] hover:bg-[#3995ff]/10 cursor-pointer">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Havola</span>
                </button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand("clearFormat"); }} title="Formatni tozalash" className={toolBtn(false)}>
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Editor Content Area */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onFocus={() => {
                  try {
                    document.execCommand("defaultParagraphSeparator", false, "p");
                  } catch {}
                }}
                onInput={() => {
                  updateEditorStats();
                  saveHistory();
                }}
                onKeyUp={checkSelection}
                onMouseUp={checkSelection}
                onPaste={handlePaste}
                data-placeholder="Chuqur tahlil, darslik konspekti yoki IT yangilik matnini shu yerga yozing. H2/H3 sarlavhalardan foydalansangiz avtomatik Mundarija shakllanadi..."
                className="gogetters-rich-editor p-4 sm:p-6 text-sm sm:text-base text-slate-900 dark:text-slate-100 cursor-text min-h-[340px] leading-relaxed"
              />
            </div>

            {/* Video Tutorial Settings when contentKind === 'video' */}
            {contentKind === "video" && (
              <VideoTutorialBox
                videoUrl={videoUrl}
                onVideoUrlChange={setVideoUrl}
                durationSeconds={videoDurationSeconds}
                onDurationSecondsChange={setVideoDurationSeconds}
                chapters={videoChapters}
                onChaptersChange={setVideoChapters}
                transcript={transcript}
                onTranscriptChange={setTranscript}
              />
            )}

            {/* Cover & Media Images */}
            <div className="p-4 bg-white dark:bg-[#101117] rounded-[16px] border border-slate-200/90 dark:border-[#24252f] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#3995ff]" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    Muqova &amp; Illyustratsiyalar (Birinchi rasm — OG muqova bo‘ladi)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{mediaUrls.length} / 3</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {mediaUrls.map((url, idx) => (
                  <div
                    key={url}
                    className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-[#24252f] bg-slate-950/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={coverImageAlt || `Rasm ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMediaUrls((p) => p.filter((_, i) => i !== idx))}
                      className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/75 text-white hover:bg-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {mediaUrls.length < 3 && (
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                    className="aspect-video rounded-xl border border-dashed border-slate-300 dark:border-[#2c2f3e] hover:border-[#3995ff] bg-slate-50 dark:bg-[#14151d] flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-[#3995ff] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#3995ff]" />
                    ) : (
                      <>
                        <Paperclip className="w-4 h-4" />
                        <span className="text-[11px] font-semibold">Rasm yuklash (WebP)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Link
                href={localePath("/dashboard")}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#24252f] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#101117]"
              >
                Bekor qilish
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || wordCount === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3995ff] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-sm disabled:opacity-40 cursor-pointer transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {editId
                        ? "O‘zgarishlarni Saqlash"
                        : status === "draft"
                        ? "Qoralama Sifatida Saqlash"
                        : "Chop Etish & Indekslash"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Live SEO Expert Assistant */}
          <div className="lg:col-span-4 lg:sticky lg:top-20">
            <SeoInspectorPanel
              contentKind={contentKind}
              locale={contentLocale}
              onLocaleChange={setContentLocale}
              category={category}
              onCategoryChange={setCategory}
              tagsInput={tagsInput}
              onTagsInputChange={setTagsInput}
              title={title}
              slug={slug}
              onSlugChange={(v) => {
                setSlugManuallyEdited(true);
                setSlug(generateSeoSlug(v));
              }}
              seoTitle={seoTitle}
              onSeoTitleChange={setSeoTitle}
              seoDescription={seoDescription}
              onSeoDescriptionChange={setSeoDescription}
              focusKeyword={focusKeyword}
              onFocusKeywordChange={setFocusKeyword}
              coverImageUrl={mediaUrls[0] || ""}
              coverImageAlt={coverImageAlt}
              onCoverImageAltChange={setCoverImageAlt}
              isIndexable={isIndexable}
              onIsIndexableChange={setIsIndexable}
              status={status}
              onStatusChange={setStatus}
              htmlContent={htmlSnapshot}
              videoUrl={videoUrl}
              chaptersCount={videoChapters.length}
            />
          </div>
        </form>
      )}
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#3995ff]" />
        </div>
      }
    >
      <StudioEditorWorkspace />
    </Suspense>
  );
}
