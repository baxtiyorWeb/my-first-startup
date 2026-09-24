import { type NextRequest } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/server/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { getSessionCookieOptions } from "@/server/common/auth-guard";

const VerifyOtpSchema = z.object({
  phone: z.string().min(9, "Telefon raqami noto‘g‘ri"),
  code: z.string().length(4, "Kod 4 xonali bo‘lishi kerak"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = VerifyOtpSchema.safeParse(body);
    if (!parseResult.success) {
      throw AppError.validation(
        "Kiritilgan ma’lumotlar yaroqsiz",
        parseResult.error.issues.map((e) => ({
          field: String(e.path[0] ?? ""),
          issue: e.message,
        }))
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const { token, user } = await verifyOtp(
      parseResult.data.phone,
      parseResult.data.code,
      ip
    );

    const response = successResponse({
      user,
      isOnboarded: user.isOnboarded,
    });

    // Set secure HttpOnly cookie
    const cookieOptions = getSessionCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
