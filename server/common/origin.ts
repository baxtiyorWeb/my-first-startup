import { type NextRequest } from "next/server";

/**
 * Accurately resolve the public base origin (protocol + host) of the application.
 * Handles reverse proxies (Vercel, Cloudflare, Nginx, Docker) by inspecting
 * X-Forwarded-Host and X-Forwarded-Proto before falling back to local defaults.
 * Prevents production from accidentally redirecting to localhost:3000.
 */
export function getAppOrigin(req: NextRequest): string {
  // 1. Check incoming request host headers (standard on Vercel, Cloudflare, Nginx, AWS)
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
    // If the request arrived at a real public domain, always use that domain!
    if (!isLocalhost) {
      const proto = req.headers.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`;
    }
  }

  const hostHeader = req.headers.get("host");
  if (hostHeader) {
    const isLocalhost = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");
    if (!isLocalhost) {
      const proto = req.headers.get("x-forwarded-proto") || "https";
      return `${proto}://${hostHeader}`;
    }
  }

  // 2. Explicit environment variable if valid and not pointing to localhost
  const envUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL
  )?.replace(/\/$/, "");

  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }

  // 3. Vercel deployment system environment variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  // 4. NextURL origin if not localhost
  if (req.nextUrl && req.nextUrl.origin) {
    const nextOrigin = req.nextUrl.origin;
    if (!nextOrigin.includes("localhost") && !nextOrigin.includes("127.0.0.1")) {
      return nextOrigin;
    }
  }

  return envUrl || "http://localhost:3000";
}
