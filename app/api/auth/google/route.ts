import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isValidLocale } from "@/lib/i18n/config";
import { getAppOrigin } from "@/server/common/origin";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_AUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_AUTH_CLIENT_ID is not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const rawLocale = searchParams.get("locale") || DEFAULT_LOCALE;
  const locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const mode = searchParams.get("mode") || "login";

  // State encodes locale and mode so callback can preserve language
  const state = Buffer.from(JSON.stringify({ locale, mode })).toString("base64url");

  // Determine redirect URI dynamically from public origin
  const origin = getAppOrigin(req);
  const redirectUri = `${origin}/api/auth/google/callback`;

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(googleAuthUrl.toString());
}
