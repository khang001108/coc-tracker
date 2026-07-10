"use client";

/**
 * Huy hiệu Danh vọng theo THỨ HẠNG (khác Tier theo điểm số ở services/reputation.py):
 *   Hạng 1-2  → 💎 Kim Cương (hiệu ứng lấp lánh)
 *   Hạng 3-5  → 🥇 Vàng
 *   Hạng 6-10 → 🥈 Bạc
 *   Ngoài top 10 → không có huy hiệu
 *
 * Thiết kế dạng huy chương SVG riêng (không dùng emoji nữa) — hình khiên +
 * dải ruy băng, có gradient + viền sáng theo bậc, số hạng khắc nổi ở giữa.
 */
export function reputationBadgeForRank(rank: number | null | undefined): { tier: "diamond" | "gold" | "silver" | null; label: string } | null {
  if (!rank || rank < 1) return null;
  if (rank <= 2) return { tier: "diamond", label: "Kim Cương" };
  if (rank <= 5) return { tier: "gold", label: "Vàng" };
  if (rank <= 10) return { tier: "silver", label: "Bạc" };
  return null;
}

const TIER_COLORS: Record<string, { main: string; light: string; dark: string; ribbon: string }> = {
  diamond: { main: "#7DD3FC", light: "#E0F7FF", dark: "#0EA5E9", ribbon: "#0369A1" },
  gold:    { main: "#FCD34D", light: "#FEF9C3", dark: "#D97706", ribbon: "#92400E" },
  silver:  { main: "#E5E7EB", light: "#FAFAFA", dark: "#9CA3AF", ribbon: "#6B7280" },
};

export function ReputationBadge({ rank, size = "sm" }: { rank: number | null | undefined; size?: "sm" | "md" | "lg" }) {
  const badge = reputationBadgeForRank(rank);
  if (!badge) return null;
  const c = TIER_COLORS[badge.tier!];
  const px = size === "lg" ? 40 : size === "md" ? 28 : 20;
  const uid = `${badge.tier}-${rank}-${size}`;

  return (
    <span title={`Hạng ${rank} Danh vọng — ${badge.label}`}
      className={`inline-flex items-center justify-center shrink-0 ${badge.tier === "diamond" ? "reputation-badge-sparkle" : ""}`}
      style={{ width: px, height: px }}>
      <svg width={px} height={px} viewBox="0 0 40 40" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`rep-grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.light} />
            <stop offset="55%" stopColor={c.main} />
            <stop offset="100%" stopColor={c.dark} />
          </linearGradient>
          <radialGradient id={`rep-shine-${uid}`} cx="35%" cy="25%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Dải ruy băng phía dưới */}
        <path d="M13 24 L9 38 L20 33 L31 38 L27 24 Z" fill={c.ribbon} />
        {/* Khiên huy chương */}
        <circle cx="20" cy="17" r="15" fill={c.dark} />
        <circle cx="20" cy="17" r="13" fill={`url(#rep-grad-${uid})`} stroke={c.light} strokeWidth="1" />
        <circle cx="20" cy="17" r="13" fill={`url(#rep-shine-${uid})`} />
        {/* Số hạng */}
        <text x="20" y="22" textAnchor="middle" fontSize="13" fontWeight="800" fill={c.ribbon}
          style={{ fontFamily: "inherit" }}>{rank}</text>
      </svg>
    </span>
  );
}
