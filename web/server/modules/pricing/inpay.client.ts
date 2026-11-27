import crypto from "crypto";
import { AppError } from "@/server/common/errors";

/**
 * inPAY API v1 client (https://inpay.uz/api).
 *
 * Server-side only: the merchant token, bearer token and webhook salt must never
 * reach the browser or the mobile app.
 *
 * Flow (official docs):
 *   1. GET  /api/v1/authorization/?merchant_id=&merchant_token= -> bearer_token (24h)
 *   2. POST /api/v1/create/  -> order_id + pay_url
 *   3. user pays on pay_url
 *   4. POST callback_url     -> { order_id, amount, status, signature, ... }
 *   5. GET  /api/v1/transactions/?order_id= -> pending | success | failed | cancelled
 *
 * Two webhook formats exist and both are accepted here:
 *   - classic payment callback: body `signature = sha256(order_id + amount + status + SALT)`
 *   - service webhook (v2): `X-Inpay-Signature: t=..,v1=HMAC_SHA256("<t>.<rawBody>", whsec_..)`
 */

const DEFAULT_API_BASE_URL = "https://inpay.uz/api/v1";
const REQUEST_TIMEOUT_MS = 15_000;
const SIGNATURE_TOLERANCE_SECONDS = 300;
const TOKEN_TTL_MS = 20 * 60 * 60 * 1000;

/** inPAY rejects payments below 1 000 so'm. */
export const INPAY_MIN_AMOUNT_UZS = 1000;

export interface InpayPayment {
  /** inPAY `order_id` — stored as providerTransactionId. */
  id: string;
  /** Local status: pending | succeeded | failed. */
  status: "pending" | "succeeded" | "failed";
  checkoutUrl: string | null;
  /** Amount reported by inPAY, rounded to whole so'm. */
  paidAmount: number | null;
}

export interface InpayNotification {
  orderId: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | null;
  rawStatus: string;
  paidAmount: number | null;
  metadataTransactionId: string | null;
  eventId: string | null;
  eventType: string;
}

interface InpayTokenCacheEntry {
  token: string;
  expiresAt: number;
}

const globalCacheHost = globalThis as typeof globalThis & {
  __inpayBearerTokenCache?: Map<string, InpayTokenCacheEntry>;
};
const tokenCache =
  globalCacheHost.__inpayBearerTokenCache ??
  (globalCacheHost.__inpayBearerTokenCache = new Map<string, InpayTokenCacheEntry>());

const ERROR_MESSAGES: Record<string, string> = {
  MISSING_AUTH_TOKEN: "To'lov tizimi avtorizatsiyasidan o'tilmadi.",
  INVALID_TOKEN: "To'lov tizimi kaliti yaroqsiz yoki muddati tugagan.",
  MISSING_MERCHANT_ID: "To'lov kassasi ID si sozlanmagan.",
  MERCHANT_NOT_FOUND: "To'lov kassasi topilmadi.",
  IP_NOT_WHITELISTED_STRICT:
    "Server IP manzili kassa ruxsat etilganlar ro'yxatida yo'q. Administrator bilan bog'laning.",
  CALLBACK_NOT_WHITELISTED:
    "Webhook manzili kassa ruxsat etilganlar ro'yxatida yo'q. Administrator bilan bog'laning.",
  MERCHANT_WEBSITE_NOT_WHITELISTED: "Sayt domeni kassada tasdiqlanmagan.",
  AMOUNT_TOO_LOW: "To'lov summasi ruxsat etilgan eng kam summadan kam.",
  AMOUNT_TOO_HIGH: "To'lov summasi ruxsat etilgan limitdan oshib ketdi.",
  RATE_LIMIT_EXCEEDED:
    "To'lov tizimi so'rovlar limiti tugadi. Birozdan so'ng qayta urinib ko'ring.",
  TRANSACTION_SAVE_FAILED: "To'lov tranzaksiyasini saqlashda xatolik yuz berdi.",
};

function inpayMerchantId(): string | null {
  return process.env.INPAY_MERCHANT_ID?.trim() || null;
}

function inpayMerchantToken(): string | null {
  return process.env.INPAY_MERCHANT_TOKEN?.trim() || null;
}

/** A pre-issued bearer token can be supplied instead of merchant credentials. */
function inpayPreIssuedToken(): string | null {
  return process.env.INPAY_SECRET_KEY?.trim() || null;
}

