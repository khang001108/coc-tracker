"use client";

export const EFFECT_KEYS = ["effect_sparkle", "effect_glow", "effect_rainbow", "effect_fire", "effect_ice", "effect_royal", "ne_rainbow", "ne_electric", "ne_shadow", "ne_crystal"] as const;

const EFFECT_LABEL: Record<string, string> = {
  effect_sparkle: "Tia Lửa Quanh Tên",
  effect_glow: "Hào Quang Vàng",
  effect_rainbow: "Ánh Cầu Vồng",
  effect_fire: "Ngọn Lửa Cháy",
  effect_ice: "Băng Giá Lấp Lánh",
  effect_royal: "Hoàng Gia Lấp Lánh",
  ne_rainbow: "Cầu Vồng Lấp Lánh",
  ne_electric: "Điện Xẹt",
  ne_shadow: "Bóng Tối Huyền Bí",
  ne_crystal: "Pha Lê Trong Suốt",
};
export { EFFECT_LABEL };

/** Bọc quanh tên thành viên để áp hiệu ứng động đã chọn — không ảnh hưởng nếu
 * effectKey rỗng/không hợp lệ (trả nguyên text). */
export function NameEffect({ effectKey, children }: { effectKey?: string | null; children: React.ReactNode }) {
  if (!effectKey) return <>{children}</>;

  switch (effectKey) {
    case "effect_glow":
      return <span style={{ animation: "name-glow 1.8s ease-in-out infinite", color: "#FFD27A" }}>{children}</span>;

    case "effect_fire":
      return <span style={{ animation: "name-fire 1.4s ease-in-out infinite", color: "#FFB347", fontWeight: 700 }}>{children}</span>;

    case "effect_ice":
      return <span style={{ animation: "name-ice 2s ease-in-out infinite", color: "#BAE6FD" }}>{children}</span>;

    case "effect_rainbow":
      return (
        <span style={{
          background: "linear-gradient(90deg, #ff3b30, #ff9500, #ffd60a, #34c759, #007aff, #af52de, #ff3b30)",
          backgroundSize: "300% 100%",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          animation: "name-rainbow 3s linear infinite", fontWeight: 700,
        }}>{children}</span>
      );

    case "effect_sparkle":
      return (
        <span className="relative inline-flex items-center">
          <span className="absolute -left-2.5 -top-1 text-[10px]" style={{ animation: "name-royal-sparkle 1.6s ease-in-out infinite" }}>✨</span>
          <span className="text-yellow-300">{children}</span>
          <span className="absolute -right-2.5 -bottom-1 text-[10px]" style={{ animation: "name-royal-sparkle 1.6s ease-in-out infinite 0.5s" }}>✨</span>
        </span>
      );

    case "effect_royal":
      return (
        <span className="relative inline-flex items-center gap-0.5">
          <span style={{ animation: "name-royal-sparkle 1.4s ease-in-out infinite" }}>👑</span>
          <span style={{ animation: "name-glow 1.8s ease-in-out infinite", color: "#FFD700", fontWeight: 700 }}>{children}</span>
          <span style={{ animation: "name-royal-sparkle 1.4s ease-in-out infinite 0.7s" }}>✨</span>
        </span>
      );

    case "ne_rainbow":
      return (
        <span className="relative inline-flex items-center">
          <span className="absolute -left-2.5 -top-1 text-[10px]" style={{ animation: "name-royal-sparkle 1.2s ease-in-out infinite" }}>🌈</span>
          <span style={{
            background: "linear-gradient(90deg, #ff3b30, #ff9500, #ffd60a, #34c759, #007aff, #af52de, #ff3b30)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            animation: "name-rainbow 2s linear infinite, name-glow 1.8s ease-in-out infinite", fontWeight: 700,
          }}>{children}</span>
        </span>
      );

    case "ne_electric":
      return <span style={{ animation: "name-electric 2.2s steps(1) infinite", color: "#BAE6FD", fontWeight: 700, letterSpacing: "0.5px" }}>{children}</span>;

    case "ne_shadow":
      return <span style={{ animation: "name-shadow 2.4s ease-in-out infinite", color: "#C4B5FD", fontWeight: 600 }}>{children}</span>;

    case "ne_crystal":
      return (
        <span style={{
          animation: "name-crystal 2.2s ease-in-out infinite",
          background: "linear-gradient(120deg, #FFFFFF, #A5F3FC, #FFFFFF)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          fontWeight: 700,
        }}>{children}</span>
      );

    default:
      return <>{children}</>;
  }
}
