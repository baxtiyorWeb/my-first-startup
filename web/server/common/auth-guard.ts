import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { AppError } from "./errors";
import { db } from "@/server/db";
import { userSessions, users } from "@/server/db/schema";
import { authSessionCache } from "./server-cache";

export const SESSION_COOKIE_NAME = "gogetters_session";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET environment variable must be set in production!");
    }
    console.warn(
      "[SECURITY WARNING] JWT_SECRET is not defined in environment variables. Using development fallback key."
    );
    return new TextEncoder().encode("gogetters_dev_only_jwt_signing_key_2026_min_32_chars");
  }
  return new TextEncoder().encode(secret);
}

const JWT_SECRET = getJwtSecret();

export interface AuthUserPayload {
  userId: string;
  phone?: string | null;
  email?: string | null;
  handle: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  isOnboarded: boolean;
  sessionId?: string;
}

/**
 * Sign a new JWT session token (valid for 30 days)
 */
export async function signSessionToken(payload: AuthUserPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

/**
 * Verify token and extract payload
 */
export async function verifySessionToken(token: string): Promise<AuthUserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      phone: (payload.phone as string) || null,
      email: (payload.email as string) || null,
      handle: payload.handle as string,
      name: payload.name as string,
      role: payload.role as string,
      avatarUrl: (payload.avatarUrl as string) || null,
      isOnboarded: Boolean(payload.isOnboarded),
      sessionId: (payload.sessionId as string) || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Extract token from either Cookies or Authorization header
 */
export async function getTokenFromRequest(req?: NextRequest): Promise<string | null> {
  // 1. Try from request header if present
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7).trim();
    }
  }

  // 2. Try from HttpOnly cookies
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  return sessionCookie?.value || null;
}

/**
 * Guard that enforces authenticated session.
 * Throws AppError.unauthorized() if not logged in.
 * Verifies user deactivation and active session status using short-lived LRU cache
 * and a single consolidated SQL query on cache miss (down from 2 sequential queries).
 */
async function verifyActiveUserAndSession(
  userId: string,
  sessionId?: string
): Promise<{ userExists: boolean; isDeactivated: boolean; sessionExists: boolean }> {
  if (!UUID_REGEX.test(userId)) {
    return { userExists: false, isDeactivated: false, sessionExists: false };
  }
  if (sessionId && !UUID_REGEX.test(sessionId)) {
    return { userExists: false, isDeactivated: false, sessionExists: false };
  }

  const cacheKey = `${userId}:${sessionId ?? "none"}`;
  const cached = authSessionCache.get(cacheKey);
  if (cached) return cached;

  const [row] = await db
    .select({
      isDeactivated: users.isDeactivated,
      sessionExists: sessionId
        ? sql<boolean>`EXISTS(
            SELECT 1 FROM ${userSessions}
            WHERE ${userSessions.id} = ${sessionId}::uuid
              AND ${userSessions.userId} = ${userId}::uuid
          )`
        : sql<boolean>`true`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const state = {
    userExists: Boolean(row),
    isDeactivated: Boolean(row?.isDeactivated),
    sessionExists: Boolean(row?.sessionExists),
  };

  authSessionCache.set(cacheKey, state, 15_000);
  return state;
}

export async function requireAuth(req?: NextRequest): Promise<AuthUserPayload> {
  const token = await getTokenFromRequest(req);
  if (!token) {
    throw AppError.unauthorized("Tizimga kirish talab qilinadi");
  }

  const user = await verifySessionToken(token);
  if (!user) {
    throw AppError.unauthorized("Sessiya eskirgan yoki yaroqsiz. Qaytadan kiring");
  }

  const state = await verifyActiveUserAndSession(user.userId, user.sessionId);
  if (user.sessionId && !state.sessionExists) {
    throw AppError.unauthorized("Ushbu seans boshqa qurilmadan yakunlangan. Qaytadan kiring");
  }
  if (!state.userExists) {
    throw AppError.unauthorized("Foydalanuvchi hisobi topilmadi");
  }
  if (state.isDeactivated) {
    throw AppError.forbidden(
      "Hisobingiz vaqtincha muzlatilgan. Qayta faollashtirish uchun tizimga kiring."
    );
  }

  return user;
}

/**
 * Optional auth: returns user context if authenticated, or null for guests
 */
export async function getOptionalAuth(req?: NextRequest): Promise<AuthUserPayload | null> {
  const token = await getTokenFromRequest(req);
  if (!token) return null;

  const user = await verifySessionToken(token);
  if (!user) return null;

  const state = await verifyActiveUserAndSession(user.userId, user.sessionId);
  if (!state.userExists || state.isDeactivated) return null;
  if (user.sessionId && !state.sessionExists) return null;

  return user;
}

/**
 * Cookie options for secure production session
 */
export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  };
}
