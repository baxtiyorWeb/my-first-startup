import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/common/auth-guard";
import { initiateSubscriptionCheckout } from "@/server/modules/pricing/pricing.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";

const CheckoutSchema = z.object({
  planSlug: z.string().min(1).max(40),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  provider: z.enum(["inpay", "click", "payme", "stripe"]).default("inpay"),
  idempotencyKey: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    enforceRateLimit(`checkout:${authUser.userId}`, 10, 600);

    const body = await req.json().catch(() => ({}));
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation(
        "Tarif ma'lumotlari noto'g'ri",
        parsed.error.issues.map((e) => ({ field: String(e.path[0] ?? ""), issue: e.message }))
      );
    }

    const result = await initiateSubscriptionCheckout({
      userId: authUser.userId,
      ...parsed.data,
    });

    return successResponse(result, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
