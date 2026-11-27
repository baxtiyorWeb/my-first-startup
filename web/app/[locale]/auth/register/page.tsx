import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Ro‘yxatdan o‘tish — The Go-getters",
  description: "The Go-getters innovatsion va intellektual hamjamiyatiga a’zo bo‘ling",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#000000]">
      <AuthForm mode="register" />
    </div>
  );
}
