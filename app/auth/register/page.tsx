import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Ro‘yxatdan o‘tish — Fikr",
  description: "Fikr intellektual va munozara tarmog‘iga a’zo bo‘ling",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50 dark:bg-slate-950">
      <AuthForm mode="register" />
    </div>
  );
}
