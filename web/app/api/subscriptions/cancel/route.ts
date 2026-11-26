import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { cancelActiveSubscription } from "@/server/modules/pricing/pricing.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const updated = await cancelActiveSubscription(authUser.userId);
    return successResponse({
      subscriptionId: updated.id,
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      autoRenew: updated.autoRenew,
      currentPeriodEnd: updated.currentPeriodEnd.toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
