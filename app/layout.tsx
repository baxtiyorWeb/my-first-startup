import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth/auth-context";
import { ThemeProvider } from "@/components/theme/theme-context";
import { OneSignalInitializer } from "@/components/notifications/onesignal-initializer";
import { AuthedPushModal } from "@/components/notifications/authed-push-modal";
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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.geters.uz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Geters — Dasturchilar va Startapchilar Ekotizimi",
    template: "%s | Geters",
  },
  description:
    "Dasturlash tillari, zamonaviy texnologiyalar, IT lug'ati, cheat sheetlar va dasturchilar uchun nufuzli bilim markazi.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Geters",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "Geters",
    title: "Geters — Dasturchilar va Startapchilar Ekotizimi",
    description:
      "Dasturlash tillari, zamonaviy texnologiyalar, IT lug'ati, cheat sheetlar va dasturchilar uchun nufuzli bilim markazi.",
    url: SITE_URL,
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Geters Platformasi",
      },
    ],
  },
  twitter: {
    card: "summary",
    site: "@geters_uz",
    creator: "@geters_uz",
    title: "Geters — Dasturchilar va Startapchilar Ekotizimi",
    description:
      "Dasturlash tillari, zamonaviy texnologiyalar, IT lug'ati, cheat sheetlar va dasturchilar uchun nufuzli bilim markazi.",
    images: ["/logo.png"],
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
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          defer
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.OneSignalDeferred = window.OneSignalDeferred || [];
              OneSignalDeferred.push(async function(OneSignal) {
                await OneSignal.init({
                  appId: "b0efd544-a3b8-4042-af7a-8174027858c8",
                  safari_web_id: "web.onesignal.auto.48cecb45-b9e1-42c4-afaa-e45f7f034833",
                  allowLocalhostAsSecureOrigin: true,
                  notifyButton: {
                    enable: true,
                    position: 'bottom-right',
                    size: 'medium',
                  },
                  promptOptions: {
                    slidedown: {
                      prompts: [
                        {
                          type: "push",
                          autoPrompt: true,
                          text: {
                            actionMessage: "Yangi postlar va muhim yangiliklardan xabardor bo'lishni xohlaysizmi?",
                            acceptButton: "Ruxsat berish",
                            cancelButton: "Keyinroq"
                          }
                        }
                      ]
                    }
                  }
                });
              });
            `,
          }}
        />
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
              <AuthedPushModal />
              <InstallModal />
              <MobileInstallBanner />
            </PwaInstallProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
