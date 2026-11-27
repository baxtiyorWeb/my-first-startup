import type { ReportTargetType } from "@/types/social";
import { apiClient } from "./client";

export interface ReportPayload {
  targetId: string;
  targetType: ReportTargetType;
  reason: string;
  context?: string;
}

export async function createReport(payload: ReportPayload) {
  const res = await apiClient<{ success: boolean; reportId: string }>("/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
