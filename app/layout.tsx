import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth/auth-context";

export const metadata: Metadata = {
  title: "Fikr — O‘zbekiston intellektual tarmog‘i",
  description: "O‘zbekiston foydalanuvchilari uchun tinch, mazmunli va foydali ijtimoiy tarmoq",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="uz"
      className="h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
