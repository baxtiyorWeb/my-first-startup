import { type NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import {
  parseRevenueCatWebhookEvent,
  verifyRevenueCatWebhookAuthorization,
} from "@/server/modules/pricing/revenuecat.client";
import { handleRevenueCatWebhookEvent } from "@/server/modules/pricing/pricing.service";

/**
 * Google Play purchases (RevenueCat) webhook.
 * Configure the URL and the Authorization header value in RevenueCat →
 * Project settings → Integrations → Webhooks.
 */
export async function POST(req: NextRequest) {
  try {
    if (!verifyRevenueCatWebhookAuthorization(req.headers.get("authorization"))) {
      throw AppError.unauthorized("RevenueCat webhook avtorizatsiyasi yaroqsiz");
    }

    const rawBody = await req.text();
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch {
      throw AppError.badRequest("Webhook tanasi yaroqli JSON emas");
    }

    const event = parseRevenueCatWebhookEvent(payload);
    if (!event) {
      return successResponse({ ignored: true, reason: "invalid_event" });
    }

    const result = await handleRevenueCatWebhookEvent(event);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
