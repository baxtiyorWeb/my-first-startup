import { type NextRequest } from "next/server";
import { z } from "zod";
import { requestOtp } from "@/server/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

const OtpRequestSchema = z.object({
  phone: z.string().min(9, "Telefon raqami noto‘g‘ri"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = OtpRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw AppError.validation(
        "Telefon raqami noto‘g‘ri formatda",
        parseResult.error.issues.map((e) => ({
          field: String(e.path[0] ?? ""),
          issue: e.message,
        }))
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const result = await requestOtp(parseResult.data.phone, ip);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
