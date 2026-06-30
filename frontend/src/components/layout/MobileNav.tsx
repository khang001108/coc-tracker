"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Swords, Users, Settings, MoreHorizontal,
  Castle, Gamepad2, Heart, BarChart3, PartyPopper, X, Shield,
  MessageCircle, UserCheck, UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Portal } from "@/components/ui/Portal";
import { MusicControls } from "@/components/ui/MusicControls";
import { GamePlayButton } from "@/components/ui/GamePlayButton";
import { getMemberAuth } from "@/lib/api";

const LEFT = [
  { href: "/",         label: "Tổng quan", icon: LayoutDashboard },
  { href: "/members",  label: "Thành viên",icon: Users },
  { href: "/war",      label: "War",       icon: Swords },
];
const RIGHT = [
  { href: "/chat",     label: "Chat",      icon: MessageCircle },
  { href: "/events",   label: "Sự kiện",   icon: PartyPopper },
];

const MORE = [
  { href: "/login",    label: "Đăng nhập",    icon: UserCheck },
  { href: "/capital",  label: "Clan Capital", icon: Castle },
  { href: "/games",    label: "Clan Games",   icon: Gamepad2 },
  { href: "/donate",   label: "Donate",       icon: Heart },
  { href: "/stats",    label: "Thống kê",     icon: BarChart3 },
  { href: "/settings", label: "Cài đặt",      icon: Settings },
];

function NavLink({ href, label, icon: Icon, active }: any) {
  return (
    <Link href={href}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-w-0 transition-colors",
        active ? "text-yellow-400" : "text-gray-500"
      )}>
      <span className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", active && "icon-btn-game")}>
        <Icon size={active ? 14 : 17} className={active ? "text-gray-900" : ""} />
      </span>
      <span className="text-[9px] font-medium truncate">{label}</span>
    </Link>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [memberName, setMemberName] = useState<string | null>(null);
  const moreActive = MORE.some(({ href }) => pathname.startsWith(href));

  useEffect(() => {
    setMemberName(getMemberAuth()?.player_name || null);
  }, [pathname]);

  const moreItems = MORE.map(item =>
    item.href === "/login" && memberName
      ? { ...item, label: memberName, icon: UserCircle2 }
      : item
  );

  return (
    <>
      {/* 6 cột bằng nhau: mỗi mục có chỗ riêng, nút "Chơi" cũng là 1 cột — không đè lên mục khác */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900 border-t border-gray-800 flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {LEFT.map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon}
            active={href === "/" ? pathname === "/" : pathname.startsWith(href)} />
        ))}

        {/* Cột giữa — nút Chơi, có không gian riêng, chỉ nổi lên cao hơn 1 chút */}
        <GamePlayButton className="flex-1 flex flex-col items-center justify-center min-w-0">
          <span className="w-12 h-12 rounded-full flex items-center justify-center -mt-5 shrink-0"
            style={{
              background: "radial-gradient(circle at 35% 30%, #FFE8B8, #F4A130 55%, #B8731A 100%)",
              border: "3px solid #160d24",
              boxShadow: "0 4px 0 #6B4115, 0 8px 16px rgba(0,0,0,0.5)",
            }}>
            <Shield size={18} className="text-gray-900" />
          </span>
          <span className="text-[9px] font-bold text-yellow-400 mt-0.5">Chơi</span>
        </GamePlayButton>

        {RIGHT.map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} active={pathname.startsWith(href)} />
        ))}

        <button onClick={() => setOpen(true)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-w-0 transition-colors",
            moreActive ? "text-yellow-400" : "text-gray-500"
          )}>
          <span className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", moreActive && "icon-btn-game")}>
            <MoreHorizontal size={moreActive ? 14 : 17} className={moreActive ? "text-gray-900" : ""} />
          </span>
          <span className="text-[9px] font-medium">Thêm</span>
        </button>
      </nav>

      {open && (
        <Portal>
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 rounded-t-2xl p-4 pb-6 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">Thêm mục</p>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-500"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {moreItems.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                const isMe = href === "/login" && memberName;
                return (
                  <Link key={href} href={href} onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-colors",
                      active ? "border-yellow-500/30 bg-yellow-500/10" : isMe ? "border-green-500/30 bg-green-500/10" : "border-gray-800 bg-gray-800/40"
                    )}>
                    <span className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      active ? "icon-btn-game" : isMe ? "bg-green-500/15 border border-green-500/30" : "bg-gray-800 border border-gray-700"
                    )}>
                      <Icon size={16} className={active ? "text-gray-900" : isMe ? "text-green-400" : "text-gray-400"} />
                    </span>
                    <span className={cn("text-[11px] font-medium text-center truncate w-full", active ? "text-yellow-400" : isMe ? "text-green-400" : "text-gray-300")}>{label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Nhạc nền — gộp gọn vào đây thay vì bong bóng nổi riêng */}
            <div className="mb-3"><MusicControls /></div>

            <ThemeToggle />
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}
