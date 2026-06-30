"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Swords, Users, Settings, MoreHorizontal,
  Castle, Gamepad2, Heart, BarChart3, PartyPopper, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN = [
  { href: "/",         label: "Tổng quan", icon: LayoutDashboard },
  { href: "/war",      label: "War",       icon: Swords },
  { href: "/members",  label: "Thành viên",icon: Users },
];

const MORE = [
  { href: "/capital",  label: "Clan Capital", icon: Castle },
  { href: "/games",    label: "Clan Games",   icon: Gamepad2 },
  { href: "/donate",   label: "Donate",       icon: Heart },
  { href: "/stats",    label: "Thống kê",     icon: BarChart3 },
  { href: "/events",   label: "Sự kiện",      icon: PartyPopper },
  { href: "/settings", label: "Cài đặt",      icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = MORE.some(({ href }) => pathname.startsWith(href));

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900 border-t border-gray-800 flex items-stretch">
        {MAIN.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors relative",
                active ? "text-yellow-400" : "text-gray-500"
              )}>
              <Icon size={20} />
              <span className="text-[9px] font-medium">{label}</span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-yellow-500" />
              )}
            </Link>
          );
        })}
        <button onClick={() => setOpen(true)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors relative",
            moreActive ? "text-yellow-400" : "text-gray-500"
          )}>
          <MoreHorizontal size={20} />
          <span className="text-[9px] font-medium">Thêm</span>
          {moreActive && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-yellow-500" />
          )}
        </button>
      </nav>

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
                      "flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border transition-colors",
                      active ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" : "border-gray-800 bg-gray-800/40 text-gray-300"
                    )}>
                    <Icon size={20} />
                    <span className="text-[11px] font-medium text-center">{label}</span>
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
