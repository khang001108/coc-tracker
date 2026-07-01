"use client";
/**
 * NotificationContext — poll nhẹ để hiển thị chấm đỏ thông báo
 * trên các tab Chat, Sự kiện, War khi có thay đổi mới.
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { usePathname } from "next/navigation";

interface NotifState {
  chat:   boolean;
  events: boolean;
  war:    boolean;
}

const Ctx = createContext<NotifState>({ chat: false, events: false, war: false });
export const useNotifications = () => useContext(Ctx);

const POLL_INTERVAL = 30_000; // 30s

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NotifState>({ chat: false, events: false, war: false });
  const pathname = usePathname();

  const lastChatId    = useRef<number>(0);
  const lastEventTs   = useRef<string>("");
  const lastWarAtks   = useRef<number>(0);
  const ready         = useRef(false);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Xoá chấm khi vào đúng trang ────────────────────────────────────────
  useEffect(() => {
    if (pathname === "/chat" || pathname.startsWith("/chat"))
      setState(s => ({ ...s, chat: false }));
    if (pathname === "/events" || pathname.startsWith("/events"))
      setState(s => ({ ...s, events: false }));
    if (pathname === "/war" || pathname.startsWith("/war"))
      setState(s => ({ ...s, war: false }));
  }, [pathname]);

  // ── Init: ghi nhận baseline ─────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const [chatRes, evRes, warRes] = await Promise.allSettled([
          api.getMessages("clan", 0),
          api.getEvents(),
          api.getCurrentWar(),
        ]);
        if (chatRes.status === "fulfilled") {
          const msgs: any[] = chatRes.value || [];
          if (msgs.length) lastChatId.current = Math.max(...msgs.map((m: any) => m.id ?? 0));
        }
        if (evRes.status === "fulfilled") {
          const evs: any[] = evRes.value || [];
          if (evs.length) lastEventTs.current = evs[0]?.created_at ?? "";
        }
        if (warRes.status === "fulfilled") {
          const w: any = warRes.value || {};
          lastWarAtks.current = (w.clan?.members || []).reduce(
            (sum: number, m: any) => sum + (m.attacks?.length || 0), 0
          );
        }
      } catch {}
      ready.current = true;
    }
    init();
  }, []);

  // ── Poll ────────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!ready.current) return;
    try {
      // Chat — chỉ poll nếu không đang ở trang chat
      if (!pathname.startsWith("/chat")) {
        const msgs: any[] = await api.getMessages("clan", lastChatId.current).catch(() => []);
        if (msgs?.length) {
          const maxId = Math.max(...msgs.map((m: any) => m.id ?? 0));
          if (maxId > lastChatId.current) {
            setState(s => ({ ...s, chat: true }));
            lastChatId.current = maxId;
          }
        }
      }

      // Events — kiểm tra sự kiện mới nhất
      if (!pathname.startsWith("/events")) {
        const evs: any[] = await api.getEvents().catch(() => []);
        const latest = evs[0]?.created_at ?? "";
        if (latest && latest !== lastEventTs.current && lastEventTs.current !== "") {
          setState(s => ({ ...s, events: true }));
        }
        if (latest) lastEventTs.current = latest;
      }

      // War — kiểm tra có đòn đánh mới
      if (!pathname.startsWith("/war")) {
        const w: any = await api.getCurrentWar().catch(() => null);
        if (w && (w.state === "inWar" || w.state === "warEnded")) {
          const atks = (w.clan?.members || []).reduce(
            (sum: number, m: any) => sum + (m.attacks?.length || 0), 0
          );
          if (atks > lastWarAtks.current) {
            setState(s => ({ ...s, war: true }));
            lastWarAtks.current = atks;
          }
        }
      }
    } catch {}
  }, [pathname]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [poll]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
