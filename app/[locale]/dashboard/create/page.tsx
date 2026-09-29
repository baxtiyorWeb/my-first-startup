"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  Code,
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
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import { compressAvatarImage } from "@/lib/image-compressor";

interface FloatingToolbarState {
  visible: boolean;
  top: number;
  left: number;
}

export default function CreatePostPage() {
  const router = useRouter();
  const { t, localePath } = useI18n();
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSavedTime, setDraftSavedTime] = useState<string>(() => t("create.draftStatus") || "Hozirgina");

  // Word count & reading time
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(1);

  // Link Modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalText, setLinkModalText] = useState("");
  const [linkModalUrl, setLinkModalUrl] = useState("");
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  // History stack for Undo / Redo
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Floating selection toolbar
  const [floatingToolbar, setFloatingToolbar] = useState<FloatingToolbarState>({
    visible: false,
    top: 0,
    left: 0,
  });

  // Active formats state for toolbar highlights
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

  // Update stats from editor text
  const updateEditorStats = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    setWordCount(words);
    setReadingTime(Math.max(1, Math.ceil(words / 180)));
  }, []);

  // Inspect DOM tree under current selection
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
        if (tag === "b" || tag === "strong" || node.style.fontWeight === "bold")
          result.bold = true;
        if (tag === "i" || tag === "em" || node.style.fontStyle === "italic")
          result.italic = true;
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
      // fallback
    }

    return result;
  }, []);

  // Save history snapshot
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

  // Initialize history on mount
  useEffect(() => {
    if (editorRef.current && historyRef.current.length === 0) {
      historyRef.current = [editorRef.current.innerHTML || ""];
      historyIndexRef.current = 0;
    }
  }, []);

  // Check selection and update floating toolbar position & active format states
  const checkSelection = useCallback(() => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();

    if (
      !selection ||
      selection.isCollapsed ||
      !editorRef.current ||
      !editorRef.current.contains(selection.anchorNode)
    ) {
      setFloatingToolbar((prev) =>
        prev.visible ? { ...prev, visible: false } : prev,
      );
      setActiveFormats(getActiveFormats());
      return;
    }

    const text = selection.toString().trim();
    if (text.length === 0) {
      setFloatingToolbar((prev) =>
        prev.visible ? { ...prev, visible: false } : prev,
      );
      setActiveFormats(getActiveFormats());
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const toolbarWidth = 340;
      const toolbarHeight = 40;
      const top = Math.max(8, rect.top - toolbarHeight - 6);
      const left = Math.max(
        8,
        Math.min(
          window.innerWidth - toolbarWidth - 8,
          rect.left + rect.width / 2 - toolbarWidth / 2,
        ),
      );

      setFloatingToolbar({
        visible: true,
        top,
        left,
      });

      setActiveFormats(getActiveFormats());
    } catch {
      setFloatingToolbar((prev) =>
        prev.visible ? { ...prev, visible: false } : prev,
      );
    }
  }, [getActiveFormats]);

  // Selection change listener
  useEffect(() => {
    const handleSelectionChange = () => {
      checkSelection();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    window.addEventListener("resize", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      window.removeEventListener("resize", handleSelectionChange);
    };
  }, [checkSelection]);

  // Auto-save draft timer simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`;
      setDraftSavedTime(timeStr);
    }, 1800);
    return () => clearTimeout(timer);
  }, [title, wordCount]);

  // Undo execution
  const executeUndo = useCallback(() => {
    if (!editorRef.current) return;
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      editorRef.current.innerHTML = historyRef.current[historyIndexRef.current];
      updateEditorStats();
      checkSelection();
      toast.info(t("create.undoToast") || "Amal bekor qilindi");
    } else {
      document.execCommand("undo");
      updateEditorStats();
      checkSelection();
    }
  }, [updateEditorStats, checkSelection, t]);

  // Redo execution
  const executeRedo = useCallback(() => {
    if (!editorRef.current) return;
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      editorRef.current.innerHTML = historyRef.current[historyIndexRef.current];
      updateEditorStats();
      checkSelection();
      toast.info(t("create.redoToast") || "Amal qaytarildi");
    } else {
      document.execCommand("redo");
      updateEditorStats();
      checkSelection();
    }
  }, [updateEditorStats, checkSelection, t]);

  // Open Link Modal dialog
  const openLinkModal = useCallback(() => {
    if (typeof window === "undefined" || !editorRef.current) return;
    const selection = window.getSelection();

    let initialText = "";
    let initialUrl = "";
    let rangeToSave: Range | null = null;

    if (
      selection &&
      selection.rangeCount > 0 &&
      editorRef.current.contains(selection.anchorNode)
    ) {
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
    setLinkModalUrl(initialUrl || "https://");
    setIsLinkModalOpen(true);
  }, []);

  // Format action execution
  const executeCommand = (
    command: string,
    value: string | undefined = undefined,
  ) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    saveHistory();

    const currentFormats = getActiveFormats();

    if (command === "undo") {
      executeUndo();
      return;
    }

    if (command === "redo") {
      executeRedo();
      return;
    }

    if (command === "bold") {
      document.execCommand("bold", false);
    } else if (command === "italic") {
      document.execCommand("italic", false);
    } else if (
      command === "formatBlock" &&
      (value === "<h2>" || value === "H2")
    ) {
      if (currentFormats.h2) {
        document.execCommand("formatBlock", false, "<p>");
      } else {
        document.execCommand("formatBlock", false, "<h2>");
      }
    } else if (
      command === "formatBlock" &&
      (value === "<h3>" || value === "H3")
    ) {
      if (currentFormats.h3) {
        document.execCommand("formatBlock", false, "<p>");
      } else {
        document.execCommand("formatBlock", false, "<h3>");
      }
    } else if (
      command === "formatBlock" &&
      (value === "<blockquote>" || value === "BLOCKQUOTE")
    ) {
      if (currentFormats.quote) {
        document.execCommand("formatBlock", false, "<p>");
      } else {
        document.execCommand("formatBlock", false, "<blockquote>");
      }
    } else if (command === "code") {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      if (currentFormats.code) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (
            node instanceof HTMLElement &&
            node.tagName.toLowerCase() === "code"
          ) {
            const parent = node.parentNode;
            if (parent) {
              while (node.firstChild)
                parent.insertBefore(node.firstChild, node);
              parent.removeChild(node);
            }
            break;
          }
          node = node.parentNode;
        }
      } else {
        const selectedText = selection.toString();
        if (selectedText) {
          const span = document.createElement("code");
          span.textContent = selectedText;
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(span);
          range.setStartAfter(span);
          range.setEndAfter(span);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          document.execCommand("insertHTML", false, "<code>kod</code>&nbsp;");
        }
      }
    } else if (command === "highlight") {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      if (currentFormats.highlight) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (
            node instanceof HTMLElement &&
            node.tagName.toLowerCase() === "mark"
          ) {
            const parent = node.parentNode;
            if (parent) {
              while (node.firstChild)
                parent.insertBefore(node.firstChild, node);
              parent.removeChild(node);
            }
            break;
          }
          node = node.parentNode;
        }
      } else {
        const selectedText = selection.toString();
        if (selectedText) {
          const mark = document.createElement("mark");
          mark.textContent = selectedText;
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(mark);
        }
      }
    } else if (command === "clearFormat") {
      document.execCommand("removeFormat", false);
      document.execCommand("formatBlock", false, "<p>");
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (
            node instanceof HTMLElement &&
            (node.tagName.toLowerCase() === "code" ||
              node.tagName.toLowerCase() === "mark")
          ) {
            const parent = node.parentNode;
            if (parent) {
              while (node.firstChild)
                parent.insertBefore(node.firstChild, node);
              parent.removeChild(node);
            }
          }
          node = node.parentNode;
        }
      }
      toast.info(t("create.formatClearedToast") || "Formatlash tozalandi");
    } else if (command === "link") {
      openLinkModal();
      return;
    } else {
      document.execCommand(command, false, value);
    }

    saveHistory();
    updateEditorStats();
    checkSelection();
  };

  // Apply Link from Modal
  const handleApplyLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorRef.current) return;

    let targetUrl = linkModalUrl.trim();
    if (!targetUrl) {
      toast.error(t("create.linkModalUrlRequired") || "Iltimos, havola manzilini kiriting");
      return;
    }

    if (!/^https?:\/\//i.test(targetUrl) && !targetUrl.startsWith("/")) {
      targetUrl = `https://${targetUrl}`;
    }

    editorRef.current.focus();

    if (savedRange && window.getSelection()) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
    }
    const displayText = linkModalText.trim() || targetUrl;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      document.execCommand("createLink", false, targetUrl);

      const anchors = editorRef.current.getElementsByTagName("a");
      for (let i = 0; i < anchors.length; i++) {
        if (anchors[i].getAttribute("href") === targetUrl) {
          anchors[i].setAttribute("target", "_blank");
          anchors[i].setAttribute("rel", "noopener noreferrer");
        }
      }
    } else {
      const linkHtml = `<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-700">${displayText}</a>&nbsp;`;
      document.execCommand("insertHTML", false, linkHtml);
    }

    saveHistory();
    updateEditorStats();
    checkSelection();
    setIsLinkModalOpen(false);
    toast.success(t("create.linkAddedToast") || "Havola qo‘shildi");
  };

  // Remove Link from Modal
  const handleRemoveLink = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    if (savedRange && window.getSelection()) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
    }

    document.execCommand("unlink", false);
    saveHistory();
    updateEditorStats();
    checkSelection();
    setIsLinkModalOpen(false);
    toast.info(t("create.linkRemovedToast") || "Havola olib tashlandi");
  };

  // Smart paste: Auto-convert raw URL strings into clickable HTML links
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");

    if (/^https?:\/\/[^\s]+$/i.test(text.trim())) {
      const url = text.trim();
      const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-700">${url}</a>&nbsp;`;
      document.execCommand("insertHTML", false, linkHtml);
    } else {
      document.execCommand("insertText", false, text);
    }

    saveHistory();
    updateEditorStats();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mediaUrls.length + files.length > 3) {
      toast.error(
        t("project.maxImagesError") ||
          "Ko‘pi bilan 3 tagacha rasm yuklash mumkin",
      );
      return;
    }

    setIsUploadingImage(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          toast.error(
            t("project.imageSizeError") ||
              "Rasm hajmi 10MB dan oshmasligi kerak",
          );
          continue;
        }

        const compressedBlob = await compressAvatarImage(file);
        const compressedFile = new File(
          [compressedBlob],
          `post-${Date.now()}-${i}.webp`,
          {
            type: "image/webp",
          },
        );

        const uploadRes = await api.upload.uploadFile(
          compressedFile,
          "projects",
        );
        newUrls.push(uploadRes.url);
      }

      setMediaUrls((prev) => [...prev, ...newUrls].slice(0, 3));
    } catch {
      toast.error(
        t("create.errorPublishing") || "Rasmni yuklashda xatolik yuz berdi",
      );
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setMediaUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plainText = editorRef.current?.innerText.trim() || "";
    let htmlContent = editorRef.current?.innerHTML.trim() || "";

    if (!plainText) {
      toast.error(
        t("create.contentRequired") || "Iltimos, post matnini kiriting",
      );
      editorRef.current?.focus();
      return;
    }

    // Normalize empty line breaks from various browsers (Chrome div breaks)
    htmlContent = htmlContent
      .replace(/<div><br\s*\/?><\/div>/gi, "<p><br /></p>")
      .replace(/<div>(.*?)<\/div>/gi, "<p>$1</p>")
      .replace(/<p><\/p>/gi, "<p><br /></p>");

    // Auto-detect the first URL in content (from <a> tags or raw text) for projectUrl metadata
    let autoDetectedUrl: string | undefined = undefined;
    const anchorMatch = htmlContent.match(/href=["'](https?:\/\/[^"']+)["']/i);
    if (anchorMatch && anchorMatch[1]) {
      autoDetectedUrl = anchorMatch[1];
    } else {
      const urlMatch = plainText.match(/https?:\/\/[^\s"<]+/i);
      if (urlMatch && urlMatch[0]) {
        autoDetectedUrl = urlMatch[0];
      }
    }

    setIsSubmitting(true);

    try {
      await api.posts.createPost({
        title: title.trim() || undefined,
        content: htmlContent || plainText,
        postType: "thought",
        projectUrl: autoDetectedUrl,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      });

      toast.success(
        t("create.successPublished") || "Post muvaffaqiyatli chop etildi!",
      );
      router.push(localePath("/dashboard"));
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : t("create.errorPublishing") || "Chop etishda xatolik yuz berdi";
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3.5 py-1 text-slate-800 dark:text-slate-200">
      {/* 1. Header & Quick Status */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <Link
            href={localePath("/dashboard")}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors flex items-center gap-1 rounded-lg px-2 py-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>{t("create.backToDashboard") || "Lentaga qaytish"}</span>
          </Link>

          <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">
            |
          </span>

          
        </div>

        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">
          {wordCount} {t("create.words") || "so‘z"} • ~{readingTime}{" "}
          {t("create.readingTime") || "min"}
        </div>
      </div>

      {/* 2. Floating Selection Toolbar (WYSIWYG bubble) */}
      {floatingToolbar.visible && (
        <div
          role="toolbar"
          aria-label={t("create.editorFormattingTools") || "Formatlash asboblari"}
          style={{
            position: "fixed",
            top: `${floatingToolbar.top}px`,
            left: `${floatingToolbar.left}px`,
            zIndex: 60,
          }}
          className="flex items-center gap-0.5 p-1 rounded-xl bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 shadow-xl backdrop-blur-md border border-slate-800 dark:border-slate-200 animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          {/* Bold */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("bold");
            }}
            title={t("create.editorBold") || "Qalin (Ctrl+B)"}
            aria-label={t("create.editorBoldAria") || "Qalin matn"}
            className={`p-1 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.bold
                ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                : ""
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("italic");
            }}
            title={t("create.editorItalic") || "Kursiv (Ctrl+I)"}
            aria-label={t("create.editorItalicAria") || "Kursiv matn"}
            className={`p-1 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.italic
                ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                : ""
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-slate-700 dark:bg-slate-300 mx-0.5" />

          {/* Heading 2 */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("formatBlock", "<h2>");
            }}
            title={t("create.editorH2") || "Sarlavha (H2)"}
            aria-label={t("create.editorH2Aria") || "Sarlavha formati"}
            className={`px-1.5 py-0.5 text-[11px] font-bold rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.h2
                ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                : ""
            }`}
          >
            H2
          </button>

          {/* Quote */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("formatBlock", "<blockquote>");
            }}
            title={t("create.editorQuote") || "Iqtibos bloki"}
            aria-label={t("create.editorQuoteAria") || "Iqtibos bloki"}
            className={`p-1 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.quote
                ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                : ""
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          {/* Highlight Marker */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("highlight");
            }}
            title={t("create.editorHighlight") || "Belgilash (Sariq fon)"}
            aria-label={t("create.editorHighlightAria") || "Matnni belgilash"}
            className={`p-1 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.highlight ? "bg-amber-400 text-slate-950" : ""
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          {/* Code */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("code");
            }}
            title={t("create.editorCode") || "Kod"}
            aria-label={t("create.editorCodeAria") || "Kod formati"}
            className={`p-1 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.code
                ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                : ""
            }`}
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          {/* Link */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("link");
            }}
            title={t("create.editorLink") || "Havola (Ctrl+K)"}
            aria-label={t("create.editorLinkAria") || "Havola kiritish"}
            className={`p-1 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.link
                ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                : ""
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Link2 className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {t("create.linkModalTitle") || "Havola (link) qo‘shish"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleApplyLink} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  {t("create.linkModalTextLabel") || "Matn (Nima deb ko‘rinsin)"}
                </label>
                <input
                  type="text"
                  value={linkModalText}
                  onChange={(e) => setLinkModalText(e.target.value)}
                  placeholder={t("create.linkModalTextPlaceholder") || "Masalan: Maqola manbasi"}
                  className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  {t("create.linkModalUrlLabel") || "Havola manzili (URL) *"}
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={linkModalUrl}
                    onChange={(e) => setLinkModalUrl(e.target.value)}
                    placeholder={t("create.linkModalUrlPlaceholder") || "https://example.com"}
                    className="w-full h-8 pl-8 pr-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {activeFormats.link ? (
                  <button
                    type="button"
                    onClick={handleRemoveLink}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    {t("common.delete") || "O‘chirish"}
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsLinkModalOpen(false)}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {t("common.cancel") || "Bekor qilish"}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                  >
                    {t("common.save") || "Saqlash"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Main Post Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Post Title Field */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("create.postTitlePlaceholder") || "Post sarlavhasi (ixtiyoriy)..."}
            className="w-full text-sm sm:text-base font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 placeholder:text-xs text-xs sm:text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all"
          />
        </div>

        {/* Compact WYSIWYG Editor Container */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          {/* Editor Top Toolbar */}
          <div className="flex items-center flex-wrap gap-0.5 p-1 sm:p-1.5 bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800">
            {/* Undo / Redo */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeUndo();
              }}
              title={t("create.editorUndo") || "Bekor qilish (Ctrl+Z)"}
              aria-label={t("create.editorUndoAria") || "Orqaga qaytarish"}
              className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeRedo();
              }}
              title={t("create.editorRedo") || "Qaytarish (Ctrl+Y)"}
              aria-label={t("create.editorRedoAria") || "Oldinga qaytarish"}
              className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Bold */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("bold");
              }}
              title={t("create.editorBold") || "Qalin matn (Ctrl+B)"}
              aria-label={t("create.editorBoldAria") || "Qalin matn"}
              className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                activeFormats.bold
                  ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white font-bold"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("italic");
              }}
              title={t("create.editorItalic") || "Kursiv matn (Ctrl+I)"}
              aria-label={t("create.editorItalicAria") || "Kursiv matn"}
              className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                activeFormats.italic
                  ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Headings */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("formatBlock", "<h2>");
              }}
              title={t("create.editorH2") || "Katta sarlavha (H2)"}
              aria-label={t("create.editorH2Aria") || "Katta sarlavha"}
              className={`px-1.5 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-[11px] font-bold flex items-center gap-0.5 ${
                activeFormats.h2
                  ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Heading2 className="w-3.5 h-3.5" />
              <span>H2</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("formatBlock", "<h3>");
              }}
              title={t("create.editorH3") || "O‘rtacha sarlavha (H3)"}
              aria-label={t("create.editorH3Aria") || "O‘rtacha sarlavha"}
              className={`px-1.5 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-[11px] font-bold flex items-center gap-0.5 ${
                activeFormats.h3
                  ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Heading3 className="w-3.5 h-3.5" />
              <span>H3</span>
            </button>

            {/* Quote */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("formatBlock", "<blockquote>");
              }}
              title={t("create.editorQuote") || "Iqtibos bloki"}
              aria-label={t("create.editorQuoteAria") || "Iqtibos bloki"}
              className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                activeFormats.quote
                  ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            {/* Lists */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("insertUnorderedList");
              }}
              title={t("create.editorBulletList") || "Nuqtali ro‘yxat"}
              aria-label={t("create.editorBulletListAria") || "Nuqtali ro‘yxat"}
              className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                activeFormats.ul
                  ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("insertOrderedList");
              }}
              title={t("create.editorNumberedList") || "Raqamli ro‘yxat"}
              aria-label={t("create.editorNumberedListAria") || "Raqamli ro‘yxat"}
              className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                activeFormats.ol
                  ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Highlight */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("highlight");
              }}
              title={t("create.editorHighlight") || "Matnni belgilash (Sariq fon)"}
              aria-label={t("create.editorHighlightAria") || "Matnni belgilash"}
              className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                activeFormats.highlight
                  ? "bg-amber-400 text-slate-950 font-bold"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>

            {/* Code */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("code");
              }}
              title={t("create.editorCode") || "Kod formati"}
              aria-label={t("create.editorCodeAria") || "Kod formati"}
              className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer font-mono ${
                activeFormats.code
                  ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
            </button>

            {/* Link Modal Trigger Button */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("link");
              }}
              title={t("create.editorLink") || "Havola qo‘shish (Ctrl+K)"}
              aria-label={t("create.editorLinkAria") || "Havola qo‘shish"}
              className={`p-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                activeFormats.link
                  ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                  : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold hidden sm:inline">
                {t("create.editorLinkText") || "Havola"}
              </span>
            </button>

            {/* Clear Formatting */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("clearFormat");
              }}
              title={t("create.editorClearFormat") || "Formatni tozalash"}
              aria-label={t("create.editorClearFormatAria") || "Formatni tozalash"}
              className="p-1 rounded-md text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>

            <span className="hidden md:inline-block ml-auto text-[11px] font-medium text-slate-400 dark:text-slate-500 pr-1 select-none">
              {t("create.editorLinkShortcut") || "Ctrl+K havola"}
            </span>
          </div>

          {/* In-Place WYSIWYG ContentEditable Surface */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onFocus={() => {
              try {
                document.execCommand("defaultParagraphSeparator", false, "p");
              } catch {
                // Ignore
              }
            }}
            onInput={() => {
              updateEditorStats();
              saveHistory();
            }}
            onKeyUp={checkSelection}
            onMouseUp={checkSelection}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                openLinkModal();
              } else if (
                (e.metaKey || e.ctrlKey) &&
                e.key.toLowerCase() === "z"
              ) {
                e.preventDefault();
                if (e.shiftKey) {
                  executeRedo();
                } else {
                  executeUndo();
                }
              } else if (
                (e.metaKey || e.ctrlKey) &&
                e.key.toLowerCase() === "y"
              ) {
                e.preventDefault();
                executeRedo();
              } else if (
                (e.metaKey || e.ctrlKey) &&
                e.key.toLowerCase() === "b"
              ) {
                e.preventDefault();
                executeCommand("bold");
              } else if (
                (e.metaKey || e.ctrlKey) &&
                e.key.toLowerCase() === "i"
              ) {
                e.preventDefault();
                executeCommand("italic");
              }
            }}
            data-placeholder={t("create.editorPlaceholder") || "O‘z g‘oyangiz, maqsadingiz yoki tahlilingizni yozing..."}
            className="gogetters-rich-editor p-3.5 sm:p-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 cursor-text min-h-[220px]"
          />
        </div>

        {/* Image Attachments Section */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                {t("create.imagesLabel") || "Rasmlar (ko‘pi bilan 3 ta)"}
              </label>
            </div>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {mediaUrls.length} / 3
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {mediaUrls.map((url, idx) => (
              <div
                key={url}
                className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group bg-slate-950/5 dark:bg-slate-950/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-35 pointer-events-none transform-gpu"
                />

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${t("create.image") || "Rasm"} ${idx + 1}`}
                  className="relative z-10 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 transform-gpu"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute z-20 top-1 right-1 p-0.5 rounded bg-slate-950/75 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                  title={t("common.delete") || "O‘chirish"}
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
                className="aspect-video rounded-lg border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-white dark:bg-slate-800/40 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[10px] font-medium">
                      {t("common.loading") || "Yuklanmoqda..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-semibold">
                      {t("create.attachImage") || "Rasm biriktirish"}
                    </span>
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

        {/* Bottom Action Bar */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <Link
            href={localePath("/dashboard")}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium cursor-pointer transition-colors"
          >
            {t("common.cancel") || "Bekor qilish"}
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || wordCount === 0}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("create.publishing") || "Chop etilmoqda..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t("create.publish") || "Chop etish"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
