import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { MusicPlayer } from "@/components/ui/MusicPlayer";
import { ThemeInitScript } from "@/components/ui/ThemeToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CoC Tracker",
  description: "Theo dõi Clan Clash of Clans",
  manifest: "/site.webmanifest",
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
  themeColor: "#F4A130",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <head>
        <ThemeInitScript />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-950 flex">
          {/* Desktop sidebar */}
          <Sidebar />

          {/* Main */}
          <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
            <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-x-hidden">
              {children}
            </main>
          </div>

          {/* Mobile bottom nav */}
          <MobileNav />

          {/* Nhạc nền — luôn mount, không bị gián đoạn khi chuyển trang */}
          <MusicPlayer />
        </div>
      </body>
    </html>
  );
}
