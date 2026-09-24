import crypto from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/server/db";
import { users, verificationCodes } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import { signSessionToken, type AuthUserPayload } from "@/server/common/auth-guard";

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Format and normalize phone number
 */
export function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 9) {
    return `+998${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("998")) {
    return `+${digits}`;
  }
  return rawPhone.trim();
}

/**
 * Request OTP via SMS (generates code, hashes, and stores with 5m TTL)
 */
export async function requestOtp(phone: string, ip: string): Promise<{ success: boolean; message: string }> {
  const normalized = normalizePhone(phone);

  // 1. Enforce rate limits
  enforceRateLimit(`otp:ip:${ip}`, 5, 3600); // Max 5 requests per hour per IP
  enforceRateLimit(`otp:phone:${normalized}`, 3, 600); // Max 3 requests per 10 min per phone

  // 2. Generate 4-digit code (logged to console in development since SMS gateway is not yet attached)
  const code = process.env.NODE_ENV === "production" ? String(Math.floor(1000 + Math.random() * 9000)) : "1234";
  if (process.env.NODE_ENV !== "production") {
    console.log(`[AUTH-DEV] OTP code for ${normalized}: ${code}`);
  }
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  try {
    // Delete any existing codes for this phone
    await db.delete(verificationCodes).where(eq(verificationCodes.phone, normalized));

    // Save new code
    await db.insert(verificationCodes).values({
      phone: normalized,
      codeHash,
      attempts: 0,
      expiresAt,
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[AUTH] Error saving verification code to DB:", err);
    throw AppError.internal("Tasdiqlash kodi saqlanmadi. Iltimos, qaytadan urining");
  }

  return {
    success: true,
    message: "Tasdiqlash kodi telefon raqamingizga yuborildi",
  };
}

/**
 * Verify OTP code, find or create user, and issue session
 */
export async function verifyOtp(
  phone: string,
  code: string,
  ip: string
): Promise<{ token: string; user: AuthUserPayload }> {
  const normalized = normalizePhone(phone);

  // 1. Rate limit verification attempts (max 5 per 5 minutes per phone, max 20 per IP)
  enforceRateLimit(`verify:phone:${normalized}`, 5, 300);
  if (ip) {
    enforceRateLimit(`verify:ip:${ip}`, 20, 300);
  }

  if (code.length !== 4) {
    throw AppError.validation("Iltimos, to‘liq 4 xonali kodni kiriting");
  }

  // 2. Verify code
  let isValid = false;
  try {
    const records = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.phone, normalized),
          gt(verificationCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (records.length > 0) {
      const record = records[0];
      if (record.attempts >= 5) {
        throw AppError.rateLimited("Ko‘p marotaba noto‘g‘ri kod kiritildi. Yangi kod so‘rang");
      }

      // Timing-safe comparison to prevent timing attacks
      const incomingHash = Buffer.from(hashOtp(code));
      const savedHash = Buffer.from(record.codeHash);
      if (
        incomingHash.length === savedHash.length &&
        crypto.timingSafeEqual(incomingHash, savedHash)
      ) {
        isValid = true;
        // Delete used verification code
        await db.delete(verificationCodes).where(eq(verificationCodes.id, record.id));
      } else {
        // Increment attempt counter
        await db
          .update(verificationCodes)
          .set({ attempts: record.attempts + 1 })
          .where(eq(verificationCodes.id, record.id));
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.internal("Tasdiqlash xizmatida xatolik yuz berdi. Qaytadan urinib ko‘ring");
  }

  if (!isValid) {
    throw AppError.badRequest("Kiritilgan tasdiqlash kodi noto‘g‘ri yoki muddati o‘tgan");
  }

  // 3. Find or create user
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.phone, normalized))
    .limit(1);

  let userRecord: AuthUserPayload;

  if (existing.length > 0) {
    const u = existing[0];
    userRecord = {
      userId: u.id,
      phone: u.phone,
      handle: u.handle,
      name: u.name,
      role: u.role,
      isOnboarded: u.isOnboarded,
    };
  } else {
    // Create new provisional user
    const rawDigits = normalized.replace(/\D/g, "").slice(-4);
    const tempHandle = `@user_${rawDigits}`;
    const [newUser] = await db
      .insert(users)
      .values({
        phone: normalized,
        handle: tempHandle,
        name: "Yangi Foydalanuvchi",
        role: "Fikr a’zosi",
        isOnboarded: false,
      })
      .returning();

    userRecord = {
      userId: newUser.id,
      phone: newUser.phone,
      handle: newUser.handle,
      name: newUser.name,
      role: newUser.role,
      isOnboarded: false,
    };
  }

  // 4. Sign JWT session token
  const token = await signSessionToken(userRecord);
  return { token, user: userRecord };
}

/**
 * Complete onboarding: save name, handle, role, bio
 */
export async function completeOnboarding(
  userId: string,
  data: { name: string; handle: string; role: string; bio?: string }
): Promise<AuthUserPayload> {
  const cleanHandle = data.handle.startsWith("@") ? data.handle : `@${data.handle.trim()}`;

  try {
    // Check if handle is already taken by another user
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.handle, cleanHandle))
      .limit(1);

    if (existing.length > 0 && existing[0].id !== userId) {
      throw AppError.conflict("Ushbu @handle allaqachon band. Boshqa nom tanlang");
    }

    const [updated] = await db
      .update(users)
      .set({
        name: data.name.trim(),
        handle: cleanHandle,
        role: data.role.trim() || "Fikr a’zosi",
        bio: (data.bio || "").trim(),
        isOnboarded: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return {
      userId: updated.id,
      phone: updated.phone,
      handle: updated.handle,
      name: updated.name,
      role: updated.role,
      isOnboarded: true,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[AUTH] Error completing onboarding:", err);
    throw AppError.internal("Onboarding ma’lumotlarini saqlashda xatolik yuz berdi");
  }
}