export function isInpayConfigured(): boolean {
  return Boolean((inpayMerchantToken() && inpayMerchantId()) || inpayPreIssuedToken());
}

export interface InpayConfigStatus {
  configured: boolean;
  credentialSource: "merchant_credentials" | "pre_issued_token" | "none";
  merchantId: string | null;
  hasMerchantToken: boolean;
  hasWebhookSalt: boolean;
  hasWebhookSecret: boolean;
  apiBaseUrl: string;
  webhookUrl: string | null;
  /** Env names that still need a value before payments can be accepted. */
  missingEnv: string[];
}

/**
 * Reports the kassa wiring without ever exposing a secret. Read from the
 * environment on every call so a key change shows up immediately.
 */
export function inpayConfigStatus(): InpayConfigStatus {
  const merchantId = inpayMerchantId();
  const hasMerchantToken = Boolean(inpayMerchantToken());
  const hasPreIssuedToken = Boolean(inpayPreIssuedToken());
  const hasWebhookSalt = Boolean(process.env.INPAY_WEBHOOK_SALT?.trim());
  const hasWebhookSecret = Boolean(process.env.INPAY_WEBHOOK_SECRET?.trim());

  const missingEnv: string[] = [];
  if (!merchantId) missingEnv.push("INPAY_MERCHANT_ID");
  if (!hasMerchantToken && !hasPreIssuedToken) missingEnv.push("INPAY_MERCHANT_TOKEN");
  if (!hasWebhookSalt && !hasWebhookSecret) missingEnv.push("INPAY_WEBHOOK_SALT");

  return {
    configured: isInpayConfigured(),
    credentialSource: hasMerchantToken && merchantId
      ? "merchant_credentials"
      : hasPreIssuedToken
        ? "pre_issued_token"
        : "none",
    merchantId,
    hasMerchantToken,
    hasWebhookSalt,
    hasWebhookSecret,
    apiBaseUrl: apiBaseUrl(),
    webhookUrl:
      process.env.INPAY_WEBHOOK_URL?.trim() ||
      (appBaseUrl() ? `${appBaseUrl()}/api/subscriptions/webhook` : null),
    missingEnv,
  };
}

/** Live credential check used by the admin panel (never returns the token). */
export async function checkInpayConnection(): Promise<{ latencyMs: number }> {
  if (!isInpayConfigured()) throw notConfiguredError();
  const startedAt = Date.now();
  await authorizeInpay(true);
  return { latencyMs: Date.now() - startedAt };
}

function apiBaseUrl(): string {
  return (process.env.INPAY_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    ""
  ).replace(/\/+$/, "");
}

function notConfiguredError(): AppError {
  return new AppError(
    "INTERNAL_ERROR",
    "To'lov tizimi sozlanmagan. Administrator bilan bog'laning.",
    503
  );
}

