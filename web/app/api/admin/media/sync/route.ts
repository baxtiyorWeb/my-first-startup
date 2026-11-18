import { NextRequest } from "next/server";
import { enforceAdminGuard } from "@/server/common/admin-guard";
import { mediaService } from "@/server/modules/media/media.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function POST(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;

  try {
    const result = await mediaService.syncWithBunny();
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
