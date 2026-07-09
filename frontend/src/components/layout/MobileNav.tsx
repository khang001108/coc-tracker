"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Swords, Users, Settings, MoreHorizontal,
  Castle, Gamepad2, Heart, BarChart3, PartyPopper, X, Shield,
  MessageCircle, UserCheck, UserCircle2, Store, RotateCw, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Portal } from "@/components/ui/Portal";
import { MusicControls } from "@/components/ui/MusicControls";
import { GamePlayButton } from "@/components/ui/GamePlayButton";
import { getMemberAuth, api } from "@/lib/api";
import { useNotifications } from "@/components/ui/NotificationContext";

const LEFT = [
  { href: "/",        label: "Tổng quan", icon: LayoutDashboard },
  { href: "/members", label: "Thành viên", icon: Users },
  { href: "/war",     label: "War",        icon: Swords,         notif: "war"    as const },
];
const RIGHT = [
  { href: "/chat",   label: "Chat",    icon: MessageCircle, notif: "chat"   as const },
  { href: "/events", label: "Sự kiện", icon: PartyPopper,   notif: "events" as const },
];
const MORE = [
  { href: "/login",    label: "Đăng nhập",    icon: UserCheck },
  { href: "/shop",     label: "Cửa hàng",     icon: Store },
  { href: "/capital",  label: "Clan Capital", icon: Castle },
  { href: "/games",    label: "Clan Games",   icon: Gamepad2 },
  { href: "/donate",   label: "Donate",       icon: Heart },
  { href: "/stats",    label: "Thống kê",     icon: BarChart3 },
  { href: "/weekly-report", label: "Báo cáo tuần", icon: TrendingUp },
  { href: "/settings", label: "Cài đặt",      icon: Settings },
];

function RedDot() {
  return (
    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-gray-900 animate-pulse" />
  );
}

function NavLink({ href, label, icon: Icon, active, hasNotif }: any) {
  return (
    <Link
      href={href}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-w-0 transition-colors",
        active ? "text-yellow-400" : "text-gray-500"
      )}
    >
      <span className={cn("relative w-7 h-7 rounded-full flex items-center justify-center shrink-0", active && "icon-btn-game")}>
        <Icon size={active ? 14 : 17} className={active ? "text-gray-900" : ""} />
        {hasNotif && !active && <RedDot />}
      </span>
      <span className="text-[9px] font-medium truncate">{label}</span>
    </Link>
  );
}

