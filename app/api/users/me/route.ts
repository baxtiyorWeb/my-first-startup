import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/common/auth-guard";
import { updateProfile, getProfileByHandle } from "@/server/modules/users/users.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Ism kamida 2 ta belgidan iborat bo‘lishi kerak").optional(),
  role: z.string().min(2, "Rol kamida 2 ta belgidan iborat bo‘lishi kerak").optional(),
  bio: z.string().max(500, "Bio 500 belgidan oshmasligi kerak").optional(),
  location: z.string().max(100).optional(),
  website: z.string().max(200).optional(),
  avatarUrl: z.string().url("Noto‘g‘ri rasm havolasi").or(z.literal("")).optional(),
  intent: z
    .enum([
      "none",
      "looking_for_cofounder",
      "open_to_work",
      "raising_funds",
      "open_to_advisory",
    ])
    .optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const parseResult = UpdateProfileSchema.safeParse(body);

    if (!parseResult.success) {
      throw AppError.validation(
        "Profil ma’lumotlari noto‘g‘ri",
        parseResult.error.issues.map((e) => ({
          field: String(e.path[0] ?? ""),
          issue: e.message,
        }))
      );
    }

    await updateProfile(authUser.userId, parseResult.data);
    const updated = await getProfileByHandle(authUser.handle, authUser.userId);

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
