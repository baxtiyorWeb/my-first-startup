import { type NextRequest } from "next/server";
import { z } from "zod";
import { getOptionalAuth } from "@/server/common/auth-guard";
import { createAccountDeletionRequest } from "@/server/modules/account-deletion/account-deletion.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

const DeleteRequestSchema = z.object({
  identifier: z
    .string()
    .min(3, "Email, telefon raqam yoki foydalanuvchi nomini kiriting")
    .max(255),
  reason: z.string().max(1000).optional(),
});

/**
 * Google Play "Account deletion" talabi uchun ochiq (auth talab qilmaydigan)
 * endpoint. Ilovadan tashqarida ham hisobni o'chirishni so'rash imkonini beradi.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = DeleteRequestSchema.safeParse(body);

    if (!parseResult.success) {
      throw AppError.validation(
        parseResult.error.issues[0]?.message || "Ma'lumotlar noto'g'ri"
      );
    }

    const authUser = await getOptionalAuth(req).catch(() => null);
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await createAccountDeletionRequest({
      identifier: parseResult.data.identifier,
      reason: parseResult.data.reason,
      ip,
      userId: authUser?.userId ?? null,
    });

    return successResponse(result, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
