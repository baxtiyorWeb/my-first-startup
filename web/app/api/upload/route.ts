import { type NextRequest } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/server/common/auth-guard";
import { uploadToBunny } from "@/server/common/storage";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import { extractVideoDurationSeconds, isShortVideoDuration } from "@/server/common/video-metadata";
import { db } from "@/server/db";
import { media } from "@/server/db/schema";

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["audio/mpeg", "mp3"],
  ["audio/mp3", "mp3"],
  ["audio/mp4", "m4a"],
  ["audio/wav", "wav"],
  ["audio/webm", "webm"],
  ["audio/ogg", "ogg"],
  ["video/mp4", "mp4"],
  ["video/quicktime", "mov"],
  ["video/webm", "webm"],
  // Community chat documents
  ["application/pdf", "pdf"],
  ["application/zip", "zip"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.ms-powerpoint", "ppt"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
  ["text/plain", "txt"],
  ["text/csv", "csv"],
]);

const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);
const MAX_IMAGE_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024; // 20MB

function validateMagicBytes(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;

  switch (mime) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "image/gif":
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );
    case "image/webp":
      return (
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
      );
    case "audio/mpeg":
    case "audio/mp3":
      return (
        buffer.toString("ascii", 0, 3) === "ID3" ||
        (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
      );
    case "audio/wav":
      return (
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WAVE"
      );
    case "audio/ogg":
      return buffer.toString("ascii", 0, 4) === "OggS";
    case "audio/mp4":
    case "video/mp4":
    case "video/quicktime":
      return buffer.toString("ascii", 4, 8) === "ftyp";
    case "audio/webm":
    case "video/webm":
      return (
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
      );
    case "application/pdf":
      return buffer.toString("ascii", 0, 4) === "%PDF";
    case "application/zip":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      // OOXML containers are ZIP archives
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    case "application/msword":
    case "application/vnd.ms-excel":
    case "application/vnd.ms-powerpoint":
      // Legacy Office compound files
      return (
        buffer[0] === 0xd0 &&
        buffer[1] === 0xcf &&
        buffer[2] === 0x11 &&
        buffer[3] === 0xe0
      );
    case "text/plain":
    case "text/csv":
      // Plain text must not contain NUL bytes (binary disguised as text)
      return !buffer.includes(0);
    default:
      return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    // Rate limiting: max 30 uploads per 10 minutes per user
    enforceRateLimit(`upload:${authUser.userId}`, 30, 600);

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      throw AppError.badRequest(
        "Yuklanayotgan fayl hajmi ruxsat etilgan chegaradan oshdi yoki format noto'g'ri"
      );
    }
    const file = formData.get("file") as File | null;
    const requestedFolder = (formData.get("folder") as string) || "uploads";

    if (!file || !(file instanceof File)) {
      throw AppError.badRequest("Yuklash uchun fayl tanlanmagan");
    }

    const safeExtension = ALLOWED_MIME_TYPES.get(file.type);
    if (!safeExtension) {
      throw AppError.badRequest(
        "Faqat rasm (JPEG, PNG, WebP, GIF), audio yoki video (MP4, MOV, WebM) fayllari qabul qilinadi"
      );
    }

    const isVideo = VIDEO_MIME_TYPES.has(file.type);
    const isDocument = DOCUMENT_MIME_TYPES.has(file.type);
    const maxBytes = isVideo
      ? MAX_VIDEO_BYTES
      : isDocument
        ? MAX_DOCUMENT_BYTES
        : MAX_IMAGE_AUDIO_BYTES;
    if (file.size > maxBytes) {
      throw AppError.badRequest(
        isVideo
          ? "Video hajmi 50MB dan oshmasligi kerak"
          : isDocument
            ? "Hujjat hajmi 20MB dan oshmasligi kerak"
            : "Fayl hajmi 10MB dan oshmasligi kerak"
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Cryptographic & magic bytes file signature validation
    const isValidSignature = validateMagicBytes(buffer, file.type);
    if (!isValidSignature) {
      throw AppError.badRequest("Fayl tarkibi ko'rsatilgan formatga mos kelmadi");
    }

    let durationSeconds: number | null = null;
    if (isVideo) {
      durationSeconds = extractVideoDurationSeconds(buffer, file.type);
      if (durationSeconds === null || durationSeconds <= 0) {
        throw AppError.badRequest("Video davomiyligini aniqlab bo'lmadi. Yaroqli MP4/MOV/WebM fayl yuklang");
      }
    }

    const isShort = isVideo ? isShortVideoDuration(durationSeconds) : false;

    const uniqueId = crypto.randomUUID().slice(0, 8);
    const safeTimestamp = Date.now();
    const safeFileName = `${safeTimestamp}-${uniqueId}.${safeExtension}`;
    const defaultFolder = isVideo ? (isShort ? "shorts" : "videos") : "uploads";
    const cleanFolder = requestedFolder.replace(/[^a-zA-Z0-9_-]/g, "") || defaultFolder;

    const result = await uploadToBunny(buffer, safeFileName, file.type, cleanFolder);

    const mediaType = isVideo
      ? "video"
      : file.type.startsWith("image/")
        ? "image"
        : isDocument
          ? "file"
          : "file";
    await db
      .insert(media)
      .values({
        title: file.name ? file.name.slice(0, 255) : safeFileName,
        mediaType,
        url: result.url,
        storagePath: result.path,
        mimeType: file.type,
        fileExtension: safeExtension.toUpperCase(),
        fileSizeBytes: file.size,
        durationSeconds,
        collectionName: isVideo ? (isShort ? "shorts" : "videos") : cleanFolder,
        uploadedBy: authUser.userId,
      })
      .catch((err) => {
        console.warn("[UPLOAD] Could not persist media metadata row:", err);
      });

    return successResponse(
      {
        url: result.url,
        path: result.path,
        fileName: safeFileName,
        size: file.size,
        mimeType: file.type,
        mediaType,
        durationSeconds,
        isShort,
      },
      undefined,
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
