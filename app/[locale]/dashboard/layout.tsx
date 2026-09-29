import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "The Go-getters — Intiluvchan insonlar, g'oyalar va startaplar tarmog'i",
  description: "O‘zbekiston foydalanuvchilari uchun bilim, g‘oya va startaplar almashish maydoni",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}