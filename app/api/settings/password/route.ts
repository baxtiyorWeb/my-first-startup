import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/server/common/crypto";
import { enforceRateLimit } from "@/server/common/rate-limiter";

const PasswordSchema = z.object({
  currentPassword: z.string().min(1, "Eski parolni kiriting"),
  newPassword: z.string().min(6, "Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak"),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    // Rate limit: max 5 attempts per 15 minutes per user
    enforceRateLimit(`pwd_change:${authUser.userId}`, 5, 900);

    const body = await req.json().catch(() => ({}));
    const parseResult = PasswordSchema.safeParse(body);

    if (!parseResult.success) {
      throw AppError.validation(
        "Parol ma’lumotlari noto‘g‘ri",
        parseResult.error.issues.map((e) => ({
          field: String(e.path[0] ?? ""),
          issue: e.message,
        }))
      );
    }

    const { currentPassword, newPassword } = parseResult.data;

    // Check user in database
    const [userRow] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1);

    if (userRow?.passwordHash) {
      const isValid = await verifyPassword(currentPassword, userRow.passwordHash);
      if (!isValid) {
        throw AppError.badRequest("Eski parol noto‘g‘ri kiritildi");
      }
    }

    // Cryptographically hash the new password using scrypt with random salt
    const secureHashedPassword = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: secureHashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, authUser.userId));

    return successResponse({ message: "Parol muvaffaqiyatli o‘zgartirildi" });
  } catch (error) {
    return errorResponse(error);
  }
}
