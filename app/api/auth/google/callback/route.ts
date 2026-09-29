import { NextResponse, type NextRequest } from "next/server";
import { handleGoogleAuth } from "@/server/modules/auth/auth.service";
import { getSessionCookieOptions } from "@/server/common/auth-guard";
import { DEFAULT_LOCALE, isValidLocale } from "@/lib/i18n/config";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const rawState = searchParams.get("state");
  const error = searchParams.get("error");

  let locale = DEFAULT_LOCALE;
  if (rawState) {
    try {
      const decoded = JSON.parse(Buffer.from(rawState, "base64url").toString("utf-8"));
      if (decoded.locale && isValidLocale(decoded.locale)) {
        locale = decoded.locale;
      }
    } catch {
      // Use default locale
    }
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    req.nextUrl.origin ||
    "http://localhost:3000";

  if (error || !code) {
    console.error("[GOOGLE AUTH CALLBACK] Error or missing code:", error);
    return NextResponse.redirect(`${origin}/${locale}/auth/login?error=google_auth_failed`);
  }

  const clientId = process.env.GOOGLE_AUTH_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_AUTH_CLIENT_SECRET || process.env.GOOGLE_AUTH__CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[GOOGLE AUTH CALLBACK] Missing Google OAuth credentials in environment");
    return NextResponse.redirect(`${origin}/${locale}/auth/login?error=server_config_error`);
  }

  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[GOOGLE AUTH CALLBACK] Token exchange failed:", errText);
      return NextResponse.redirect(`${origin}/${locale}/auth/login?error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google UserInfo endpoint
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoRes.ok) {
      console.error("[GOOGLE AUTH CALLBACK] Failed to fetch Google user info");
      return NextResponse.redirect(`${origin}/${locale}/auth/login?error=userinfo_failed`);
    }

    const googleProfile = await userinfoRes.json();

    if (!googleProfile.sub || !googleProfile.email) {
      console.error("[GOOGLE AUTH CALLBACK] Incomplete profile received from Google");
      return NextResponse.redirect(`${origin}/${locale}/auth/login?error=incomplete_profile`);
    }

    // 3. Process user in database and issue session
    const { token, user } = await handleGoogleAuth({
      googleId: googleProfile.sub,
      email: googleProfile.email,
      name: googleProfile.name || googleProfile.email.split("@")[0],
      avatarUrl: googleProfile.picture || null,
    });

    // 4. Set session cookie
    const cookieOpts = getSessionCookieOptions();

    // 5. Determine destination:
    // If not onboarded -> go to /onboarding (where they enter/confirm username (@handle), name, role, bio)
    // If already onboarded -> go to /dashboard
    const targetPath = user.isOnboarded ? `/${locale}/dashboard` : `/${locale}/onboarding`;
    const response = NextResponse.redirect(`${origin}${targetPath}`);

    response.cookies.set(cookieOpts.name, token, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });

    return response;
  } catch (err) {
    console.error("[GOOGLE AUTH CALLBACK] Unexpected error:", err);
    return NextResponse.redirect(`${origin}/${locale}/auth/login?error=auth_internal_error`);
  }
}
