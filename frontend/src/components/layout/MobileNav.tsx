"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Swords, Users, Settings, MoreHorizontal,
  Castle, Gamepad2, Heart, BarChart3, PartyPopper, X, Shield,
  MessageCircle, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN = [
  { href: "/",         label: "Tổng quan", icon: LayoutDashboard },
  { href: "/war",      label: "War",       icon: Swords },
  { href: "/chat",     label: "Chat",      icon: MessageCircle },
  { href: "/events",   label: "Sự kiện",   icon: PartyPopper },
];

const MORE = [
  { href: "/members",  label: "Thành viên",   icon: Users },
  { href: "/login",    label: "Đăng nhập",    icon: UserCheck },
  { href: "/capital",  label: "Clan Capital", icon: Castle },
  { href: "/games",    label: "Clan Games",   icon: Gamepad2 },
  { href: "/donate",   label: "Donate",       icon: Heart },
  { href: "/stats",    label: "Thống kê",     icon: BarChart3 },
  { href: "/settings", label: "Cài đặt",      icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = MORE.some(({ href }) => pathname.startsWith(href));

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900 border-t border-gray-800 flex items-stretch">
        {MAIN.slice(0, 2).map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors relative",
                active ? "text-yellow-400" : "text-gray-500"
              )}>
              <span className={cn("w-7 h-7 rounded-full flex items-center justify-center", active && "icon-btn-game")}>
                <Icon size={active ? 14 : 18} className={active ? "text-gray-900" : ""} />
              </span>
              <span className="text-[9px] font-medium">{label}</span>
            </Link>
          );
        })}

        {/* Khoảng trống giữa cho nút "Chơi" nổi đè lên */}
        <div className="flex-1" />

        {MAIN.slice(2).map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors relative",
                active ? "text-yellow-400" : "text-gray-500"
              )}>
              <span className={cn("w-7 h-7 rounded-full flex items-center justify-center", active && "icon-btn-game")}>
                <Icon size={active ? 14 : 18} className={active ? "text-gray-900" : ""} />
              </span>
              <span className="text-[9px] font-medium">{label}</span>
            </Link>
          );
        })}

        <button onClick={() => setOpen(true)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors relative",
            moreActive ? "text-yellow-400" : "text-gray-500"
          )}>
          <span className={cn("w-7 h-7 rounded-full flex items-center justify-center", moreActive && "icon-btn-game")}>
            <MoreHorizontal size={moreActive ? 14 : 18} className={moreActive ? "text-gray-900" : ""} />
          </span>
          <span className="text-[9px] font-medium">Thêm</span>
        </button>
      </nav>

      {/* Nút "Chơi" to, nổi đè lên giữa thanh nav */}
      <a href="https://link.clashofclans.com/" target="_blank" rel="noreferrer"
        className="md:hidden fixed z-30 flex flex-col items-center justify-center w-16 h-16 rounded-full"
        style={{
          left: "50%", transform: "translateX(-50%)", bottom: 26,
          background: "radial-gradient(circle at 35% 30%, #FFE8B8, #F4A130 55%, #B8731A 100%)",
          border: "3px solid #160d24",
          boxShadow: "0 4px 0 #6B4115, 0 8px 18px rgba(0,0,0,0.5)",
        }}>
        <Shield size={22} className="text-gray-900" />
        <span className="text-[9px] font-bold text-gray-900 mt-0.5">Chơi</span>
      </a>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 rounded-t-2xl p-4 pb-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">Thêm mục</p>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-500"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MORE.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link key={href} href={href} onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-colors",
                      active ? "border-yellow-500/30 bg-yellow-500/10" : "border-gray-800 bg-gray-800/40"
                    )}>
                    <span className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      active ? "icon-btn-game" : "bg-gray-800 border border-gray-700"
                    )}>
                      <Icon size={16} className={active ? "text-gray-900" : "text-gray-400"} />
                    </span>
                    <span className={cn("text-[11px] font-medium text-center", active ? "text-yellow-400" : "text-gray-300")}>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
