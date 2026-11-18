import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Tizimga kirish — The Go-getters",
  description: "The Go-getters innovatsion va startaplar tarmog‘iga xavfsiz kiring",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50 dark:bg-slate-950">
      <AuthForm mode="login" />
    </div>
  );
}
