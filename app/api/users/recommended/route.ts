import { type NextRequest } from "next/server";
import { getOptionalAuth } from "@/server/common/auth-guard";
import { getRecommendedThinkers } from "@/server/modules/users/users.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getOptionalAuth(req);
    const result = await getRecommendedThinkers(authUser?.userId);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
