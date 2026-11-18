import { NextRequest, NextResponse } from "next/server";
import { enforceAdminGuard } from "@/server/common/admin-guard";
import { mediaService } from "@/server/modules/media/media.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;

  try {
    const { id } = await params;
    if (!id) {
      throw AppError.badRequest("ID ko'rsatilmagan");
    }

    const result = await mediaService.deleteMedia(id);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { title } = body;

    if (!title || typeof title !== "string") {
      throw AppError.badRequest("Yangi sarlavha ko'rsatilmagan");
    }

    const updated = await mediaService.updateMediaTitle(id, title);
    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
