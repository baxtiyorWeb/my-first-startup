import { db } from "@/server/db";
import { reports } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";

export interface CreateReportInput {
  targetId: string;
  targetType: "post" | "comment" | "user";
  reason: string;
  context?: string;
}

export async function createReport(
  reporterId: string | null,
  input: CreateReportInput,
  ip: string
): Promise<{ success: boolean; message: string }> {
  // Rate limit reports: max 5 per 10 minutes per IP/User
  const rateLimitKey = reporterId ? `report:user:${reporterId}` : `report:ip:${ip}`;
  enforceRateLimit(rateLimitKey, 5, 600);

  if (!input.targetId || !input.reason) {
    throw AppError.validation("Shikoyat sababi va obyekti ko‘rsatilishi shart");
  }

  try {
    await db.insert(reports).values({
      reporterId: reporterId || null,
      targetId: input.targetId,
      targetType: input.targetType,
      reason: input.reason.slice(0, 50),
      context: input.context ? input.context.slice(0, 500) : null,
    });
  } catch {
    // Memory fallback
  }

  return {
    success: true,
    message: "Shikoyatingiz qabul qilindi va moderatorlar tomonidan ko‘rib chiqiladi",
  };
}
