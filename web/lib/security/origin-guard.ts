export interface OriginGuardInput {
  method: string;
  pathname: string;
  requestUrl: string;
  originHeader: string | null;
  hostHeader: string | null;
  forwardedHostHeader: string | null;
  forwardedProtoHeader: string | null;
  authorizationHeader: string | null;
  hasSessionCookie: boolean;
  env?: Record<string, string | undefined>;
}

export interface OriginGuardResult {
  origin: string | null;
  isAllowedOrigin: boolean;
  isStateChanging: boolean;
  isWebhook: boolean;
  shouldBlockCsrf: boolean;
}

const SAFE_HOST_REGEX = /^[a-zA-Z0-9.-]+(:\d+)?$/;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizeHost(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim().toLowerCase();
  if (!first || !SAFE_HOST_REGEX.test(first)) return null;
  return first;
}

function normalizeProto(raw: string | null, fallback = "https"): string {
  if (!raw) return fallback;
  const first = raw.split(",")[0]?.trim().toLowerCase().replace(/:$/, "");
  if (first === "http" || first === "https") return first;
  return fallback;
}

function addOriginWithWwwSibling(set: Set<string>, rawUrl: string | undefined): void {
  if (!rawUrl) return;
  const trimmed = rawUrl.trim();
  if (!trimmed) return;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;

    const baseOrigin = parsed.origin.toLowerCase();
    set.add(baseOrigin);

    const host = parsed.hostname.toLowerCase();
    const portSuffix = parsed.port ? `:${parsed.port}` : "";
    const isIpOrLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host);

    if (!isIpOrLocal && host.includes(".")) {
      if (host.startsWith("www.")) {
        set.add(`${parsed.protocol}//${host.slice(4)}${portSuffix}`);
      } else {
        set.add(`${parsed.protocol}//www.${host}${portSuffix}`);
      }
    }
  } catch {
    // Ignore invalid URL strings in env
  }
}

function stripWww(hostname: string): string {
  const lower = hostname.toLowerCase();
  return lower.startsWith("www.") ? lower.slice(4) : lower;
}

function isDevLocalOrigin(parsedOrigin: URL): boolean {
  if (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") {
    return false;
  }
  const host = parsedOrigin.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

function isWebhookPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/subscriptions/webhook") ||
    pathname.startsWith("/api/subscriptions/revenuecat/webhook") ||
    pathname.startsWith("/api/webhooks/")
  );
}

/**
 * Evaluates CORS & CSRF Origin safety for `/api/*` requests.
 *
 * Allows:
 *  - Exact same-origin requests (comparing Origin against X-Forwarded-Host/Host + Proto and request.url)
 *  - Same-site apex <-> www siblings on the same protocol (e.g. geters.uz <-> www.geters.uz)
 *  - Explicitly configured app/site/Vercel/CORS origins (and their www/apex siblings)
 *  - Localhost / LAN dev origins when NODE_ENV !== "production"
 *
 * Blocks:
 *  - Cross-origin state-changing cookie-authenticated requests from untrusted third-party domains.
 */
