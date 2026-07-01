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
  // Reload để áp dụng clan mới
  window.location.reload();
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
