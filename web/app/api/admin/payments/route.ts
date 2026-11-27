import { type NextRequest, NextResponse } from "next/server";
import { enforceAdminGuard } from "@/server/common/admin-guard";
import {
  listPaymentTransactions,
  reconcileInpayPayment,
} from "@/server/modules/pricing/pricing.service";
import { errorResponse } from "@/server/common/response";

export async function GET(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;

  try {
    const { searchParams } = new URL(req.url);
    const data = await listPaymentTransactions({
      status: searchParams.get("status") || undefined,
      provider: searchParams.get("provider") || undefined,
      limit: Number(searchParams.get("limit") || 50),
      offset: Number(searchParams.get("offset") || 0),
    });

    const response = NextResponse.json({ success: true, data });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : "";

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Tranzaksiya ID si ko'rsatilmadi" },
        { status: 400 }
      );
    }

    const result = await reconcileInpayPayment({ transactionId: id });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
