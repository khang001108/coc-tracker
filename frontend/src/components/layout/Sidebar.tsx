"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Swords, Castle, Gamepad2,
  Heart, Users, BarChart3, Settings, Shield, PartyPopper
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",          label: "Tổng quan",    icon: LayoutDashboard },
  { href: "/war",       label: "War & CWL",    icon: Swords },
  { href: "/capital",   label: "Clan Capital", icon: Castle },
  { href: "/games",     label: "Clan Games",   icon: Gamepad2 },
  { href: "/donate",    label: "Donate",       icon: Heart },
  { href: "/members",   label: "Thành viên",   icon: Users },
  { href: "/events",    label: "Sự kiện",      icon: PartyPopper },
  { href: "/stats",     label: "Thống kê",     icon: BarChart3 },
  { href: "/settings",  label: "Cài đặt",      icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 bg-gray-900 border-r border-gray-800 flex-col fixed h-full z-20">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-gold-pulse"
            style={{ background: "linear-gradient(135deg, #F4A130, #8B4513)" }}>
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white leading-tight">CoC Tracker</p>
            <p className="text-xs text-yellow-500/70">Clash of Clans</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              )}>
              <Icon size={17} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800 space-y-2">
        <a href="https://link.clashofclans.com/" target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-transform hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #F4A130, #8B4513)" }}>
          <Shield size={15} /> Vào Clash of Clans
        </a>
        <p className="text-xs text-gray-600 text-center">Powered by Supercell API</p>
      </div>
    </aside>
  );
}
