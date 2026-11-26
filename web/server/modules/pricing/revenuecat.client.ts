import crypto from "crypto";
import { AppError } from "@/server/common/errors";

/**
 * RevenueCat server API client (https://api.revenuecat.com/v1).
 *
 * Used for Google Play purchases made from the mobile app. The secret key must
 * never reach the app or the browser — the Flutter SDK only gets the public
 * Google SDK key.
 */

const DEFAULT_API_BASE_URL = "https://api.revenuecat.com/v1";
const REQUEST_TIMEOUT_MS = 15_000;

export interface RevenueCatEntitlement {
  productIdentifier: string | null;
  expiresDate: string | null;
  purchaseDate: string | null;
  isActive: boolean;
}

export interface RevenueCatWebhookEvent {
  id: string;
  type: string;
  appUserId: string;
  productId: string | null;
  store: string | null;
  environment: string | null;
  expirationAtMs: number | null;
  purchasedAtMs: number | null;
}

export function isRevenueCatConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_SECRET_KEY?.trim());
}

export function revenueCatEntitlementId(): string {
  return process.env.REVENUECAT_ENTITLEMENT_ID?.trim() || "pro";
}

/**
 * RevenueCat sends the value configured in the dashboard webhook settings in the
 * `Authorization` header. Compare it in constant time.
 */
export function verifyRevenueCatWebhookAuthorization(header: string | null): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH?.trim();
  if (!expected || !header) return false;
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(header.trim(), "utf8");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function apiBaseUrl(): string {
  return (process.env.REVENUECAT_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

/**
 * Reads the configured entitlement for a user. Returns null when RevenueCat has
 * no customer or no entitlement record for them.
 */
export async function fetchRevenueCatEntitlement(
  appUserId: string
): Promise<RevenueCatEntitlement | null> {
  const secretKey = process.env.REVENUECAT_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Google Play to'lovlari hali sozlanmagan. Administrator bilan bog'laning.",
      503
    );
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/subscribers/${encodeURIComponent(appUserId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[revenuecat] subscriber request failed", error);
    throw new AppError(
      "INTERNAL_ERROR",
      "Google Play bilan aloqa o'rnatilmadi. Birozdan so'ng qayta urinib ko'ring.",
      502
    );
  }

  if (response.status === 404) return null;

  const json = (await response.json().catch(() => null)) as {
    subscriber?: {
      entitlements?: Record<
        string,
        {
          product_identifier?: string | null;
          expires_date?: string | null;
          purchase_date?: string | null;
        }
      >;
    };
  } | null;

  if (!response.ok || !json?.subscriber) {
    console.error("[revenuecat] subscriber request rejected", { status: response.status });
    throw new AppError(
      "INTERNAL_ERROR",
      "Google Play obunasini tekshirib bo'lmadi. Keyinroq qayta urinib ko'ring.",
      502
    );
  }

  const entitlement = json.subscriber.entitlements?.[revenueCatEntitlementId()];
  if (!entitlement) return null;

  const expiresDate = typeof entitlement.expires_date === "string" ? entitlement.expires_date : null;
  const expiresAt = expiresDate ? new Date(expiresDate).getTime() : null;
  const isActive = expiresAt === null || Number.isNaN(expiresAt) || expiresAt > Date.now();

  return {
    productIdentifier:
      typeof entitlement.product_identifier === "string" ? entitlement.product_identifier : null,
    expiresDate,
    purchaseDate: typeof entitlement.purchase_date === "string" ? entitlement.purchase_date : null,
    isActive,
  };
}

/** Extracts the fields Geters needs from a RevenueCat webhook payload. */
export function parseRevenueCatWebhookEvent(payload: unknown): RevenueCatWebhookEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const rawEvent = (payload as { event?: unknown }).event;
  if (!rawEvent || typeof rawEvent !== "object") return null;

  const event = rawEvent as Record<string, unknown>;
  const type = typeof event.type === "string" ? event.type : null;
  const appUserId = typeof event.app_user_id === "string" ? event.app_user_id : null;
  if (!type || !appUserId) return null;

  const toNumber = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  const expirationAtMs = toNumber(event.expiration_at_ms);
  const purchasedAtMs = toNumber(event.purchased_at_ms);

  return {
    id:
      typeof event.id === "string"
        ? event.id
        : `${type}:${appUserId}:${expirationAtMs ?? ""}:${purchasedAtMs ?? ""}`,
    type,
    appUserId,
    productId: typeof event.product_id === "string" ? event.product_id : null,
    store: typeof event.store === "string" ? event.store : null,
    environment: typeof event.environment === "string" ? event.environment : null,
    expirationAtMs,
    purchasedAtMs,
  };
}
