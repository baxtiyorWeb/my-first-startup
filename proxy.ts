import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE, isValidLocale } from "./lib/i18n/config";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Check if path starts with a supported locale
  const pathnameLocale = LOCALES.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameLocale) {
    // Already has locale
    const cookieLocale = request.cookies.get("fikr_locale")?.value;
    const response = NextResponse.next();

    // Sync cookie if different
    if (cookieLocale !== pathnameLocale) {
      response.cookies.set("fikr_locale", pathnameLocale, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
    }

    return response;
  }

  // 2. Resolve preferred locale for requests without locale prefix
  let targetLocale = DEFAULT_LOCALE;

  const cookieLocale = request.cookies.get("fikr_locale")?.value;
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
  response.cookies.set("fikr_locale", targetLocale, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: [
    // Skip all internal paths (_next), API routes, and static files with extensions
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
