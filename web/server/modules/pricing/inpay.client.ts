import crypto from "crypto";
import { AppError } from "@/server/common/errors";

/**
 * inPAY API v2 client (https://inpay.uz/api/v2).
 *
 * Server-side only: the secret key must never reach the browser or the app.
 * Docs: POST /payments/ -> checkout_url; webhook X-Inpay-Signature: t=...,v1=...
 */

const DEFAULT_BASE_URL = "https://inpay.uz/api/v2";
const REQUEST_TIMEOUT_MS = 15_000;
const SIGNATURE_TOLERANCE_SECONDS = 300;

export interface InpayPayment {
  id: string;
  status: string;
  checkoutUrl: string | null;
  livemode: boolean;
}

export function isInpayConfigured(): boolean {
  return Boolean(process.env.INPAY_SECRET_KEY?.trim());
}

function apiBaseUrl(): string {
  return (process.env.INPAY_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "").replace(
    /\/+$/,
    ""
  );
}

function resolveReturnUrl(): string | undefined {
  const explicit = process.env.INPAY_RETURN_URL?.trim();
  if (explicit) return explicit;
  const base = appBaseUrl();
  return base ? `${base}/dashboard/pricing` : undefined;
}

function resolveWebhookUrl(): string | undefined {
  const explicit = process.env.INPAY_WEBHOOK_URL?.trim();
  if (explicit) return explicit;
  const base = appBaseUrl();
  return base ? `${base}/api/subscriptions/webhook` : undefined;
}

interface InpayEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: {
    type?: string;
    code?: string;
    message?: string;
    request_id?: string;
    param?: string;
  };
}

export async function createInpayPayment(params: {
  amount: number;
  description: string;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
}): Promise<InpayPayment> {
  const secretKey = process.env.INPAY_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new AppError(
      "INTERNAL_ERROR",
      "To'lov tizimi sozlanmagan. Administrator bilan bog'laning.",
      503
    );
  }

  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: "UZS",
    description: params.description,
    metadata: params.metadata,
  };

  const returnUrl = resolveReturnUrl();
  if (returnUrl) body.return_url = returnUrl;
  const webhookUrl = resolveWebhookUrl();
  if (webhookUrl) body.webhook_url = webhookUrl;

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/payments/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": params.idempotencyKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[inpay] payment request failed", error);
    throw new AppError(
      "INTERNAL_ERROR",
      "To'lov tizimiga ulanib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.",
      502
    );
  }

  const json = (await response.json().catch(() => null)) as InpayEnvelope<{
    id?: string;
    status?: string;
    checkout_url?: string | null;
    livemode?: boolean;
  }> | null;

  const data = json?.data;
  if (!response.ok || !json?.success || !data?.id) {
    console.error("[inpay] payment creation rejected", {
      status: response.status,
      code: json?.error?.code,
      requestId: json?.error?.request_id,
    });
    throw new AppError(
      "INTERNAL_ERROR",
      json?.error?.message || "To'lov yaratishda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",
      502
    );
  }

  return {
    id: data.id,
    status: data.status ?? "requires_payment_method",
    checkoutUrl: data.checkout_url ?? null,
    livemode: data.livemode === true,
  };
}

/**
 * Verifies `X-Inpay-Signature: t=<unix>,v1=<hex hmac>` over `${t}.${rawBody}`.
 * The raw body must be the exact bytes received — never a re-serialized JSON.
 */
export function verifyInpayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  const secret = process.env.INPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of signatureHeader.split(",")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) timestamp = parsed;
    } else if (key === "v1" && value) {
      signatures.push(value);
    }
  }

  if (timestamp === null || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();

  return signatures.some((signature) => {
    const actual = Buffer.from(signature, "hex");
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  });
}

/** Maps inPAY event types to the local transaction status. Null means "ignore". */
export function mapInpayEventToStatus(eventType: string): "succeeded" | "failed" | null {
  switch (eventType) {
    case "payment.succeeded":
    case "subscription.payment_succeeded":
      return "succeeded";
    case "payment.failed":
    case "payment.canceled":
    case "subscription.payment_failed":
      return "failed";
    default:
      return null;
  }
}
