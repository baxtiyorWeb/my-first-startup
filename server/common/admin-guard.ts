import { NextRequest, NextResponse } from "next/server";
import { requireAuth, type AuthUserPayload } from "./auth-guard";

/**
 * Checks if admin access is allowed and verifies caller identity and role.
 * 1. In production, hides admin endpoints with 404 unless ENABLE_ADMIN_PANEL=true.
 * 2. Enforces authentication via requireAuth(req).
 * 3. Enforces RBAC: caller must be in ADMIN_EMAILS or have role === "ADMIN" / "SUPER_ADMIN".
 */
export async function enforceAdminGuard(
  req: NextRequest
): Promise<NextResponse | null> {
  const isProduction = process.env.NODE_ENV === "production";
  const isExplicitlyAllowed = process.env.ENABLE_ADMIN_PANEL === "true";

  // Disguise admin endpoint in production if not explicitly enabled
  if (isProduction && !isExplicitlyAllowed) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 }
    );
  }

  // 1. Enforce Authentication
  let authUser: AuthUserPayload;
  try {
    authUser = await requireAuth(req);
  } catch {
    return NextResponse.json(
      { success: false, error: "Avtorizatsiya talab qilinadi" },
      { status: 401 }
    );
  }

  // 2. Enforce Role-Based Access Control (RBAC)
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const userEmail = (authUser.email || "").toLowerCase();
  const userRole = (authUser.role || "").toUpperCase();

  const isRoleAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isEmailAdmin = adminEmails.length > 0 && adminEmails.includes(userEmail);
  const isDevAllowed = !isProduction; // in local development, allow authenticated user

  if (!isRoleAdmin && !isEmailAdmin && !isDevAllowed) {
    return NextResponse.json(
      { success: false, error: "Taqiqlangan: Sizda admin huquqlari mavjud emas" },
      { status: 403 }
    );
  }

  return null;
}
