import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Fikr — O‘zbekiston intellektual tarmog‘i",
  description: "O‘zbekiston foydalanuvchilari uchun bilim va fikr almashish maydoni",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}