function providerError(message: string): AppError {
  return new AppError("INTERNAL_ERROR", message, 502);
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

function mapProviderStatus(status: string | null | undefined): InpayPayment["status"] | null {
  switch ((status ?? "").toLowerCase()) {
    case "success":
    case "succeeded":
    case "paid":
    case "completed":
      return "succeeded";
    case "failed":
    case "canceled":
    case "cancelled":
    case "cancelled_by_user":
    case "expired":
      return "failed";
    case "pending":
    case "processing":
    case "created":
    case "requires_payment_method":
      return "pending";
    default:
      return null;
  }
}

/** Maps an inPAY event type to the local transaction status. Null means "ignore". */
function mapInpayEventToStatus(eventType: string): "succeeded" | "failed" | null {
  switch (eventType) {
    case "payment.succeeded":
    case "payment.success":
    case "service.payment.succeeded":
    case "subscription.payment_succeeded":
      return "succeeded";
    case "payment.failed":
    case "payment.canceled":
    case "payment.cancelled":
    case "service.payment.failed":
    case "subscription.payment_failed":
      return "failed";
    default:
      return null;
  }
}

/** Refund events are handled separately because they revoke an entitlement. */
function isInpayRefundEvent(eventType: string): boolean {
  return /refund/i.test(eventType);
}

async function authorizeInpay(forceRefresh = false): Promise<string> {
  const merchantId = inpayMerchantId();
  const merchantToken = inpayMerchantToken();

  if (!merchantId || !merchantToken) {
    const preIssued = inpayPreIssuedToken();
    if (preIssued) return preIssued;
    throw notConfiguredError();
  }

  const cacheKey = `${merchantId}:${merchantToken.slice(-8)}`;
  const cached = tokenCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const url = `${apiBaseUrl()}/authorization/?merchant_id=${encodeURIComponent(
    merchantId
  )}&merchant_token=${encodeURIComponent(merchantToken)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[inpay] authorization request failed", error);
    throw providerError("To'lov tizimiga ulanib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.");
  }

  const json = (await response.json().catch(() => null)) as
    | {
        success?: boolean;
        bearer_token?: string;
        message?: string;
        error_code?: string;
        data?: { bearer_token?: string };
      }
    | null;

  const token = json?.bearer_token ?? json?.data?.bearer_token;
  if (!response.ok || !json?.success || !token) {
    console.error("[inpay] authorization rejected", {
      status: response.status,
      errorCode: json?.error_code,
    });
    tokenCache.delete(cacheKey);
    throw providerError(
      ERROR_MESSAGES[json?.error_code ?? ""] ||
        "To'lov tizimi avtorizatsiyasidan o'tilmadi. Administrator bilan bog'laning."
    );
  }

  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

async function inpayRequest(
  path: string,
  init: RequestInit,
  allowAuthRetry = true
): Promise<{ response: Response; json: Record<string, unknown> | null }> {
  const token = await authorizeInpay();

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[inpay] request failed", { path, error });
    throw providerError("To'lov tizimiga ulanib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.");
  }

  // The bearer token is only valid for 24 hours; refresh it once on 401.
  if (response.status === 401 && allowAuthRetry && inpayMerchantToken()) {
    await authorizeInpay(true);
    return inpayRequest(path, init, false);
  }

  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { response, json };
}

export async function createInpayPayment(params: {
  amount: number;
  description: string;
  returnUrl?: string;
}): Promise<InpayPayment> {
  if (!isInpayConfigured()) throw notConfiguredError();

  const amount = Math.round(params.amount);
  if (!Number.isFinite(amount) || amount < INPAY_MIN_AMOUNT_UZS) {
    throw AppError.badRequest(
      `To'lov summasi kamida ${INPAY_MIN_AMOUNT_UZS.toLocaleString("uz-UZ")} so'm bo'lishi kerak`
    );
  }

  const merchantId = inpayMerchantId();
  const merchantToken = inpayMerchantToken();

  const body: Record<string, unknown> = {
    amount,
    description: params.description,
  };

  // The v1 docs list merchant_id/token in the body; keep them when available.
  if (merchantId) body.merchant_id = merchantId;
  if (merchantToken) body.token = merchantToken;

  const callbackUrl =
    process.env.INPAY_WEBHOOK_URL?.trim() ||
    (appBaseUrl() ? `${appBaseUrl()}/api/subscriptions/webhook` : undefined);
  if (callbackUrl) body.callback_url = callbackUrl;

  const returnUrl =
    params.returnUrl?.trim() ||
    process.env.INPAY_RETURN_URL?.trim() ||
    (appBaseUrl() ? `${appBaseUrl()}/dashboard/pricing` : undefined);
  if (returnUrl) body.return_url = returnUrl;

  const { response, json } = await inpayRequest("/create/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const orderId = typeof json?.order_id === "string" ? json.order_id : null;
  const checkoutUrl =
    (typeof json?.pay_url === "string" && json.pay_url) ||
    (typeof json?.pay_url_link === "string" && json.pay_url_link) ||
    null;

  if (!response.ok || json?.success !== true || !orderId) {
    const errorCode = typeof json?.error_code === "string" ? json.error_code : "";
    console.error("[inpay] payment creation rejected", {
      status: response.status,
      errorCode,
      // Never log the request body: it contains the merchant token.
    });
    throw providerError(
      ERROR_MESSAGES[errorCode] ||
        (typeof json?.message === "string" && json.message) ||
        "To'lov yaratishda xatolik yuz berdi. Keyinroq qayta urinib ko'ring."
    );
  }

  return {
    id: orderId,
    status: "pending",
    checkoutUrl,
    paidAmount: null,
  };
}

