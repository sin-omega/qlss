import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
<<<<<<< HEAD
import { Providers } from "@/components/qlss/providers";
import "./globals.css";
=======
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "QLSS",
  description: "QLSS — link shortener",
  icons: {
<<<<<<< HEAD
    icon: "/logo.svg",
  },
=======
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${robotoMono.variable} antialiased bg-background text-foreground`}
      >
<<<<<<< HEAD
        <Providers>{children}</Providers>
=======
        {children}
        <Toaster />
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
      </body>
    </html>
  );
}
