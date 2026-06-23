import type { Metadata, Viewport } from "next";
import { Roboto_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/qlss/providers";
import { CookieConsent } from "@/components/qlss/cookie-consent";
import { PwaRegister } from "@/components/qlss/pwa-register";
import { CommandPalette } from "@/components/qlss/command-palette";
import { LANG_COOKIE, parseLangCookie, type Lang } from "@/lib/i18n";
import "./globals.css";

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "QLSS",
  description: "QLSS — link shortener",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "QLSS",
  },
  icons: {
    icon: "/logo.svg",
    apple: "/icon-192.svg",
  },
};

// `themeColor` lives in the Viewport export per Next.js 14+ Metadata API.
export const viewport: Viewport = {
  themeColor: "#0a0a09",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get(LANG_COOKIE)?.value;
  const lang: Lang = parseLangCookie(langCookie);

  // NOTE: We intentionally do NOT call setLanguage() here. Module-level state
  // on the server is shared across concurrent requests, causing a race where
  // one request's language leaks into another. Instead, server components
  // render in English (the default), and client components (the home page and
  // all interactive UI) switch reactively via the Providers effect + the
  // qlss-lang-change event. The <html lang> attribute is set correctly for
  // accessibility/SEO.
  return (
    <html lang={lang} suppressHydrationWarning>
      <body
        className={`${robotoMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <CookieConsent />
          <CommandPalette />
        </Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
