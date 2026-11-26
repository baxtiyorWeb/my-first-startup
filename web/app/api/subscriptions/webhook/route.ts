import { type NextRequest } from "next/server";
import { z } from "zod";
import {
  verifyWebhookSignature,
  processPaymentWebhook,
} from "@/server/modules/pricing/pricing.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

const WebhookSchema = z.object({
  transactionId: z.string().uuid(),
  providerTransactionId: z.string().min(1).max(160),
  status: z.enum(["succeeded", "failed", "refunded"]),
  paidAmount: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-payment-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
      throw AppError.unauthorized("To'lov webhook imzosi yaroqsiz");
    }

    const parsedBody = JSON.parse(rawBody || "{}");
    const parsed = WebhookSchema.safeParse(parsedBody);
    if (!parsed.success) {
      throw AppError.validation("Webhook ma'lumotlari noto'g'ri");
    }

    const result = await processPaymentWebhook(parsed.data);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