export function evaluateApiOrigin(input: OriginGuardInput): OriginGuardResult {
  const env = input.env ?? process.env;
  const isProduction = env.NODE_ENV === "production";
  const method = input.method.toUpperCase();
  const isStateChanging = !SAFE_METHODS.has(method);
  const isWebhook = isWebhookPath(input.pathname);

  const rawOrigin = input.originHeader?.trim() || null;
  if (!rawOrigin) {
    return {
      origin: null,
      isAllowedOrigin: false,
      isStateChanging,
      isWebhook,
      shouldBlockCsrf: false,
    };
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(rawOrigin);
  } catch {
    return {
      origin: rawOrigin,
      isAllowedOrigin: false,
      isStateChanging,
      isWebhook,
      shouldBlockCsrf: isStateChanging && !isWebhook,
    };
  }

  const normalizedOrigin = parsedOrigin.origin.toLowerCase();

  // 1. Build explicit allowlist from environment configuration
  const allowedOrigins = new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  addOriginWithWwwSibling(allowedOrigins, env.NEXT_PUBLIC_APP_URL);
  addOriginWithWwwSibling(allowedOrigins, env.NEXT_PUBLIC_SITE_URL);
  addOriginWithWwwSibling(allowedOrigins, env.APP_URL);
  addOriginWithWwwSibling(allowedOrigins, env.VERCEL_PROJECT_PRODUCTION_URL);
  addOriginWithWwwSibling(allowedOrigins, env.VERCEL_URL);
  addOriginWithWwwSibling(allowedOrigins, env.VERCEL_BRANCH_URL);

  if (env.CORS_ALLOWED_ORIGINS) {
    for (const item of env.CORS_ALLOWED_ORIGINS.split(",")) {
      addOriginWithWwwSibling(allowedOrigins, item);
    }
  }

  let isAllowed = allowedOrigins.has(normalizedOrigin);

  // 2. Check same-origin against the request's own host & forwarded host headers
  if (!isAllowed) {
    const requestOrigins = new Set<string>();

    try {
      const reqUrl = new URL(input.requestUrl);
      if (reqUrl.protocol === "http:" || reqUrl.protocol === "https:") {
        addOriginWithWwwSibling(requestOrigins, reqUrl.origin);
      }
    } catch {
      // ignore malformed requestUrl
    }

    const fwdHost = normalizeHost(input.forwardedHostHeader);
    const directHost = normalizeHost(input.hostHeader);
    const reqUrlProto = (() => {
      try {
        return new URL(input.requestUrl).protocol.replace(/:$/, "");
      } catch {
        return "https";
      }
    })();

    for (const candidateHost of [fwdHost, directHost]) {
      if (!candidateHost) continue;
      const isLocal =
        candidateHost.startsWith("localhost") ||
        candidateHost.startsWith("127.0.0.1");
      const proto = normalizeProto(
        input.forwardedProtoHeader,
        isLocal ? "http" : reqUrlProto
      );
      addOriginWithWwwSibling(requestOrigins, `${proto}://${candidateHost}`);
    }

    if (requestOrigins.has(normalizedOrigin)) {
      isAllowed = true;
    } else if (fwdHost || directHost) {
      // Handle reverse-proxy edge cases where internal proto is http while public edge is https:
      // still enforce exact host (or apex/www sibling) match and require https in production.
      const originHostWithPort = parsedOrigin.host.toLowerCase();
      const originBaseHost = stripWww(parsedOrigin.hostname);
      const originPort = parsedOrigin.port;

      for (const candidateHost of [fwdHost, directHost]) {
        if (!candidateHost) continue;
        const [candName, candPort = ""] = candidateHost.split(":");
        if (
          originHostWithPort === candidateHost ||
          (originBaseHost === stripWww(candName) && originPort === candPort)
        ) {
          if (!isProduction || parsedOrigin.protocol === "https:") {
            isAllowed = true;
            break;
          }
        }
      }
    }
  }

  // 3. In non-production, allow local/LAN development origins (e.g., localhost:3001, 192.168.x.x)
  if (!isAllowed && !isProduction && isDevLocalOrigin(parsedOrigin)) {
    isAllowed = true;
  }

  // 4. Bearer-token requests without a session cookie are not vulnerable to cookie CSRF
  const hasBearerAuth = Boolean(
    input.authorizationHeader?.trim().toLowerCase().startsWith("bearer ")
  );
  const isBearerOnly = hasBearerAuth && !input.hasSessionCookie;

  const shouldBlockCsrf =
    isStateChanging && !isAllowed && !isWebhook && !isBearerOnly;

  return {
    origin: rawOrigin,
    isAllowedOrigin: isAllowed,
    isStateChanging,
    isWebhook,
    shouldBlockCsrf,
  };
}
