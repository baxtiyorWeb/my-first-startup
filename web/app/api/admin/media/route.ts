import { NextRequest, NextResponse } from "next/server";
import { enforceAdminGuard } from "@/server/common/admin-guard";
import { mediaService } from "@/server/modules/media/media.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

export async function GET(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const collection = searchParams.get("collection") || "";
    const search = searchParams.get("search") || "";
    const date = searchParams.get("date") || "all";
    const sort = searchParams.get("sort") || "newest";
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 60;

    const result = await mediaService.getMediaList({
      type,
      collection,
      search,
      date,
      sort,
      page,
      limit,
    });

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;

  try {
    const contentType = req.headers.get("content-type") || "";

    // Case 1: JSON payload (Sync, Collection creation, or YouTube addition)
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));

      // Sub-case A: Manual Sync with Bunny
      if (body.action === "sync") {
        const syncRes = await mediaService.syncWithBunny();
        return successResponse(syncRes);
      }

      // Sub-case B: Create Collection
      if (body.action === "create_collection") {
        if (!body.name) throw AppError.badRequest("To'plam nomi kiritilmadi");
        const createdColl = await mediaService.createBunnyCollection(body.name);
        return successResponse(createdColl, undefined, 201);
      }

      // Sub-case C: YouTube video addition
      const { url, title, durationSeconds, collectionName, collection } = body;

      if (!url) {
        throw AppError.badRequest("YouTube video havolasi talab qilinadi");
      }

      const created = await mediaService.addYouTube({
        url,
        title,
        collectionName: collectionName || collection || undefined,
        durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
      });

      return successResponse(created, undefined, 201);
    }

    // Case 2: Multipart form-data (File or Video upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const customTitle = (formData.get("title") as string) || "";
      const collectionName = (formData.get("collection") as string) || (formData.get("collectionName") as string) || "";

      if (!file || !(file instanceof File)) {
        throw AppError.badRequest("Yuklash uchun fayl tanlanmagan");
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      const created = await mediaService.uploadFile(
        buffer,
        file.name,
        file.type,
        customTitle,
        collectionName || undefined
      );

      return successResponse(created, undefined, 201);
    }

    throw AppError.badRequest("Noto'g'ri so'rov formati (Content-Type)");
  } catch (error) {
    return errorResponse(error);
  }
}
