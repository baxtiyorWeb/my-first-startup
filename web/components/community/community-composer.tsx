"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Video,
  Paperclip,
  Send,
  Smile,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { CommunityAttachment, CommunityMessage } from "./types";
import { COMMUNITY_EMOJI_PICKER } from "./types";

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

interface CommunityComposerProps {
  replyTo: CommunityMessage | null;
  onCancelReply: () => void;
  onSend: (input: { content: string; attachments: CommunityAttachment[] }) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function attachmentKind(mime: string): CommunityAttachment["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

const MAX_BYTES: Record<CommunityAttachment["kind"], number> = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  file: 20 * 1024 * 1024,
};

export function CommunityComposer({
  replyTo,
  onCancelReply,
  onSend,
  onTyping,
  disabled,
}: CommunityComposerProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<CommunityAttachment[]>([]);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  const handleTyping = () => {
    onTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 2500);
  };

  const uploadOne = (file: File) =>
    new Promise<CommunityAttachment>((resolve, reject) => {
      const kind = attachmentKind(file.type);
      if (file.size > MAX_BYTES[kind]) {
        reject(
          new Error(
            `${file.name}: hajm ${formatBytes(MAX_BYTES[kind])} dan oshmasligi kerak`
          )
        );
        return;
      }

      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setUploading((prev) => [...prev, { id, name: file.name, progress: 0 }]);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "community");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.responseType = "json";

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploading((prev) =>
          prev.map((item) => (item.id === id ? { ...item, progress } : item))
        );
      };

      xhr.onload = () => {
        const payload = xhr.response;
        if (xhr.status >= 200 && xhr.status < 300 && payload?.data?.url) {
          setUploading((prev) => prev.filter((item) => item.id !== id));
          resolve({
            url: payload.data.url as string,
            kind,
            name: file.name.slice(0, 200),
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          });
        } else {
          const message =
            payload?.error?.message || `Yuklashda xatolik (HTTP ${xhr.status})`;
          setUploading((prev) =>
            prev.map((item) => (item.id === id ? { ...item, error: message } : item))
          );
          reject(new Error(message));
        }
      };

      xhr.onerror = () => {
        setUploading((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, error: "Tarmoq xatosi" } : item
          )
        );
        reject(new Error("Tarmoq xatosi"));
      };

      xhr.send(formData);
    });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 6 - attachments.length);
    for (const file of list) {
      try {
        const uploaded = await uploadOne(file);
        setAttachments((prev) => (prev.length >= 6 ? prev : [...prev, uploaded]));
      } catch {
        // error is displayed in the uploading chips
      }
    }
  };

  const submit = async () => {
    if (disabled || isSending) return;
    if (!content.trim() && attachments.length === 0) return;
    setIsSending(true);
    try {
      await onSend({ content, attachments });
      setContent("");
      setAttachments([]);
      setShowEmoji(false);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      onTyping(false);
      setTimeout(() => textareaRef.current?.focus(), 40);
    } finally {
      setIsSending(false);
    }
  };

  const hasPayload = Boolean(content.trim()) || attachments.length > 0;
  const isUploading = uploading.some((item) => !item.error);
  const canSend = hasPayload && !isSending && !isUploading;

  return (
    <div className="border-t border-white/[0.06] bg-[#0b0e14] px-3 py-3 sm:px-4">
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border border-teal-500/25 bg-teal-500/[0.07] px-3 py-2">
          <div className="mt-0.5 h-8 w-0.5 rounded-full bg-teal-400" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-teal-300">
              {replyTo.sender.name} ga javob
            </p>
            <p className="truncate text-[11.5px] text-zinc-400">
              {replyTo.content ||
                (replyTo.attachments[0]
                  ? `📎 ${replyTo.attachments[0].name}`
                  : "Ilova")}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Javobni bekor qilish"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {(attachments.length > 0 || uploading.length > 0) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={`${attachment.url}_${index}`}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5"
            >
              <span className="max-w-[180px] truncate text-[11.5px] text-zinc-300">
                {attachment.name}
              </span>
              <span className="text-[10px] text-zinc-500">
                {formatBytes(attachment.sizeBytes)}
              </span>
              <button
                type="button"
                aria-label={`${attachment.name} ni olib tashlash`}
                onClick={() =>
                  setAttachments((prev) => prev.filter((_, i) => i !== index))
                }
                className="rounded p-0.5 text-zinc-500 hover:text-rose-400"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {uploading.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5"
            >
              {item.error ? (
                <AlertCircle size={13} className="text-rose-400" />
              ) : (
                <Loader2 size={13} className="animate-spin text-teal-400" />
              )}
              <span className="max-w-[160px] truncate text-[11.5px] text-zinc-300">
                {item.name}
              </span>
              <span className="text-[10px] text-zinc-500">
                {item.error ? "xato" : `${item.progress}%`}
              </span>
              {item.error && (
                <button
                  type="button"
                  aria-label="Xatoni yopish"
                  onClick={() =>
                    setUploading((prev) => prev.filter((entry) => entry.id !== item.id))
                  }
                  className="rounded p-0.5 text-zinc-500 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-1.5 rounded-2xl border border-white/[0.08] bg-[#12161f] px-2 py-1.5 focus-within:border-teal-500/40">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Fayl biriktirish"
          title="Fayl biriktirish"
          className="mb-1 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-teal-300"
        >
          <Paperclip size={17} />
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          aria-label="Rasm yuklash"
          title="Rasm"
          className="mb-1 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-teal-300"
        >
          <ImagePlus size={17} />
        </button>
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          aria-label="Video yuklash"
          title="Video"
          className="mb-1 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-teal-300"
        >
          <Video size={17} />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          rows={1}
          disabled={disabled}
          onChange={(event) => {
            setContent(event.target.value);
            handleTyping();
            const target = event.target;
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Guruhga xabar yozing..."
          aria-label="Xabar matni"
          className="max-h-[140px] min-h-[34px] flex-1 resize-none bg-transparent px-1 py-2 text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />

        <div className="relative mb-1">
          <button
            type="button"
            onClick={() => setShowEmoji((prev) => !prev)}
            aria-label="Emoji tanlash"
            title="Emoji"
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-teal-300"
          >
            <Smile size={17} />
          </button>
          {showEmoji && (
            <div className="absolute bottom-10 right-0 z-30 grid w-64 grid-cols-7 gap-1 rounded-2xl border border-white/10 bg-[#12161f] p-2 shadow-2xl">
              {COMMUNITY_EMOJI_PICKER.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setContent((prev) => `${prev}${emoji}`);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-lg p-1.5 text-lg transition-colors hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canSend || disabled}
          aria-label="Xabarni yuborish"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-400 text-slate-950 transition-colors hover:bg-teal-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isSending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        multiple
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
