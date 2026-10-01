import { type NextRequest } from "next/server";

/**
 * Accurately resolve the public base origin (protocol + host) of the application.
 * Handles reverse proxies (Vercel, Cloudflare, Nginx, Docker) by inspecting
 * X-Forwarded-Host and X-Forwarded-Proto before falling back to local defaults.
 * Prevents production from accidentally redirecting to localhost:3000.
 */
export function getAppOrigin(req: NextRequest): string {
  // 1. Authoritative environment variable in production
  const envUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL
  )?.replace(/\/$/, "");

  if (envUrl && process.env.NODE_ENV === "production" && !envUrl.includes("localhost")) {
    return envUrl;
  }

  // 2. Vercel deployment system environment variables (trusted system-level envs)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  // 3. Fallback to request host headers in local / container environments
  const hostHeader = req.headers.get("host") || req.headers.get("x-forwarded-host");
  if (hostHeader) {
    const cleanHost = hostHeader.split(",")[0].trim();
    // Validate host format (alphanumeric, dots, dashes, optional port)
    if (/^[a-zA-Z0-9.-]+(:\d+)?$/.test(cleanHost)) {
      const proto = req.headers.get("x-forwarded-proto") || (cleanHost.includes("localhost") ? "http" : "https");
      return `${proto}://${cleanHost}`;
    }
  }

  return envUrl || "http://localhost:3000";
}
