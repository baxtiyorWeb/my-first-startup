import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import { AppError } from "./errors";

export const SESSION_COOKIE_NAME = "gogetters_session";

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
  phone: string;
  handle: string;
  name: string;
  role: string;
  isOnboarded: boolean;
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
      phone: payload.phone as string,
      handle: payload.handle as string,
      name: payload.name as string,
      role: payload.role as string,
      isOnboarded: Boolean(payload.isOnboarded),
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
 */
export async function requireAuth(req?: NextRequest): Promise<AuthUserPayload> {
  const token = await getTokenFromRequest(req);
  if (!token) {
    throw AppError.unauthorized("Tizimga kirish talab qilinadi");
  }

  const user = await verifySessionToken(token);
  if (!user) {
    throw AppError.unauthorized("Sessiya eskirgan yoki yaroqsiz. Qaytadan kiring");
  }

  return user;
}

/**
 * Optional auth: returns user context if authenticated, or null for guests
 */
export async function getOptionalAuth(req?: NextRequest): Promise<AuthUserPayload | null> {
  const token = await getTokenFromRequest(req);
  if (!token) return null;
  return await verifySessionToken(token);
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
