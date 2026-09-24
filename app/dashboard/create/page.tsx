"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bold,
  Italic,
  Heading2,
  Quote,
  Code,
  List,
  ListOrdered,
  Link2,
  Highlighter,
  Undo2,
  Redo2,
  Check,
  ArrowLeft,
  Eraser,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";

interface FloatingToolbarState {
  visible: boolean;
  top: number;
  left: number;
}

export default function CreatePostPage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSavedTime, setDraftSavedTime] = useState<string>("Hozirgina");

  // Word count & reading time
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(1);

  // History stack for bulletproof Undo / Redo
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
    quote: false,
    code: false,
    highlight: false,
    ul: false,
    ol: false,
  });

  // Update stats from editor text
  const updateEditorStats = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    setWordCount(words);
    setReadingTime(Math.max(1, Math.ceil(words / 180)));
  }, []);

  // Accurately inspect DOM tree under selection
  const getActiveFormats = useCallback(() => {
    const result = {
      bold: false,
      italic: false,
      h2: false,
      quote: false,
      code: false,
      highlight: false,
      ul: false,
      ol: false,
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
        if (tag === "blockquote") result.quote = true;
        if (tag === "code") result.code = true;
        if (tag === "mark") result.highlight = true;
        if (tag === "ul") result.ul = true;
        if (tag === "ol") result.ol = true;
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

    // Discard any redo states ahead of current index
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
      setFloatingToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      setActiveFormats(getActiveFormats());
      return;
    }

    const text = selection.toString().trim();
    if (text.length === 0) {
      setFloatingToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      setActiveFormats(getActiveFormats());
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Floating toolbar width estimate ~360px, height ~44px
      const toolbarWidth = 360;
      const toolbarHeight = 44;
      const top = Math.max(12, rect.top - toolbarHeight - 8);
      const left = Math.max(
        12,
        Math.min(window.innerWidth - toolbarWidth - 12, rect.left + rect.width / 2 - toolbarWidth / 2)
      );

      setFloatingToolbar({
        visible: true,
        top,
        left,
      });

      setActiveFormats(getActiveFormats());
    } catch {
      setFloatingToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
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
        now.getMinutes()
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
      toast.info("Amal bekor qilindi (Undo)");
    } else {
      document.execCommand("undo");
      updateEditorStats();
      checkSelection();
    }
  }, [updateEditorStats, checkSelection]);

  // Redo execution
  const executeRedo = useCallback(() => {
    if (!editorRef.current) return;
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      editorRef.current.innerHTML = historyRef.current[historyIndexRef.current];
      updateEditorStats();
      checkSelection();
      toast.info("Amal qaytarildi (Redo)");
    } else {
      document.execCommand("redo");
      updateEditorStats();
      checkSelection();
    }
  }, [updateEditorStats, checkSelection]);

  // Format action execution with full TOGGLE capability
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    // 1. Record snapshot before change
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
    } else if (command === "formatBlock" && (value === "<h2>" || value === "H2")) {
      if (currentFormats.h2) {
        // Toggle OFF: convert back to standard paragraph
        document.execCommand("formatBlock", false, "<p>");
      } else {
        // Toggle ON
        document.execCommand("formatBlock", false, "<h2>");
      }
    } else if (command === "formatBlock" && (value === "<blockquote>" || value === "BLOCKQUOTE")) {
      if (currentFormats.quote) {
        // Toggle OFF: convert back to standard paragraph
        document.execCommand("formatBlock", false, "<p>");
      } else {
        // Toggle ON
        document.execCommand("formatBlock", false, "<blockquote>");
      }
    } else if (command === "code") {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      if (currentFormats.code) {
        // Toggle OFF: unwrap <code>
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node instanceof HTMLElement && node.tagName.toLowerCase() === "code") {
            const parent = node.parentNode;
            if (parent) {
              while (node.firstChild) parent.insertBefore(node.firstChild, node);
              parent.removeChild(node);
            }
            break;
          }
          node = node.parentNode;
        }
      } else {
        // Toggle ON
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
        // Toggle OFF: unwrap <mark>
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node instanceof HTMLElement && node.tagName.toLowerCase() === "mark") {
            const parent = node.parentNode;
            if (parent) {
              while (node.firstChild) parent.insertBefore(node.firstChild, node);
              parent.removeChild(node);
            }
            break;
          }
          node = node.parentNode;
        }
      } else {
        // Toggle ON
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
      // Clear all formats: bold, italic, marks, code, and reset block to paragraph
      document.execCommand("removeFormat", false);
      document.execCommand("formatBlock", false, "<p>");
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (
            node instanceof HTMLElement &&
            (node.tagName.toLowerCase() === "code" || node.tagName.toLowerCase() === "mark")
          ) {
            const parent = node.parentNode;
            if (parent) {
              while (node.firstChild) parent.insertBefore(node.firstChild, node);
              parent.removeChild(node);
            }
          }
          node = node.parentNode;
        }
      }
      toast.info("Formatlash tozalandi");
    } else if (command === "link") {
      const currentUrl = document.queryCommandValue("createLink");
      const url = window.prompt("Havola manzilini kiriting (URL):", currentUrl || "https://");
      if (url && url !== "https://") {
        document.execCommand("createLink", false, url);
      }
    } else {
      document.execCommand(command, false, value);
    }

    // 2. Record snapshot after change
    saveHistory();
    updateEditorStats();
    checkSelection();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    saveHistory();
    updateEditorStats();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plainText = editorRef.current?.innerText.trim() || "";
    const htmlContent = editorRef.current?.innerHTML.trim() || "";

    if (!plainText) {
      toast.error("Iltimos, fikr matnini kiriting");
      editorRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      await api.posts.createPost({
        title: title.trim() || undefined,
        content: htmlContent || plainText,
      });

      toast.success("Fikringiz muvaffaqiyatli ulashildi!");
      router.push("/dashboard");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Fikrni ulashishda xatolik yuz berdi";
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* 1. Top Navigation & Draft Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1 py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Bosh sahifaga qaytish</span>
          </Link>

          <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">|</span>

          {/* Auto-save draft pill */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Qoralama saqlandi ({draftSavedTime})</span>
          </div>
        </div>

        {/* Word count & Reading time indicator */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {wordCount} so‘z • ~{readingTime} daqiqa mutolaa
        </div>
      </div>

      {/* 2. Floating Selection Toolbar (WYSIWYG bubble) */}
      {floatingToolbar.visible && (
        <div
          role="toolbar"
          aria-label="Matnni formatlash asboblari"
          style={{
            position: "fixed",
            top: `${floatingToolbar.top}px`,
            left: `${floatingToolbar.left}px`,
            zIndex: 60,
          }}
          className="flex items-center gap-0.5 p-1 rounded-lg bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 shadow-xl backdrop-blur-sm border border-slate-800 dark:border-slate-200 animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          {/* Bold */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("bold");
            }}
            title="Qalin (Ctrl+B) — bosilsa yoqiladi / o‘chiriladi"
            aria-label="Qalin matn"
            className={`p-1.5 rounded hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.bold ? "bg-slate-800 dark:bg-slate-200 text-amber-400 dark:text-amber-600" : ""
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
            title="Kursiv (Ctrl+I) — bosilsa yoqiladi / o‘chiriladi"
            aria-label="Kursiv matn"
            className={`p-1.5 rounded hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.italic ? "bg-slate-800 dark:bg-slate-200 text-amber-400 dark:text-amber-600" : ""
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-slate-700 dark:bg-slate-300 mx-0.5" />

          {/* Heading 2 */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("formatBlock", "<h2>");
            }}
            title="Sarlavha (H2) — bosilsa yoqiladi / o‘chiriladi"
            aria-label="Sarlavha formati"
            className={`px-1.5 py-1 text-xs font-bold rounded hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.h2 ? "bg-slate-800 dark:bg-slate-200 text-amber-400 dark:text-amber-600" : ""
            }`}
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          {/* Quote */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("formatBlock", "<blockquote>");
            }}
            title="Iqtibos bloki — bosilsa yoqiladi / o‘chiriladi"
            aria-label="Iqtibos bloki"
            className={`p-1.5 rounded hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.quote ? "bg-slate-800 dark:bg-slate-200 text-amber-400 dark:text-amber-600" : ""
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
            title="Belgilash (Sariq fon) — bosilsa yoqiladi / o‘chiriladi"
            aria-label="Matnni belgilash"
            className={`p-1.5 rounded hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.highlight ? "bg-slate-800 dark:bg-slate-200 text-amber-400 dark:text-amber-600" : ""
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
            title="Kod — bosilsa yoqiladi / o‘chiriladi"
            aria-label="Kod formati"
            className={`p-1.5 rounded hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer ${
              activeFormats.code ? "bg-slate-800 dark:bg-slate-200 text-amber-400 dark:text-amber-600" : ""
            }`}
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          {/* Clear Format */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("clearFormat");
            }}
            title="Formatni tozalash"
            aria-label="Formatni tozalash"
            className="p-1.5 rounded hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer text-slate-300 dark:text-slate-700 hover:text-white dark:hover:text-slate-900"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          {/* Link */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("link");
            }}
            title="Havola (URL)"
            aria-label="Havola kiritish"
            className="p-1.5 rounded hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Main Form without category selector */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Optional Title for analytical essays */}
        <div className="space-y-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Fikr sarlavhasi (ixtiyoriy, tahliliy mavzular uchun)..."
            className="w-full text-base sm:text-lg font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
          />
        </div>

        {/* 4. Top Quick Formatting Toolbar */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <div className="flex items-center flex-wrap gap-1 p-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
            {/* Undo / Redo */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeUndo();
              }}
              title="Bekor qilish (Ctrl+Z)"
              aria-label="Orqaga qaytarish"
              className="p-1.5 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeRedo();
              }}
              title="Qaytarish (Ctrl+Y)"
              aria-label="Oldinga qaytarish"
              className="p-1.5 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Bold */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("bold");
              }}
              title="Qalin (Ctrl+B) — bosilsa yoqiladi / o‘chiriladi"
              aria-label="Qalin matn"
              className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer font-bold ${
                activeFormats.bold
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-950 dark:text-white"
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
              title="Kursiv (Ctrl+I) — bosilsa yoqiladi / o‘chiriladi"
              aria-label="Kursiv matn"
              className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer italic ${
                activeFormats.italic
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-950 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Heading 2 */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("formatBlock", "<h2>");
              }}
              title="Katta sarlavha (H2) — bosilsa yoqiladi / o‘chiriladi"
              aria-label="Sarlavha kiritish"
              className={`px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1 ${
                activeFormats.h2
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-950 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Heading2 className="w-3.5 h-3.5" />
              <span>H2</span>
            </button>

            {/* Quote */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("formatBlock", "<blockquote>");
              }}
              title="Iqtibos bloki — bosilsa yoqiladi / o‘chiriladi"
              aria-label="Iqtibos bloki kiritish"
              className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer ${
                activeFormats.quote
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-950 dark:text-white"
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
              title="Nuqtali ro‘yxat"
              aria-label="Nuqtali ro‘yxat kiritish"
              className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer ${
                activeFormats.ul
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-950 dark:text-white"
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
              title="Raqamli ro‘yxat"
              aria-label="Raqamli ro‘yxat kiritish"
              className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer ${
                activeFormats.ol
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-950 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Highlight */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("highlight");
              }}
              title="Matnni belgilash — bosilsa yoqiladi / o‘chiriladi"
              aria-label="Matnni belgilash"
              className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer ${
                activeFormats.highlight
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-950 dark:text-white"
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
              title="Kod formati — bosilsa yoqiladi / o‘chiriladi"
              aria-label="Kod kiritish"
              className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer font-mono ${
                activeFormats.code
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-950 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
            </button>

            {/* Clear Formatting */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("clearFormat");
              }}
              title="Formatni tozalash (Oddiy matnga qaytarish)"
              aria-label="Formatni tozalash"
              className="p-1.5 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer flex items-center gap-1 text-xs"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Tozalash</span>
            </button>

            {/* Link */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("link");
              }}
              title="Havola (URL)"
              aria-label="Havola qo‘shish"
              className="p-1.5 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>

            {/* Selection hint */}
            <span className="hidden md:inline-block ml-auto text-[11px] text-slate-400 dark:text-slate-500 pr-2 select-none">
              Ctrl+Z bekor qilish • Matnni belgilab ham formatlashingiz mumkin
            </span>
          </div>

          {/* 5. In-Place WYSIWYG ContentEditable Surface */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => {
              updateEditorStats();
              saveHistory();
            }}
            onKeyUp={checkSelection}
            onMouseUp={checkSelection}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                if (e.shiftKey) {
                  executeRedo();
                } else {
                  executeUndo();
                }
              } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
                e.preventDefault();
                executeRedo();
              } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
                e.preventDefault();
                executeCommand("bold");
              } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
                e.preventDefault();
                executeCommand("italic");
              }
            }}
            data-placeholder="O‘z fikringiz, amaliy tajribangiz yoki tahlilingizni to‘liq bayon qiling... Bu yerda shovqin emas, chuqur mulohaza va amaliy bilim qadrlanadi."
            className="fikr-rich-editor p-4 sm:p-5 text-slate-900 dark:text-slate-100 cursor-text"
          />
        </div>


        {/* Bottom Actions Bar */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium cursor-pointer transition-colors"
          >
            Bekor qilish
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                toast.info("Qoralama saqlab qo‘yildi");
              }}
              className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
            >
              Qoralama sifatida saqlash
            </button>

            <button
              type="submit"
              disabled={isSubmitting || wordCount === 0}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs"
            >
              {isSubmitting ? (
                <span>Yuklanmoqda...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Fikrni ulashish</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
