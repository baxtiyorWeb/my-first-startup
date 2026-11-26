import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { syncRevenueCatSubscription } from "@/server/modules/pricing/pricing.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { enforceRateLimit } from "@/server/common/rate-limiter";

/**
 * Called by the mobile app right after a Google Play purchase or restore.
 * Verifies the entitlement with RevenueCat server-side and activates it locally
 * without waiting for the webhook.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    enforceRateLimit(`google-play-sync:${authUser.userId}`, 20, 600);

    const result = await syncRevenueCatSubscription(authUser.userId);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
