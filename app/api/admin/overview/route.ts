import { NextResponse } from "next/server";
import { botService } from "@/server/bot-engine/bot-service";

export async function GET() {
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
