import { ApiError } from "./client";

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
  size: number;
  mimeType: string;
}

export async function uploadFile(
  file: File,
  folder = "uploads"
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    throw new ApiError(
      json?.error?.message || "Faylni yuklashda xatolik yuz berdi",
      json?.error?.code || "UPLOAD_FAILED",
      response.status,
      json?.error?.details
    );
  }

  return json.data as UploadResult;
}

export async function uploadAvatar(file: File): Promise<UploadResult> {
  return uploadFile(file, "avatars");
}

