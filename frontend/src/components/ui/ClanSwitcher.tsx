"use client";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { getCurrentClanId, getCurrentClanInfo, setCurrentClan, onClanChanged, ClanInfo } from "@/lib/clanContext";
import { api } from "@/lib/api";
import { MarqueeText } from "@/components/ui/MarqueeText";

function ClanBadge({ clan, size = 28 }: { clan: ClanInfo; size?: number }) {
  if (clan.badge_url) {
    return <img src={clan.badge_url} alt={clan.clan_name} className="rounded-lg shrink-0 object-contain"
      style={{ width: size, height: size, background: "rgba(0,0,0,0.2)" }} />;
  }
  // Chưa có cờ/huy hiệu (chưa từng poll được dữ liệu clan này) — fallback chữ #id
  return (
    <div className="rounded-lg shrink-0 flex items-center justify-center font-black"
      style={{ width: size, height: size, fontSize: size * 0.4, background: "linear-gradient(135deg,#F4A130,#B8731A)", color: "#1A0A00" }}>
      #{clan.id}
    </div>
  );
}

function PublicSlotEditForm({ slot, onUpdated }: { slot: { clan_id: number; clan_tag: string; clan_name: string; badge_url?: string }; onUpdated: () => void }) {
  const [tag, setTag] = useState(slot.clan_tag);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    if (!tag.trim()) return;
    setBusy(true); setMsg("");
    try {
      const res = await api.updatePublicSlot(tag.trim());
      setMsg(`✅ Đã đổi sang clan "${res.clan_name}"!`);
      onUpdated();
    } catch (e: any) {
      setMsg("❌ " + (e.message || "Lỗi đổi Tag clan"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-3" style={{ borderTop: "1px solid rgba(244,161,48,0.15)" }} onClick={e => e.stopPropagation()}>
      <p className="text-[11px] text-gray-500 mb-1.5">Đổi Tag clan "{slot.clan_name}" (giữ nguyên API Key):</p>
      <div className="flex gap-1.5">
        <input value={tag} onChange={e => setTag(e.target.value)} placeholder="#ABC123"
          className="input !text-xs !py-1.5 flex-1" onKeyDown={e => { if (e.key === "Enter") submit(); }} />
        <button onClick={submit} disabled={busy || !tag.trim()}
          className="btn-gold !text-xs !py-1.5 !px-2.5 shrink-0">{busy ? "..." : "Kiểm tra & Lưu"}</button>
      </div>
      {msg && <p className="text-[10px] text-gray-400 mt-1.5">{msg}</p>}
    </div>
  );
}

function ClanDropdown({ clans, currentId, isAdmin, publicSlot, onClose, onSlotUpdated }: {
  clans: ClanInfo[]; currentId: number; isAdmin: boolean; publicSlot: any; onClose: () => void; onSlotUpdated: () => void;
}) {
  return (
    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl"
      style={{ background: "var(--py-card-bg,#1E1138)", border: "1px solid rgba(244,161,48,0.25)" }}>
      {clans.map(cl => (
        <button key={cl.id} onClick={() => { setCurrentClan(cl); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-yellow-400/10">
          <ClanBadge clan={cl} size={28} />
          <div className="flex-1 min-w-0 text-left">
            <MarqueeText className="text-xs font-semibold" style={{ color: "var(--py-card-text,#fff)" }}>{cl.clan_name}</MarqueeText>
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
      {!isAdmin && publicSlot?.enabled && <PublicSlotEditForm slot={publicSlot} onUpdated={onSlotUpdated} />}
    </div>
  );
}

/**
 * Đổi clan.
 * - Không truyền `children`: hiện dạng "badge" gọn (dùng trong Sidebar desktop).
 * - Có truyền `children`: bọc quanh nội dung do component cha tự vẽ (vd. huy
 *   hiệu + tên hội thật ở đầu trang Tổng quan) và biến nó thành nút bấm để
 *   đổi clan — chỉ khi có quyền đổi (admin + có ≥2 clan). Có gắn thêm 1 icon
 *   nhỏ (⇄) để người dùng biết đây là nơi bấm để đổi clan.
 */
export function ClanSwitcher({ children }: { children?: React.ReactNode }) {
  const [clans, setClans]       = useState<ClanInfo[]>([]);
  const [open, setOpen]         = useState(false);
  const [currentId, setCurrentId] = useState(1);
  const [currentInfo, setCurrentInfo] = useState<ClanInfo | null>(null);
  const [publicSlot, setPublicSlot] = useState<any>(null);
  const isAdmin = typeof window !== "undefined" && !!localStorage.getItem("coc_admin_token");

  function reloadClans() {
    api.listClans().then((data: ClanInfo[]) => setClans(data)).catch(() => {});
  }
  function reloadPublicSlot() {
    if (!isAdmin) api.getPublicSlot().then((r: any) => setPublicSlot(r)).catch(() => {});
  }

  useEffect(() => {
    function refresh() {
      setCurrentId(getCurrentClanId());
      setCurrentInfo(getCurrentClanInfo());
    }
    refresh();
    reloadClans();
    reloadPublicSlot();
    return onClanChanged(() => refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchable = clans.length > 1 || !!publicSlot?.enabled;

  // ── Chế độ "bọc nội dung có sẵn" (header trang Tổng quan) ─────────────────
  if (children) {
    if (!switchable) return <>{children}</>;
    return (
      <div className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="w-full text-left rounded-2xl transition-opacity active:opacity-70 flex items-center gap-2">
          {children}
          {/* Icon báo hiệu bấm được để đổi clan — mũi tên xổ xuống, khác hẳn icon 🔄 tải lại bên cạnh */}
          <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(244,161,48,0.15)", border: "1px solid rgba(244,161,48,0.35)" }}>
            <ChevronDown size={14} className={`text-yellow-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        </button>
        {open && <ClanDropdown clans={clans} currentId={currentId} isAdmin={isAdmin} publicSlot={publicSlot} onClose={() => setOpen(false)} onSlotUpdated={() => { reloadClans(); reloadPublicSlot(); }} />}
      </div>
    );
  }

  // ── Chế độ "badge" mặc định (Sidebar desktop) ─────────────────────────────
  // Ẩn hoàn toàn nếu chỉ có 1 clan VÀ không có clan nào bật đổi Tag công khai
  if (!switchable) return null;

  const name = currentInfo?.clan_name || "Clan #" + currentId;
  const tag  = currentInfo?.clan_tag  || "";
  const currentClan = clans.find(c => c.id === currentId) || currentInfo || { id: currentId, clan_tag: tag, clan_name: name };

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
        <ClanBadge clan={currentClan as ClanInfo} size={32} />
        {/* Tên clan */}
        <div className="flex-1 min-w-0 text-left">
          <MarqueeText className="text-xs font-bold leading-tight" style={{ color: "var(--py-card-text,#fff)" }}>
            {name}
          </MarqueeText>
          <p className="text-[10px] text-gray-500 truncate">{tag || "Bấm để đổi clan"}</p>
        </div>
        <ChevronDown size={14} className={`text-yellow-400/60 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}/>
      </button>

      {/* Dropdown danh sách clan */}
      {open && (
        <ClanDropdown clans={clans} currentId={currentId} isAdmin={isAdmin} publicSlot={publicSlot} onClose={() => setOpen(false)} onSlotUpdated={() => { reloadClans(); reloadPublicSlot(); }} />
      )}
    </div>
  );
}
