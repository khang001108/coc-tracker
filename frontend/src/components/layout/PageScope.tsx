"use client";
import { useEffect, useState } from "react";
import { getCurrentClanId, onClanChanged } from "@/lib/clanContext";

/**
 * Bọc quanh nội dung trang (main). Khi người dùng đổi clan (ClanSwitcher),
 * component này đổi `key` để React remount lại đúng phần nội dung trang
 * (tự động gọi lại các useEffect tải dữ liệu) — mà KHÔNG reload cả trình
 * duyệt, nên nhạc nền không bị tắt và theme không bị nháy lại.
 * Sidebar / MobileNav / MusicProvider nằm NGOÀI component này nên không
 * bị ảnh hưởng.
 */
export function PageScope({ children }: { children: React.ReactNode }) {
  const [clanId, setClanId] = useState(1);

  useEffect(() => {
    setClanId(getCurrentClanId());
    return onClanChanged(clan => setClanId(clan?.id ?? getCurrentClanId()));
  }, []);

  return (
    <main key={clanId} className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-x-hidden w-full">
      {children}
    </main>
  );
}
