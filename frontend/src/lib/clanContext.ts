/**
 * Clan context — lưu clan hiện tại vào localStorage
 * và cung cấp X-Clan-ID header cho tất cả API call.
 */

const KEY = "current_clan_id";

export interface ClanInfo {
  id: number;
  clan_tag: string;
  clan_name: string;
}

export function getCurrentClanId(): number {
  if (typeof window === "undefined") return 1;
  return parseInt(localStorage.getItem(KEY) || "1", 10);
}

export function setCurrentClan(clan: ClanInfo) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, String(clan.id));
  localStorage.setItem("current_clan_info", JSON.stringify(clan));
  // Không reload cả trang nữa (gây nháy trắng/đen + tắt nhạc đang phát).
  // Thay vào đó bắn 1 sự kiện nội bộ — PageScope sẽ remount lại nội dung
  // trang (main) để tải đúng dữ liệu clan mới, còn Sidebar/nhạc nền/theme
  // (ở ngoài vùng remount) giữ nguyên không bị ảnh hưởng.
  window.dispatchEvent(new CustomEvent("clan-changed", { detail: clan }));
}

export function onClanChanged(cb: (clan: ClanInfo | null) => void): () => void {
  if (typeof window === "undefined") return () => {};
  function handler(e: Event) { cb((e as CustomEvent).detail ?? getCurrentClanInfo()); }
  window.addEventListener("clan-changed", handler);
  return () => window.removeEventListener("clan-changed", handler);
}

export function getCurrentClanInfo(): ClanInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("current_clan_info");
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function getClanHeader(): Record<string, string> {
  const id = getCurrentClanId();
  return id !== 1 ? { "X-Clan-ID": String(id) } : {};
}
