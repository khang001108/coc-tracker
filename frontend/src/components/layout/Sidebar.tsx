"use client";
import { ClanSwitcher } from "@/components/ui/ClanSwitcher";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Swords, Castle, Gamepad2,
  Heart, Users, BarChart3, Settings, Shield, PartyPopper, UserCheck, MessageCircle, UserCircle2, Store, RotateCw, Sprout
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { GamePlayButton } from "@/components/ui/GamePlayButton";
import { getMemberAuth, api } from "@/lib/api";

const NAV = [
  { href: "/",          label: "Tổng quan",    icon: LayoutDashboard },
  { href: "/war",       label: "War & CWL",    icon: Swords },
  { href: "/capital",   label: "Clan Capital", icon: Castle },
  { href: "/games",     label: "Clan Games",   icon: Gamepad2 },
  { href: "/donate",    label: "Donate",       icon: Heart },
  { href: "/members",   label: "Thành viên",   icon: Users },
  { href: "/events",    label: "Sự kiện",      icon: PartyPopper },
  { href: "/chat",      label: "Chat",         icon: MessageCircle },
  { href: "/shop",      label: "Cửa hàng",     icon: Store },
  { href: "/farm",      label: "Nông trại",    icon: Sprout },
  { href: "/login",     label: "Đăng nhập",    icon: UserCheck },
  { href: "/stats",     label: "Thống kê",     icon: BarChart3 },
  { href: "/settings",  label: "Cài đặt",      icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [memberName, setMemberName] = useState<string | null>(null);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [cacheMsg, setCacheMsg] = useState("");

  async function clearCacheNow() {
    setCacheBusy(true); setCacheMsg("");
    try {
      const res = await api.clearCache();
      setCacheMsg(`Đã xoá ${res.cleared} mục — đang tải lại...`);
      setTimeout(() => window.location.reload(), 400);
    } catch {
      setCacheMsg("Lỗi xoá cache");
      setCacheBusy(false);
      setTimeout(() => setCacheMsg(""), 2000);
    }
  }

  useEffect(() => {
    setMemberName(getMemberAuth()?.player_name || null);
    function onStorage() { setMemberName(getMemberAuth()?.player_name || null); }
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
    };
  }, []);

  // Bắt được trường hợp vừa đăng nhập xong rồi điều hướng sang trang khác (cùng tab)
  useEffect(() => {
    setMemberName(getMemberAuth()?.player_name || null);
  }, [pathname]);

  const navItems = NAV.map(item =>
    item.href === "/login" && memberName
      ? { ...item, label: memberName, icon: UserCircle2 }
      : item
  );

  return (
    <aside className="hidden md:flex w-60 bg-gray-900 border-r border-gray-800 flex-col fixed h-full z-20">
      {/* Logo + Clan Switcher tích hợp */}
      <div className="border-b border-gray-800">
        {/* App title */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #F4A130, #8B4513)" }}>
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">CoC Tracker</p>
            <p className="text-[10px] text-yellow-500/70">Clash of Clans</p>
          </div>
        </div>
        {/* Clan switcher — click vào badge để đổi clan */}
        <div className="px-3 pb-3"><ClanSwitcher /></div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isMe = href === "/login" && memberName;
          return (
            <Link key={href} href={href}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  : isMe
                  ? "text-green-400 hover:bg-gray-800"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              )}>
              <span className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all",
                active ? "icon-btn-game" : isMe ? "bg-green-500/15 border border-green-500/30" : "bg-gray-800 border border-gray-700"
              )}>
                <Icon size={15} className={active ? "text-gray-900" : isMe ? "text-green-400" : "text-gray-400"} />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800 space-y-2">
        <ThemeToggle />
        <button onClick={clearCacheNow} disabled={cacheBusy}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-gray-500 hover:text-yellow-400 hover:bg-gray-800 transition-colors disabled:opacity-60">
          <RotateCw size={13} className={cacheBusy ? "animate-spin" : ""} /> Xoá cache & tải lại
        </button>
        {cacheMsg && <p className="text-[10px] text-gray-600 text-center">{cacheMsg}</p>}
        <GamePlayButton
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-transform hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #F4A130, #8B4513)" }}>
          <Shield size={15} /> Vào Clash of Clans
        </GamePlayButton>
        <p className="text-xs text-gray-600 text-center">Powered by Supercell API</p>
      </div>
    </aside>
  );
}
