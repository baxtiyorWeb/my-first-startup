import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { sendOneSignalPush } from "@/server/modules/notifications/notifications.service";

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OneSignal kalitlari topilmadi. Iltimos, .env faylida NEXT_PUBLIC_ONESIGNAL_APP_ID va ONESIGNAL_REST_API_KEY parametrlarini sozlang.",
          configured: false,
        },
        { status: 400 }
      );
    }

    const result = await sendOneSignalPush(
      [authUser.userId],
      "The Go-getters 🚀",
      `Salom, ${authUser.name}! Bu OneSignal orqali yuborilgan sinov xabarnomasi. Tizim to‘liq sozlandi!`,
      "/dashboard/notifications"
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "OneSignal xizmati xabarni yetkaza olmadi.",
          configured: true,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sinov bildirishnomasi muvaffaqiyatli yuborildi!",
      userId: authUser.userId,
      configured: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Server xatoligi yuz berdi" },
      { status: err?.statusCode || 500 }
    );
  }
}
