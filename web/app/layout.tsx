import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth/auth-context";
import { ThemeProvider } from "@/components/theme/theme-context";
import { ContentFormatProvider } from "@/components/format";
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
  themeColor: "#000000",
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

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "";
const ONESIGNAL_SAFARI_WEB_ID = process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID || "";

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
        {ONESIGNAL_APP_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.OneSignalDeferred = window.OneSignalDeferred || [];
                window.__onesignal_initialized = false;
                window.__onesignal_ready_promise = new Promise(function(resolve) {
                  window.OneSignalDeferred.push(async function(OneSignal) {
                    try {
                      await OneSignal.init({
                        appId: ${JSON.stringify(ONESIGNAL_APP_ID)},
                        safari_web_id: ${JSON.stringify(ONESIGNAL_SAFARI_WEB_ID)},
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
                      window.__onesignal_initialized = true;
                      resolve(OneSignal);
                    } catch (err) {
                      window.__onesignal_initialized = false;
                      resolve(null);
                    }
                  });
                });
              `,
            }}
          />
        )}
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
              <ContentFormatProvider>
                <OneSignalInitializer />
                <ToastProvider>{children}</ToastProvider>
                <AuthedPushModal />
                <InstallModal />
                <MobileInstallBanner />
              </ContentFormatProvider>
            </PwaInstallProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
