import { type NextRequest } from "next/server";
import { z } from "zod";
import { getOptionalAuth } from "@/server/common/auth-guard";
import { createReport } from "@/server/modules/reports/reports.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

const ReportSchema = z.object({
  targetId: z.string().min(1, "Obyekt ID si ko‘rsatilishi shart"),
  targetType: z.enum(["post", "comment", "user"]),
  reason: z.string().min(1, "Shikoyat sababi ko‘rsatilishi shart"),
  context: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await getOptionalAuth(req);
    const body = await req.json().catch(() => ({}));
    const parseResult = ReportSchema.safeParse(body);

    if (!parseResult.success) {
      throw AppError.validation(
        "Shikoyat ma’lumotlari noto‘g‘ri",
        parseResult.error.issues.map((e) => ({
          field: String(e.path[0] ?? ""),
          issue: e.message,
        }))
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const result = await createReport(
      authUser?.userId || null,
      parseResult.data,
      ip
    );

    return successResponse(result, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
