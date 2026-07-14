import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageScope } from "@/components/layout/PageScope";
import { MobileNav } from "@/components/layout/MobileNav";
import { MusicProvider } from "@/components/ui/MusicContext";
import { FloatingMusicWidget } from "@/components/ui/FloatingMusicWidget";
import { ThemeInitScript } from "@/components/ui/ThemeToggle";
import { NotificationProvider } from "@/components/ui/NotificationContext";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { LeaveStatusBanner } from "@/components/ui/LeaveStatusBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CoC Tracker",
  description: "Theo dõi Clan Clash of Clans",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CoC Tracker",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#F4A130",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <head>
        <ThemeInitScript />
      </head>
      <body className={inter.className}>
        <MusicProvider>
        <NotificationProvider>
        <ConfirmProvider>
        <div className="min-h-screen bg-gray-950 flex">
          <Sidebar />
          <div className="flex-1 md:ml-60 flex flex-col min-h-screen min-w-0">
            <PageScope>{children}</PageScope>
          </div>
          <MobileNav />
          <FloatingMusicWidget />
          <CustomCursor />
          <LeaveStatusBanner />
        </div>
        </ConfirmProvider>
        </NotificationProvider>
        </MusicProvider>
      </body>
    </html>
  );
}
