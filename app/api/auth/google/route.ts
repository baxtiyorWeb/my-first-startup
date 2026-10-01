import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { DEFAULT_LOCALE, isValidLocale } from "@/lib/i18n/config";
import { getAppOrigin } from "@/server/common/origin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawLocale = searchParams.get("locale") || DEFAULT_LOCALE;
  const locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const mode = searchParams.get("mode") || "login";
  const origin = getAppOrigin(req);

  const clientId = process.env.GOOGLE_AUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.warn("[GOOGLE AUTH] GOOGLE_AUTH_CLIENT_ID is not set in .env");
    return NextResponse.redirect(`${origin}/${locale}/auth/${mode}?error=google_not_configured`);
  }

  // Generate cryptographically random CSRF nonce to prevent OAuth Login CSRF
  const stateNonce = crypto.randomBytes(32).toString("hex");

  // State encodes nonce, locale and mode
  const state = Buffer.from(JSON.stringify({ nonce: stateNonce, locale, mode })).toString("base64url");

  // Determine redirect URI dynamically from public origin
  const redirectUri = `${origin}/api/auth/google/callback`;

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(googleAuthUrl.toString());
  const isProduction = process.env.NODE_ENV === "production";

  // Set short-lived HttpOnly anti-CSRF state cookie
  response.cookies.set("gogetters_oauth_state", stateNonce, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
