import { type NextRequest } from "next/server";
import { z } from "zod";
import {
  verifyWebhookSignature,
  processPaymentWebhook,
  findTransactionIdByProviderPayment,
} from "@/server/modules/pricing/pricing.service";
import {
  mapInpayEventToStatus,
  verifyInpayWebhookSignature,
} from "@/server/modules/pricing/inpay.client";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

const GenericWebhookSchema = z.object({
  transactionId: z.string().uuid(),
  providerTransactionId: z.string().min(1).max(160),
  status: z.enum(["succeeded", "failed", "refunded"]),
  paidAmount: z.number().int().min(0).optional(),
});

const InpayEventSchema = z.object({
  id: z.string().optional(),
  object: z.string().optional(),
  type: z.string().min(1),
  created: z.number().int().optional(),
  livemode: z.boolean().optional(),
  data: z
    .object({
      object: z
        .object({
          id: z.string().min(1),
          amount: z.number().int().optional(),
          currency: z.string().optional(),
          status: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
        .optional(),
    })
    .optional(),
});

async function handleInpayEvent(rawBody: string, signatureHeader: string | null) {
  if (!verifyInpayWebhookSignature(rawBody, signatureHeader)) {
    throw AppError.unauthorized("To'lov webhook imzosi yaroqsiz");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody || "{}");
  } catch {
    throw AppError.badRequest("Webhook tanasi yaroqli JSON emas");
  }

  const parsed = InpayEventSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw AppError.validation("inPAY webhook ma'lumotlari noto'g'ri");
  }

  const event = parsed.data;
  const status = mapInpayEventToStatus(event.type);
  if (!status) {
    // Acknowledge unhandled events so inPAY does not retry them for 24 hours.
    return successResponse({ ignored: true, type: event.type });
  }

  const object = event.data?.object;
  if (!object) {
    return successResponse({ ignored: true, type: event.type, reason: "missing_object" });
  }

  const metadataTransactionId =
    typeof object.metadata?.transaction_id === "string" ? object.metadata.transaction_id : null;
  const transactionId =
    metadataTransactionId ?? (await findTransactionIdByProviderPayment(object.id));

  if (!transactionId) {
    console.error("[inpay-webhook] matching transaction not found", {
      eventId: event.id,
      paymentId: object.id,
      type: event.type,
    });
    return successResponse({ ignored: true, reason: "transaction_not_found" });
  }

  const result = await processPaymentWebhook({
    transactionId,
    providerTransactionId: object.id,
    status,
    paidAmount: status === "succeeded" ? object.amount : undefined,
  });

  return successResponse(result);
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // inPAY (https://inpay.uz/api/v2) signs `${t}.${rawBody}` and sends X-Inpay-Event.
    const inpaySignature = req.headers.get("x-inpay-signature");
    if (inpaySignature || req.headers.get("x-inpay-event")) {
      return await handleInpayEvent(rawBody, inpaySignature);
    }

    // Legacy generic provider callback (HMAC-SHA256 over the raw body).
    const signature = req.headers.get("x-payment-signature");
    if (!verifyWebhookSignature(rawBody, signature)) {
      throw AppError.unauthorized("To'lov webhook imzosi yaroqsiz");
    }

    const parsedBody = JSON.parse(rawBody || "{}");
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
