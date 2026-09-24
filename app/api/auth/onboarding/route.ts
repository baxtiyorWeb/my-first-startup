import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, signSessionToken, getSessionCookieOptions } from "@/server/common/auth-guard";
import { completeOnboarding } from "@/server/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

const OnboardingSchema = z.object({
  name: z.string().min(2, "Ism kamida 2 ta belgidan iborat bo‘lishi kerak"),
  handle: z.string().min(3, "Handle kamida 3 ta belgidan iborat bo‘lishi kerak"),
  role: z.string().min(2, "Rol yoki kasb ko‘rsatilishi lozim"),
  bio: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const parseResult = OnboardingSchema.safeParse(body);

    if (!parseResult.success) {
      throw AppError.validation(
        "Kiritilgan ma’lumotlar yaroqsiz",
        parseResult.error.issues.map((e) => ({
          field: String(e.path[0] ?? ""),
          issue: e.message,
        }))
      );
    }

    const updatedUser = await completeOnboarding(authUser.userId, parseResult.data);

    // Re-sign token with isOnboarded = true
    const newToken = await signSessionToken(updatedUser);
    const response = successResponse({ user: updatedUser });

    const cookieOptions = getSessionCookieOptions();
    response.cookies.set(cookieOptions.name, newToken, cookieOptions);

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
