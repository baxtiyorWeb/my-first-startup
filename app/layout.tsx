import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth/auth-context";
import { ThemeProvider } from "@/components/theme/theme-context";
import { OneSignalInitializer } from "@/components/notifications/onesignal-initializer";
import {
  PwaInstallProvider,
  InstallModal,
  MobileInstallBanner,
} from "@/components/pwa";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "The Go-getters — Intiluvchan insonlar, o'ziga xos g'oyalar va yangi startaplar tarmog'i",
  description: "Maqsadi baland tadbirkorlar, dasturchilar, startapchilar va g‘oya egalari uchun ijtimoiy tarmoq",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Go-getters",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="uz"
      className={`h-full antialiased font-sans ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('gogetters_theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';}else{document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');document.documentElement.style.colorScheme='dark';}}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col font-sans`}>
        <ThemeProvider>
          <AuthProvider>
            <PwaInstallProvider>
              <OneSignalInitializer />
              <ToastProvider>{children}</ToastProvider>
              <InstallModal />
              <MobileInstallBanner />
            </PwaInstallProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
