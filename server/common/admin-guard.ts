import { NextResponse } from "next/server";

/**
 * Checks if admin access is allowed.
 * By default, admin endpoints are strictly restricted to local development.
 * In production, it returns 404 (Not Found) to disguise the endpoint completely.
 */
export function isLocalOrAdminAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return process.env.ENABLE_ADMIN_PANEL === "true";
}

export function enforceAdminGuard(): NextResponse | null {
  if (!isLocalOrAdminAllowed()) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 }
    );
  }
  return null;
}
