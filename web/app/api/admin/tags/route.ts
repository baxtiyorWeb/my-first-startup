import { type NextRequest } from "next/server";
import { enforceAdminGuard } from "@/server/common/admin-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { adminListTags } from "@/server/modules/tags/tags-admin.service";

export async function GET(req: NextRequest) {
  const denied = await enforceAdminGuard(req);
  if (denied) return denied;

  try {
    const sp = req.nextUrl.searchParams;
    const result = await adminListTags({
      q: sp.get("q") || undefined,
      status: sp.get("status") || undefined,
      limit: Number(sp.get("limit")) || 30,
      offset: Number(sp.get("offset")) || 0,
    });
    return successResponse(result.items, { nextOffset: result.nextOffset });
  } catch (error) {
    return errorResponse(error);
  }
}
