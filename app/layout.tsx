import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth/auth-context";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Go-getters — O‘zbekiston Innovatorlari Ijtimoiy Tarmog‘i",
  description: "Maqsadi baland tadbirkorlar, dasturchilar, startapchilar va g‘oya egalari uchun ijtimoiy tarmoq",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="uz"
      className={`h-full antialiased font-sans ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} min-h-full flex flex-col font-sans`}>
        <svg
          width="0"
          height="0"
          className="absolute w-0 h-0 overflow-hidden"
          style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </svg>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
