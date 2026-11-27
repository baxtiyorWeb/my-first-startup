import { type NextRequest, NextResponse } from "next/server";
import { enforceAdminGuard } from "@/server/common/admin-guard";
import { AppError } from "@/server/common/errors";
import {
  checkInpayConnection,
  inpayConfigStatus,
} from "@/server/modules/pricing/inpay.client";

/**
 * Kassa wiring for the admin panel. Real keys are never returned — only their
 * presence — so the indicator can be rendered in the browser safely.
 */
export async function GET(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;

  const response = NextResponse.json({ success: true, data: inpayConfigStatus() });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/** Runs a real authorization call against inPAY to prove the keys work. */
export async function POST(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;

  try {
    const { latencyMs } = await checkInpayConnection();
    return NextResponse.json({ success: true, data: { ok: true, latencyMs } });
  } catch (error) {
    // A rejected key is a normal outcome of this check, not a server failure.
    const message =
      error instanceof AppError
        ? error.message
        : "To'lov tizimiga ulanib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.";
    return NextResponse.json({ success: true, data: { ok: false, message } });
  }
}
