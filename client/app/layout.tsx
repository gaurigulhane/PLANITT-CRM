import "../styles/globals.css";
import { BackendKeepAlive } from "@/components/providers/backend-keepalive";
import { SocketProvider } from "@/components/providers/socket-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DEFAULT_CRM_THEME } from "@/lib/theme-storage";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  adjustFontFallback: true,
});

/** Set in Vercel (or .env.local) after Google Search Console → HTML tag verification gives you the content value. */
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  title: "Planitt CRM",
  description: "Internal CRM for sales, follow-ups, and team workflows.",
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7ff" },
    { media: "(prefers-color-scheme: dark)", color: "#071120" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" data-theme={DEFAULT_CRM_THEME} suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans antialiased`}>
        <ThemeProvider>
          <BackendKeepAlive />
          <SocketProvider>{children}</SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
