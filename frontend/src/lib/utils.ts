import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  // CoC API trả về dạng "20260629T120000.000Z" (không có dấu - và :)
  // Cần chuyển sang ISO chuẩn trước khi parse
  let normalized = iso;
  const match = iso.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (match) {
    const [, y, mo, d, h, mi, s] = match;
    normalized = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  }
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export function roleLabel(role: string): string {
  return { leader: "Leader", coLeader: "Co-Leader", elder: "Elder", member: "Member" }[role] || role;
}

export function roleClass(role: string): string {
  return { leader: "role-leader", coLeader: "role-coLeader", elder: "role-elder", member: "role-member" }[role] || "";
}

export function thColor(th: number): string {
  const colors: Record<number, string> = {
    1: "#808080", 2: "#808080", 3: "#808080",
    4: "#4CAF50", 5: "#4CAF50", 6: "#4CAF50",
    7: "#2196F3", 8: "#2196F3", 9: "#2196F3",
    10: "#9C27B0", 11: "#9C27B0", 12: "#FF9800",
    13: "#FF5722", 14: "#F44336", 15: "#E91E63", 16: "#FFD700",
  };
  return colors[th] || "#666";
}

export function warStateLabel(state: string): { label: string; color: string } {
  return {
    notInWar:    { label: "Không trong war", color: "text-gray-400" },
    preparation: { label: "Chuẩn bị",        color: "text-yellow-400" },
    inWar:       { label: "Đang war",         color: "text-green-400" },
    warEnded:    { label: "Đã kết thúc",      color: "text-blue-400" },
  }[state] || { label: state, color: "text-gray-400" };
}
