import { AppError } from "./errors";

const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || "local-network";
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY || "";
const BUNNY_STORAGE_ENDPOINT = process.env.BUNNY_STORAGE_ENDPOINT || "de.storage.bunnycdn.com";
const BUNNY_CDN_URL = (process.env.BUNNY_CDN_URL || "https://local-network.b-cdn.net").replace(/\/$/, "");

/**
 * Upload a binary file directly to Bunny.net Storage Zone
 * and return the public CDN URL.
 */
export async function uploadToBunny(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folder = "uploads"
): Promise<{ url: string; path: string }> {
  if (!BUNNY_STORAGE_API_KEY) {
    throw AppError.internal("BUNNY_STORAGE_API_KEY konfiguratsiyasi topilmadi");
  }

  // Clean folder and filename
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const cleanFileName = fileName.replace(/^\/+/, "");
  const storagePath = `${cleanFolder}/${cleanFileName}`;

  // Primary endpoint with automatic fallback to global endpoint if needed
  const endpoint = BUNNY_STORAGE_ENDPOINT;
  const uploadUrl = `https://${endpoint}/${BUNNY_STORAGE_ZONE}/${storagePath}`;

  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: BUNNY_STORAGE_API_KEY,
        "Content-Type": mimeType || "application/octet-stream",
      },
      body: fileBuffer as unknown as BodyInit,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[BUNNY STORAGE] Upload failed (HTTP ${response.status}):`, errorText);
      throw AppError.internal(`Faylni bulutli xotiraga yuklashda xatolik yuz berdi (${response.status})`);
    }

    const publicUrl = `${BUNNY_CDN_URL}/${storagePath}`;
    return {
      url: publicUrl,
      path: storagePath,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[BUNNY STORAGE] Unexpected upload error:", err);
    throw AppError.internal("Bulutli xotira bilan aloqada xatolik yuz berdi");
  }
}

/**
 * Delete a file from Bunny.net Storage Zone
 */
export async function deleteFromBunny(storagePath: string): Promise<void> {
  if (!BUNNY_STORAGE_API_KEY) return;

  const cleanPath = storagePath.replace(/^\/+/, "");
  const deleteUrl = `https://${BUNNY_STORAGE_ENDPOINT}/${BUNNY_STORAGE_ZONE}/${cleanPath}`;

  try {
    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        AccessKey: BUNNY_STORAGE_API_KEY,
      },
    });

    if (!response.ok && response.status !== 404) {
      console.warn(`[BUNNY STORAGE] Delete warning (HTTP ${response.status}) for ${cleanPath}`);
    }
  } catch (err) {
    console.error("[BUNNY STORAGE] Delete error:", err);
  }
}
