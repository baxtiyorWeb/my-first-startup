import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/common/auth-guard";
import { updateProfile, getProfileByUserId } from "@/server/modules/users/users.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

const UpdateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ism kamida 2 ta belgidan iborat bo‘lishi kerak")
    .max(100, "Ism 100 belgidan oshmasligi kerak")
    .optional(),
  role: z
    .string()
    .trim()
    .max(100, "Rol 100 belgidan oshmasligi kerak")
    .nullable()
    .optional(),
  bio: z.string().max(1000, "Bio 1000 belgidan oshmasligi kerak").nullable().optional(),
  location: z.string().max(100, "Manzil 100 belgidan oshmasligi kerak").nullable().optional(),
  website: z.string().max(200, "Veb-sayt havolasi 200 belgidan oshmasligi kerak").nullable().optional(),
  avatarUrl: z
    .string()
    .url("Noto‘g‘ri rasm havolasi")
    .or(z.string().startsWith("/"))
    .or(z.string().startsWith("data:image/"))
    .or(z.literal(""))
    .nullable()
    .optional(),
  coverPhotoUrl: z
    .string()
    .url("Noto‘g‘ri muqova rasmi havolasi")
    .or(z.string().startsWith("/"))
    .or(z.string().startsWith("data:image/"))
    .or(z.literal(""))
    .nullable()
    .optional(),
  socialLinks: z
    .object({
      github: z.string().max(250).nullable().optional(),
      linkedin: z.string().max(250).nullable().optional(),
      twitter: z.string().max(250).nullable().optional(),
      website: z.string().max(250).nullable().optional(),
    })
    .nullable()
    .optional(),
  isPrivate: z.boolean().optional(),
  dmPermission: z.enum(["everyone", "followed", "nobody"]).optional(),
  showOnlineStatus: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  twoFactorType: z.enum(["authenticator", "sms"]).optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
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
      const issues = parseResult.error.issues.map((e) => ({
        field: String(e.path[0] ?? ""),
        issue: e.message,
      }));
      throw AppError.validation(
        issues[0]?.issue || "Profil ma’lumotlari noto‘g‘ri",
        issues
      );
    }

    const { role, ...rest } = parseResult.data;
    await updateProfile(authUser.userId, {
      ...rest,
      ...(role !== undefined ? { role: role ?? "" } : {}),
    });
    const updated = await getProfileByUserId(authUser.userId);

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
