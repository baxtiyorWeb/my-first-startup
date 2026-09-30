import { NextResponse } from "next/server";
import { botService } from "@/server/bot-engine/bot-service";
import { enforceAdminGuard } from "@/server/common/admin-guard";

export async function GET() {
  const guardResponse = enforceAdminGuard();
  if (guardResponse) return guardResponse;
  try {
    const stats = await botService.getOverviewStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("[ADMIN_OVERVIEW_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
