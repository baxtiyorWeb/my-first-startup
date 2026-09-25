import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE, isValidLocale } from "./lib/i18n/config";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 0. Handle CORS and Preflight for all API routes
  if (pathname.startsWith("/api")) {
    const origin = request.headers.get("origin") || "*";

    // Handle OPTIONS preflight requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    return response;
  }

  // 1. Check if path starts with a supported locale
  const pathnameLocale = LOCALES.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameLocale) {
    // Already has locale
    const cookieLocale = request.cookies.get("gogetters_locale")?.value;
    const response = NextResponse.next();

    // Sync cookie if different
    if (cookieLocale !== pathnameLocale) {
      response.cookies.set("gogetters_locale", pathnameLocale, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
    }

    return response;
  }

  // 2. Resolve preferred locale for requests without locale prefix
  let targetLocale = DEFAULT_LOCALE;

  const cookieLocale = request.cookies.get("gogetters_locale")?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    targetLocale = cookieLocale;
  } else {
    // Check accept-language header
    const acceptLang = request.headers.get("accept-language");
    if (acceptLang) {
      const lower = acceptLang.toLowerCase();
      if (lower.startsWith("ru") || lower.includes(",ru")) {
        targetLocale = "ru";
      } else if (lower.startsWith("en") || lower.includes(",en")) {
        targetLocale = "en";
      }
    }
  }

  // 3. Redirect to /[locale]/...
  const redirectUrl = new URL(
    `/${targetLocale}${pathname === "/" ? "" : pathname}${search}`,
    request.url
  );

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("gogetters_locale", targetLocale, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: [
    // 1. All API routes for CORS & OPTIONS preflights
    "/api/:path*",
    // 2. All pages except internal assets, images, and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
