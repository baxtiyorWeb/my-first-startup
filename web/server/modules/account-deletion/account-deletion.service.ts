import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/server/db";
import { accountDeletionRequests, users } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";

export type DeletionRequestStatus = "pending" | "completed" | "rejected";

export interface CreateDeletionRequestInput {
  identifier: string;
  reason?: string | null;
  ip: string;
  userId?: string | null;
}

/** @handle, email yoki telefon raqamni bir xil ko'rinishga keltiradi. */
export function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export async function findUserByIdentifier(identifier: string) {
  const value = normalizeIdentifier(identifier);
  if (!value) return null;

  const [row] = await db
    .select({
      id: users.id,
      handle: users.handle,
      name: users.name,
      email: users.email,
      phone: users.phone,
    })
    .from(users)
    .where(
      or(
        ilike(users.email, value),
        ilike(users.phone, value),
        ilike(users.handle, value)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function createAccountDeletionRequest(
  input: CreateDeletionRequestInput
): Promise<{ success: true; message: string }> {
  // Bir IP dan soatiga 5 tagacha so'rov — suiiste'molning oldini oladi.
  enforceRateLimit(`account_deletion_request:${input.ip}`, 5, 3600);

  const identifier = normalizeIdentifier(input.identifier);
  if (!identifier || identifier.length < 3) {
    throw AppError.validation(
      "Email, telefon raqam yoki foydalanuvchi nomini to'g'ri kiriting"
    );
  }

  const matchedUser = await findUserByIdentifier(identifier);

  await db.insert(accountDeletionRequests).values({
    identifier,
    reason: input.reason?.trim() ? input.reason.trim().slice(0, 1000) : null,
    requestIp: input.ip.slice(0, 64),
    matchedUserId: matchedUser?.id ?? null,
  });

  // Hisob mavjudligini oshkor qilmaydigan umumiy javob.
  return {
    success: true,
    message:
      "So'rovingiz qabul qilindi. Hisob 30 kun ichida butunlay o'chiriladi va natija haqida xabar beriladi.",
  };
}

export async function listAccountDeletionRequests(limit = 100, offset = 0) {
  return db
    .select()
    .from(accountDeletionRequests)
    .orderBy(desc(accountDeletionRequests.createdAt))
    .limit(Math.min(limit, 200))
    .offset(offset);
}

export async function resolveAccountDeletionRequest(
  requestId: string,
  action: "approve" | "reject",
  adminNote?: string | null
) {
  const [request] = await db
    .select()
    .from(accountDeletionRequests)
    .where(eq(accountDeletionRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw AppError.badRequest("O'chirish so'rovi topilmadi");
  }

  let deletedUserId: string | null = null;

  if (action === "approve") {
    const user = await findUserByIdentifier(request.identifier);
    if (user) {
      // Bog'liq postlar, izohlar va boshqa yozuvlar `on delete cascade` bilan
      // birga o'chadi (users.id ga bog'langan barcha jadvallar).
      await db.delete(users).where(eq(users.id, user.id));
      deletedUserId = user.id;
    }
  }

  await db
    .update(accountDeletionRequests)
    .set({
      status: action === "approve" ? "completed" : "rejected",
      matchedUserId: deletedUserId ?? request.matchedUserId,
      adminNote: adminNote?.trim() ? adminNote.trim().slice(0, 1000) : null,
      resolvedAt: new Date(),
    })
    .where(eq(accountDeletionRequests.id, requestId));

  return {
    deletedUserId,
    message:
      action === "approve"
        ? deletedUserId
          ? "Hisob va unga bog'liq ma'lumotlar butunlay o'chirildi"
          : "So'rov yopildi: bu identifikatorga mos hisob topilmadi"
        : "So'rov rad etildi",
  };
}
