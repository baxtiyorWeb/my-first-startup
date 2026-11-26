import { type NextRequest } from "next/server";
import { getOptionalAuth } from "@/server/common/auth-guard";
import { getPricingOverview } from "@/server/modules/pricing/pricing.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getOptionalAuth(req);
    const data = await getPricingOverview(authUser?.userId);
    const response = successResponse(data);
    response.headers.set(
      "Cache-Control",
      authUser ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=120"
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
