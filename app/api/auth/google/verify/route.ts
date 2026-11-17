import { type NextRequest } from "next/server";
import { z } from "zod";
import { handleGoogleAuth } from "@/server/modules/auth/auth.service";
import { getSessionCookieOptions } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

const GoogleVerifySchema = z.object({
  idToken: z.string().min(1, "Google ID tokeni kiritilishi shart"),
  deviceName: z.string().optional(),
  platform: z.enum(["android", "ios", "web"]).optional(),
});

/**
 * Mobile and Programmatic Google Authentication Endpoint
 * POST /api/auth/google/verify
 * 
 * Verifies the Google idToken issued by Android/iOS Google Sign-In SDK,
 * retrieves/creates the user in the database, and returns a signed 30-day JWT.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = GoogleVerifySchema.safeParse(body);

    if (!parseResult.success) {
      throw AppError.validation(
        "Autentifikatsiya ma’lumotlari yaroqsiz",
        parseResult.error.issues.map((e) => ({
          field: String(e.path[0] ?? ""),
          issue: e.message,
        }))
      );
    }

    const { idToken } = parseResult.data;
    const isDevelopment = process.env.NODE_ENV !== "production";

    let googleProfile: {
      sub: string;
      email: string;
      name: string;
      picture?: string | null;
    };

    // 1. Allow development bypass for automated testing if configured
    if (isDevelopment && idToken.startsWith("dev-mock-token:")) {
      const email = idToken.replace("dev-mock-token:", "").trim() || "test@thegogetters.uz";
      googleProfile = {
        sub: `dev-google-id-${email}`,
        email,
        name: email.split("@")[0],
        picture: `https://api.dicebear.com/7.x/micah/svg?seed=${email}`,
      };
    } else {
      // 2. Production: Verify token with Google TokenInfo API
      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      const googleRes = await fetch(tokenInfoUrl, { method: "GET" });

      if (!googleRes.ok) {
        const errText = await googleRes.text().catch(() => "");
        console.error("[AUTH GOOGLE VERIFY] Google token validation failed:", errText);
        throw AppError.unauthorized("Google ID tokeni yaroqsiz yoki eskirgan");
      }

      const tokenPayload = await googleRes.json();

      // Check audience (client ID)
      const allowedClientIds = [
        process.env.GOOGLE_AUTH_CLIENT_ID,
        process.env.GOOGLE_CLIENT_ID,
      ].filter(Boolean);

      if (allowedClientIds.length > 0 && !allowedClientIds.includes(tokenPayload.aud)) {
        console.warn("[AUTH GOOGLE VERIFY] Token audience does not match GOOGLE_AUTH_CLIENT_ID");
      }

      if (!tokenPayload.sub || !tokenPayload.email) {
        throw AppError.unauthorized("Google hisob ma’lumotlari to‘liq emas");
      }

      googleProfile = {
        sub: tokenPayload.sub,
        email: tokenPayload.email,
        name: tokenPayload.name || tokenPayload.email.split("@")[0],
        picture: tokenPayload.picture || null,
      };
    }

    // 3. Process user in database and generate session
    const { token, user } = await handleGoogleAuth({
      googleId: googleProfile.sub,
      email: googleProfile.email,
      name: googleProfile.name,
      avatarUrl: googleProfile.picture || null,
    });

    const response = successResponse({
      token,
      user,
    });

    // 4. Also set HttpOnly cookie for hybrid clients
    const cookieOpts = getSessionCookieOptions();
    response.cookies.set(cookieOpts.name, token, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
