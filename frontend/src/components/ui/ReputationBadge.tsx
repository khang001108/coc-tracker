"use client";

/**
 * Huy hiệu Danh vọng theo THỨ HẠNG (khác Tier theo điểm số ở services/reputation.py):
 *   Hạng 1-2  → 💎 Kim Cương (hiệu ứng lấp lánh)
 *   Hạng 3-5  → 🥇 Vàng
 *   Hạng 6-10 → 🥈 Bạc
 *   Ngoài top 10 → không có huy hiệu
 */
export function reputationBadgeForRank(rank: number | null | undefined): { tier: "diamond" | "gold" | "silver" | null; icon: string; label: string } | null {
  if (!rank || rank < 1) return null;
  if (rank <= 2) return { tier: "diamond", icon: "💎", label: "Kim Cương" };
  if (rank <= 5) return { tier: "gold", icon: "🥇", label: "Vàng" };
  if (rank <= 10) return { tier: "silver", icon: "🥈", label: "Bạc" };
  return null;
}

const TIER_STYLE: Record<string, string> = {
  diamond: "bg-gradient-to-r from-cyan-400/20 to-blue-400/20 border-cyan-300/50 text-cyan-200 reputation-badge-sparkle",
  gold:    "bg-gradient-to-r from-yellow-500/20 to-amber-400/20 border-yellow-400/50 text-yellow-300",
  silver:  "bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-300/50 text-gray-300",
};

export function ReputationBadge({ rank, size = "sm" }: { rank: number | null | undefined; size?: "sm" | "md" }) {
  const badge = reputationBadgeForRank(rank);
  if (!badge) return null;
  const sizeClass = size === "md" ? "text-xs px-2 py-0.5 gap-1" : "text-[9px] px-1.5 py-0.5 gap-0.5";
  return (
    <span title={`Hạng ${rank} Danh vọng — ${badge.label}`}
      className={`inline-flex items-center rounded-full border font-semibold shrink-0 ${sizeClass} ${TIER_STYLE[badge.tier!]}`}>
      {badge.icon} #{rank}
    </span>
  );
}
