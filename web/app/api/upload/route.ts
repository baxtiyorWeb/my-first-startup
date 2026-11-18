import { type NextRequest } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/server/common/auth-guard";
import { uploadToBunny } from "@/server/common/storage";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";

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
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

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
      return buffer.toString("ascii", 4, 8) === "ftyp";
    case "audio/webm":
      return (
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
      );
    default:
      return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    // Rate limiting: max 30 uploads per 10 minutes per user
    enforceRateLimit(`upload:${authUser.userId}`, 30, 600);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const requestedFolder = (formData.get("folder") as string) || "uploads";

    if (!file || !(file instanceof File)) {
      throw AppError.badRequest("Yuklash uchun fayl tanlanmagan");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw AppError.badRequest("Fayl hajmi 10MB dan oshmasligi kerak");
    }

    const safeExtension = ALLOWED_MIME_TYPES.get(file.type);
    if (!safeExtension) {
      throw AppError.badRequest(
        "Faqat xavfsiz rasm (JPEG, PNG, WebP, GIF) yoki audio formatdagi fayllar qabul qilinadi"
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Cryptographic & magic bytes file signature validation
    const isValidSignature = validateMagicBytes(buffer, file.type);
    if (!isValidSignature) {
      throw AppError.badRequest("Fayl tarkibi ko'rsatilgan formatga mos kelmadi");
    }

    // Generate unique safe filename with server-controlled extension
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const safeTimestamp = Date.now();
    const safeFileName = `${safeTimestamp}-${uniqueId}.${safeExtension}`;

    // Clean folder (only allow alphanumeric and dashes, e.g. avatars, posts, audio)
    const cleanFolder = requestedFolder.replace(/[^a-zA-Z0-9_-]/g, "") || "uploads";

    const result = await uploadToBunny(buffer, safeFileName, file.type, cleanFolder);

    return successResponse(
      {
        url: result.url,
        path: result.path,
        fileName: safeFileName,
        size: file.size,
        mimeType: file.type,
      },
      undefined,
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
