"use client";

const KEY = "show_clan_rules_popup";

/** Mặc định BẬT (chưa từng chỉnh = hiện popup) — chỉ tắt khi người dùng tự tắt ở Cài đặt thường. */
export function getRulesPopupEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEY) !== "0";
}

export function setRulesPopupEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, enabled ? "1" : "0");
}
