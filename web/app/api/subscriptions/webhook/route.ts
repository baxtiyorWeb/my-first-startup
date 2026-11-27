import { type NextRequest } from "next/server";
import { z } from "zod";
import {
  verifyWebhookSignature,
  processPaymentWebhook,
  findTransactionIdByProviderPayment,
} from "@/server/modules/pricing/pricing.service";
import {
  fetchInpayPayment,
  isInpayConfigured,
  parseInpayNotification,
  verifyInpayBodySignature,
  verifyInpayWebhookSignature,
} from "@/server/modules/pricing/inpay.client";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { checkRateLimit } from "@/server/common/rate-limiter";

const GenericWebhookSchema = z.object({
  transactionId: z.string().uuid(),
  providerTransactionId: z.string().min(1).max(160),
  status: z.enum(["succeeded", "failed", "refunded"]),
  paidAmount: z.number().int().min(0).optional(),
});

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Handles both inPAY callback shapes:
 *  - classic kassa callback (signed body: sha256(order_id + amount + status + SALT))
 *  - service/v2 webhook (X-Inpay-Signature: t=...,v1=HMAC_SHA256("<t>.<body>", whsec_...))
 */
async function handleInpayNotification(
  rawBody: string,
  body: Record<string, unknown>,
  req: NextRequest
) {
  const v2Signature = req.headers.get("x-inpay-signature");
  const v2Valid = verifyInpayWebhookSignature(rawBody, v2Signature);
  const bodyValid = verifyInpayBodySignature(body);
  const hasAnySignature = Boolean(v2Signature) || typeof body.signature === "string";

  // A present-but-wrong signature is always rejected. A callback with no
  // signature at all is only accepted after inPAY itself confirms the order.
  if (!v2Valid && !bodyValid && hasAnySignature) {
    console.error("[inpay-webhook] signature verification failed", {
      hasHeaderSignature: Boolean(v2Signature),
      hasBodySignature: typeof body.signature === "string",
    });
    throw AppError.unauthorized("To'lov webhook imzosi yaroqsiz");
  }

  const notification = parseInpayNotification(body);
  if (!notification) {
    return successResponse({ ignored: true, reason: "invalid_payload" });
  }

  // Unknown event types are acknowledged so inPAY stops retrying them.
  if (!notification.status) {
    return successResponse({ ignored: true, type: notification.eventType });
  }

  const transactionId =
    notification.metadataTransactionId ??
    (await findTransactionIdByProviderPayment(notification.orderId));

  if (!transactionId) {
    console.error("[inpay-webhook] matching transaction not found", {
      eventId: notification.eventId,
      orderId: notification.orderId,
      type: notification.eventType,
    });
    return successResponse({ ignored: true, reason: "transaction_not_found" });
  }

  let status = notification.status;
  let paidAmount = notification.paidAmount;
  let providerStatus = notification.rawStatus || notification.eventType;

  // Unsigned callback: never trust its body — the order status must come from
  // inPAY's authenticated API before any entitlement is granted.
  if (!v2Valid && !bodyValid) {
    if (!isInpayConfigured()) {
      throw AppError.unauthorized("To'lov webhook imzosi yaroqsiz");
    }
    const remote = await fetchInpayPayment(notification.orderId);
    status = remote.status;
    paidAmount = remote.paidAmount;
    providerStatus = `verified:${remote.status}`;
  }

  // Intermediate notifications carry no outcome — wait for the final callback.
  if (status === "pending") {
    return successResponse({ ignored: true, reason: "pending" });
  }

  const result = await processPaymentWebhook({
    transactionId,
    providerTransactionId: notification.orderId.slice(0, 160),
    status,
    paidAmount: status === "succeeded" ? paidAmount ?? undefined : undefined,
    providerStatus,
  });

  return successResponse(result);
}

export async function POST(req: NextRequest) {
  try {
    // inPAY retries failed deliveries, so allow a generous but bounded budget.
    const limit = checkRateLimit(`payment-webhook:${clientIp(req)}`, 240, 60);
    if (!limit.allowed) {
      throw AppError.rateLimited("To'lov webhook so'rovlari limiti oshib ketdi");
    }

    const rawBody = await req.text();

    let parsedBody: Record<string, unknown> | null = null;
    try {
      const json: unknown = JSON.parse(rawBody || "{}");
      parsedBody =
        json && typeof json === "object" && !Array.isArray(json)
          ? (json as Record<string, unknown>)
          : null;
    } catch {
      parsedBody = null;
    }

    const isInpayRequest =
      Boolean(req.headers.get("x-inpay-signature") || req.headers.get("x-inpay-event")) ||
      (parsedBody !== null && typeof parsedBody.signature === "string");

    if (isInpayRequest) {
      if (!parsedBody) {
        throw AppError.badRequest("Webhook tanasi yaroqli JSON emas");
      }
      return await handleInpayNotification(rawBody, parsedBody, req);
    }

    // Legacy generic provider callback (HMAC-SHA256 over the raw body).
    const signature = req.headers.get("x-payment-signature");
    if (!verifyWebhookSignature(rawBody, signature)) {
      throw AppError.unauthorized("To'lov webhook imzosi yaroqsiz");
    }

    if (!parsedBody) {
      throw AppError.badRequest("Webhook tanasi yaroqli JSON emas");
    }

    const parsed = GenericWebhookSchema.safeParse(parsedBody);
    if (!parsed.success) {
      throw AppError.validation("Webhook ma'lumotlari noto'g'ri");
    }

    const result = await processPaymentWebhook(parsed.data);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
