import { type NextRequest } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/server/common/auth-guard";
import { uploadToBunny } from "@/server/common/storage";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

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

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw AppError.badRequest(
        "Faqat rasm (JPEG, PNG, WebP, GIF, SVG) yoki audio formatdagi fayllar qabul qilinadi"
      );
    }

    // Determine safe extension
    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase() || "bin"
      : file.type.split("/")[1] || "bin";

    // Generate unique safe filename
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const safeTimestamp = Date.now();
    const safeFileName = `${safeTimestamp}-${uniqueId}.${extension}`;

    // Clean folder (only allow alphanumeric and dashes, e.g. avatars, posts, audio)
    const cleanFolder = requestedFolder.replace(/[^a-zA-Z0-9_-]/g, "") || "uploads";

    const buffer = Buffer.from(await file.arrayBuffer());
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
