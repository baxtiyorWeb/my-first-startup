import { notFound } from "next/navigation";
import React from "react";

/**
 * Server-side guard for Admin Panel.
 * Admin panel is restricted to local development environment only,
 * unless explicitly enabled via ENABLE_ADMIN_PANEL=true.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isProduction = process.env.NODE_ENV === "production";
  const isExplicitlyAllowed = process.env.ENABLE_ADMIN_PANEL === "true";

  if (isProduction && !isExplicitlyAllowed) {
    notFound();
  }

  return <>{children}</>;
}
