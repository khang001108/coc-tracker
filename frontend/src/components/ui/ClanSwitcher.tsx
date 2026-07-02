"use client";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { getCurrentClanId, getCurrentClanInfo, setCurrentClan, onClanChanged, ClanInfo } from "@/lib/clanContext";
import { api } from "@/lib/api";

function ClanDropdown({ clans, currentId, isAdmin, onClose }: {
  clans: ClanInfo[]; currentId: number; isAdmin: boolean; onClose: () => void;
}) {
  return (
    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl"
      style={{ background: "var(--py-card-bg,#1E1138)", border: "1px solid rgba(244,161,48,0.25)" }}>
      {clans.map(cl => (
        <button key={cl.id} onClick={() => { setCurrentClan(cl); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-yellow-400/10">
          <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-black"
            style={{ background: "linear-gradient(135deg,#F4A130,#B8731A)", color: "#1A0A00" }}>
            #{cl.id}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold truncate" style={{ color: "var(--py-card-text,#fff)" }}>{cl.clan_name}</p>
            <p className="text-[10px] text-gray-500">{cl.clan_tag}</p>
          </div>
          {cl.id === currentId && <Check size={13} className="text-yellow-400 shrink-0"/>}
        </button>
      ))}
      {isAdmin && (
        <div style={{ borderTop: "1px solid rgba(244,161,48,0.15)" }}>
          <a href="/settings" onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-500 hover:text-yellow-400 transition-colors">
            <Plus size={12}/> Quản lý clan
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Đổi clan.
 * - Không truyền `children`: hiện dạng "badge" gọn (dùng trong Sidebar desktop).
 * - Có truyền `children`: bọc quanh nội dung do component cha tự vẽ (vd. huy
 *   hiệu + tên hội thật ở đầu trang Tổng quan) và biến nó thành nút bấm để
 *   đổi clan — chỉ khi có quyền đổi (admin + có ≥2 clan), ngược lại render
 *   `children` bình thường, không bọc gì thêm.
 */
export function ClanSwitcher({ children }: { children?: React.ReactNode }) {
  const [clans, setClans]       = useState<ClanInfo[]>([]);
  const [open, setOpen]         = useState(false);
  const [currentId, setCurrentId] = useState(1);
  const [currentInfo, setCurrentInfo] = useState<ClanInfo | null>(null);
  const isAdmin = typeof window !== "undefined" && !!localStorage.getItem("coc_admin_token");

  useEffect(() => {
    function refresh() {
      setCurrentId(getCurrentClanId());
      setCurrentInfo(getCurrentClanInfo());
    }
    refresh();
    if (isAdmin) {
      api.listClans().then((data: ClanInfo[]) => setClans(data)).catch(() => {});
    }
    return onClanChanged(() => refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchable = isAdmin && clans.length > 1;

  // ── Chế độ "bọc nội dung có sẵn" (header trang Tổng quan) ─────────────────
  if (children) {
    if (!switchable) return <>{children}</>;
    return (
      <div className="relative">
        <button onClick={() => setOpen(o => !o)} className="w-full text-left rounded-2xl transition-opacity active:opacity-70">
          {children}
        </button>
        {open && <ClanDropdown clans={clans} currentId={currentId} isAdmin={isAdmin} onClose={() => setOpen(false)} />}
      </div>
    );
  }

  // ── Chế độ "badge" mặc định (Sidebar desktop) ─────────────────────────────
  // Ẩn hoàn toàn nếu chỉ có 1 clan và không phải admin
  if (!isAdmin && clans.length <= 1) return null;

  const name = currentInfo?.clan_name || "Clan #" + currentId;
  const tag  = currentInfo?.clan_tag  || "";

  return (
    <div className="relative">
      {/* Badge clan — bấm để đổi */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all group"
        style={{
          background: open ? "rgba(244,161,48,0.12)" : "rgba(244,161,48,0.06)",
          border: "1px solid rgba(244,161,48,0.2)",
        }}>
        {/* Badge icon */}
        <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-black"
          style={{ background: "linear-gradient(135deg,#F4A130,#B8731A)", color: "#1A0A00" }}>
          {clans.length > 0 ? `#${currentId}` : "🏰"}
        </div>
        {/* Tên clan */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold truncate leading-tight" style={{ color: "var(--py-card-text,#fff)" }}>
            {name}
          </p>
          <p className="text-[10px] text-gray-500 truncate">{tag || "Bấm để đổi clan"}</p>
        </div>
        <ChevronDown size={14} className={`text-yellow-400/60 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}/>
      </button>

      {/* Dropdown danh sách clan */}
      {open && clans.length > 0 && (
        <ClanDropdown clans={clans} currentId={currentId} isAdmin={isAdmin} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
