import { NextRequest, NextResponse } from "next/server";
import { enforceAdminGuard } from "@/server/common/admin-guard";
import {
  listAccountDeletionRequests,
  resolveAccountDeletionRequest,
} from "@/server/modules/account-deletion/account-deletion.service";

export async function GET(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 100), 200);
    const offset = Number(searchParams.get("offset") || 0);

    const requests = await listAccountDeletionRequests(limit, offset);

    return NextResponse.json({
      success: true,
      data: { requests, total: requests.length },
    });
  } catch (error) {
    console.error("[ADMIN_ACCOUNT_DELETIONS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const requestId = typeof body.id === "string" ? body.id : "";
    const action = body.action === "reject" ? "reject" : "approve";

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "So'rov ID si ko'rsatilmadi" },
        { status: 400 }
      );
    }

    const result = await resolveAccountDeletionRequest(
      requestId,
      action,
      typeof body.adminNote === "string" ? body.adminNote : null
    );

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error("[ADMIN_ACCOUNT_DELETIONS_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
