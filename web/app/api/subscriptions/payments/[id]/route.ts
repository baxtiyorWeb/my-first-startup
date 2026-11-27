import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { getPaymentStatus } from "@/server/modules/pricing/pricing.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { enforceRateLimit } from "@/server/common/rate-limiter";

/**
 * Returns one of the caller's payment transactions and reconciles it with inPAY
 * when it is still pending. This makes the entitlement independent of webhook
 * delivery (local dev, firewall, provider retries).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    enforceRateLimit(`payment-status:${authUser.userId}`, 30, 60);

    const { id } = await params;
    const data = await getPaymentStatus({ transactionId: id, userId: authUser.userId });

    const response = successResponse(data);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
