"use client";

export const EFFECT_KEYS = ["effect_sparkle", "effect_glow", "effect_rainbow", "effect_fire", "effect_ice", "effect_royal"] as const;

const EFFECT_LABEL: Record<string, string> = {
  effect_sparkle: "Tia Lửa Quanh Tên",
  effect_glow: "Hào Quang Vàng",
  effect_rainbow: "Ánh Cầu Vồng",
  effect_fire: "Ngọn Lửa Cháy",
  effect_ice: "Băng Giá Lấp Lánh",
  effect_royal: "Hoàng Gia Lấp Lánh",
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

    default:
      return <>{children}</>;
  }
}