/**
 * Reads the authoritative status of an order straight from inPAY. Used to
 * reconcile a payment when the webhook is late, lost, or blocked locally.
 */
export async function fetchInpayPayment(orderId: string): Promise<InpayPayment> {
  if (!isInpayConfigured()) throw notConfiguredError();

  const merchantId = inpayMerchantId();
  const query = new URLSearchParams({ order_id: orderId });
  if (merchantId) query.set("merchant_id", merchantId);

  const { response, json } = await inpayRequest(`/transactions/?${query.toString()}`, {
    method: "GET",
  });

  const remoteOrderId = typeof json?.order_id === "string" ? json.order_id : orderId;
  const rawStatus = typeof json?.status === "string" ? json.status : null;
  const mapped = mapProviderStatus(rawStatus);

  if (!response.ok || json?.success === false || !rawStatus || !mapped) {
    console.error("[inpay] transaction lookup failed", {
      status: response.status,
      errorCode: typeof json?.error_code === "string" ? json.error_code : undefined,
    });
    throw providerError("To'lov holatini to'lov tizimidan tekshirib bo'lmadi.");
  }

  return {
    id: remoteOrderId,
    status: mapped,
    checkoutUrl: null,
    paidAmount: normalizeAmount(json?.amount),
  };
}

/** Verifies the v2 `X-Inpay-Signature: t=<unix>,v1=<hex hmac>` header. */
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

/**
 * Verifies the classic payment callback signature:
 * `signature = sha256(order_id . amount . status . SALT)`, compared in constant time.
 */
export function verifyInpayBodySignature(body: Record<string, unknown>): boolean {
  const salt =
    process.env.INPAY_WEBHOOK_SALT?.trim() ||
    process.env.INPAY_WEBHOOK_SECRET?.trim() ||
    null;
  if (!salt) return false;

  const orderId = typeof body.order_id === "string" ? body.order_id : "";
  const status = typeof body.status === "string" ? body.status : "";
  const amount =
    typeof body.amount === "string" || typeof body.amount === "number"
      ? String(body.amount)
      : "";
  const signature = typeof body.signature === "string" ? body.signature.trim().toLowerCase() : "";

  if (!orderId || !status || !amount || !signature) return false;

  const expected = crypto
    .createHash("sha256")
    .update(`${orderId}${amount}${status}${salt}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

/** Normalises both inPAY webhook shapes into one internal notification. */
export function parseInpayNotification(body: Record<string, unknown>): InpayNotification | null {
  const eventType = typeof body.type === "string" ? body.type : "";

  // Service / v2 event: { type, data: { object: { id | tx_id, amount, metadata } } }
  if (eventType) {
    const data = (body.data ?? {}) as Record<string, unknown>;
    const object = (data.object ?? {}) as Record<string, unknown>;
    const orderId =
      (typeof object.id === "string" && object.id) ||
      (typeof object.tx_id === "string" && object.tx_id) ||
      (typeof body.order_id === "string" && body.order_id) ||
      "";

    if (!orderId) return null;

    const metadata = (object.metadata ?? {}) as Record<string, unknown>;
    const isRefund = isInpayRefundEvent(eventType);
    const mapped = mapInpayEventToStatus(eventType);

    return {
      orderId,
      status: isRefund ? "refunded" : mapped,
      rawStatus: typeof object.status === "string" ? object.status : eventType,
      paidAmount: normalizeAmount(object.amount),
      metadataTransactionId:
        typeof metadata.transaction_id === "string" ? metadata.transaction_id : null,
      eventId: typeof body.id === "string" ? body.id : null,
      eventType,
    };
  }

  // Classic callback: { order_id, amount, status, transaction_id }
  const orderId = typeof body.order_id === "string" ? body.order_id : "";
  if (!orderId) return null;

  const rawStatus = typeof body.status === "string" ? body.status : "";
  const mapped = mapProviderStatus(rawStatus);
  const transactionId = body.transaction_id;

  return {
    orderId,
    status: mapped,
    rawStatus,
    paidAmount: normalizeAmount(body.amount),
    metadataTransactionId: null,
    eventId:
      typeof transactionId === "string" || typeof transactionId === "number"
        ? String(transactionId)
        : null,
    eventType: `payment.${rawStatus || "unknown"}`,
  };
}