export function MobileNav() {
  const pathname   = usePathname();
  const notif      = useNotifications();
  const [open, setOpen] = useState(false);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [pressing, setPressing] = useState(false);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [cacheMsg, setCacheMsg] = useState("");
  const moreActive = MORE.some(({ href }) => pathname.startsWith(href));

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
  }, [pathname]);

  const moreItems = MORE.map(item =>
    item.href === "/login" && memberName
      ? { ...item, label: memberName, icon: UserCircle2 }
      : item
  );

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900 border-t border-gray-800 flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {LEFT.map(({ href, label, icon, notif: nk }) => (
          <NavLink key={href} href={href} label={label} icon={icon}
            active={href === "/" ? pathname === "/" : pathname.startsWith(href)}
            hasNotif={nk ? notif[nk] : false} />
        ))}

        {/* ── Nút CHƠI — tất cả visual ở đây, GamePlayButton chỉ handle click ── */}
        <GamePlayButton className="flex-1 flex flex-col items-center justify-center min-w-0">
          {/* Container dịch lên cao */}
          <span className="relative flex items-center justify-center -mt-6 shrink-0"
            style={{ width: 52, height: 52 }}>

            {/* Sóng pulse lan ra */}
            <span className="absolute inset-0 rounded-full border-2 border-yellow-400/60 pointer-events-none"
              style={{ animation: "play-ring-pulse 2s ease-out infinite" }} />
            <span className="absolute inset-0 rounded-full border-2 border-yellow-400/35 pointer-events-none"
              style={{ animation: "play-ring-pulse 2s ease-out infinite 0.7s" }} />

            {/* Vòng ngoài xoay */}
            <span className="absolute inset-[-3px] rounded-full pointer-events-none"
              style={{
                background: "conic-gradient(from 0deg, #FFE8B8, #F4A130, #B8731A, #F4A130, #FFE8B8)",
                animation: "play-border-spin 5s linear infinite",
                borderRadius: "50%",
              }} />

            {/* Thân nút chính */}
            <span
              className={`relative flex items-center justify-center w-[52px] h-[52px] rounded-full transition-all duration-100 ${pressing ? "scale-90" : "scale-100"}`}
              onPointerDown={() => setPressing(true)}
              onPointerUp={() => setPressing(false)}
              onPointerLeave={() => setPressing(false)}
              style={{
                background: "conic-gradient(from 200deg, #FFE8B8, #F4A130, #B8731A, #F4A130, #FFE8B8)",
                padding: 3,
                boxShadow: pressing
                  ? "0 1px 0 #6B4115, 0 3px 10px rgba(0,0,0,0.55)"
                  : "0 4px 0 #6B4115, 0 10px 20px rgba(0,0,0,0.55)",
              }}
            >
              <span
                className="flex items-center justify-center w-full h-full rounded-full"
                style={{
                  background: "radial-gradient(circle at 35% 30%, #FFE8B8, #F4A130 55%, #B8731A 100%)",
                  border: "2px solid #160d24",
                }}
              >
                <Shield size={20} className="text-gray-900 drop-shadow"
                  style={{ animation: "play-shield-bob 2s ease-in-out infinite" }} />
              </span>
            </span>
          </span>

          {/* Label CHƠI */}
          <span className="text-[9px] font-extrabold tracking-wide mt-1 px-1.5 py-0.5 rounded-full"
            style={{ color: "#1A0F05", background: "linear-gradient(180deg, #FFE8B8, #F4A130)" }}>
            CHƠI
          </span>
        </GamePlayButton>

        {RIGHT.map(({ href, label, icon, notif: nk }) => (
          <NavLink key={href} href={href} label={label} icon={icon}
            active={pathname.startsWith(href)}
            hasNotif={nk ? notif[nk] : false} />
        ))}

        <button
          onClick={() => setOpen(true)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-w-0 transition-colors",
            moreActive ? "text-yellow-400" : "text-gray-500"
          )}
        >
          <span className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", moreActive && "icon-btn-game")}>
            <MoreHorizontal size={moreActive ? 14 : 17} className={moreActive ? "text-gray-900" : ""} />
          </span>
          <span className="text-[9px] font-medium">Thêm</span>
        </button>
      </nav>

      {open && (
        <Portal>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)}>
            <div
              className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 rounded-t-2xl p-4 pb-6 max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-300">Thêm mục</p>
                <button onClick={() => setOpen(false)} className="p-1 text-gray-500"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {moreItems.map(({ href, label, icon: Icon }) => {
                  const active = pathname.startsWith(href);
                  const isMe   = href === "/login" && memberName;
                  return (
                    <Link key={href} href={href} onClick={() => setOpen(false)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-colors",
                        active ? "border-yellow-500/30 bg-yellow-500/10"
                          : isMe  ? "border-green-500/30 bg-green-500/10"
                          : "border-gray-800 bg-gray-800/40"
                      )}>
                      <span className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center",
                        active ? "icon-btn-game"
                          : isMe  ? "bg-green-500/15 border border-green-500/30"
                          : "bg-gray-800 border border-gray-700"
                      )}>
                        <Icon size={16} className={active ? "text-gray-900" : isMe ? "text-green-400" : "text-gray-400"} />
                      </span>
                      <span className={cn("text-[11px] font-medium text-center truncate w-full px-1",
                        active ? "text-yellow-400" : isMe ? "text-green-400" : "text-gray-300")}>
                        {label}
                      </span>
                    </Link>
                  );
                })}
                <button onClick={clearCacheNow} disabled={cacheBusy}
                  className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-colors border-gray-800 bg-gray-800/40 disabled:opacity-60">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-800 border border-gray-700">
                    <RotateCw size={16} className={cn("text-gray-400", cacheBusy && "animate-spin")} />
                  </span>
                  <span className="text-[11px] font-medium text-center truncate w-full px-1 text-gray-300">
                    Xoá cache
                  </span>
                </button>
              </div>
              {cacheMsg && <p className="text-[11px] text-gray-500 text-center -mt-1 mb-3">{cacheMsg}</p>}
              <div className="mb-3"><MusicControls /></div>
              <ThemeToggle />
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
