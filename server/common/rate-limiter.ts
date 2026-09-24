import { AppError } from "./errors";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Sliding window in-memory rate limiter.
 * Can easily be swapped with Redis for distributed scaling in production.
 *
 * @param key Unique key (e.g., `otp:${phone}` or `post:${userId}`)
 * @param maxHits Maximum allowed requests in the window
 * @param windowSeconds Window length in seconds
 */
export function checkRateLimit(
  key: string,
  maxHits: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxHits - 1,
      resetTime: now + windowMs,
    };
  }

  if (record.count >= maxHits) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxHits - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Enforce rate limit helper: throws AppError.rateLimited() if limit exceeded
 */
export function enforceRateLimit(key: string, maxHits: number, windowSeconds: number) {
  const result = checkRateLimit(key, maxHits, windowSeconds);
  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.resetTime - Date.now()) / 1000);
    throw AppError.rateLimited(
      `Juda ko‘p so‘rov yuborildi. Iltimos, ${retryAfterSec} soniyadan keyin qayta urinib ko‘ring.`
    );
  }
}
