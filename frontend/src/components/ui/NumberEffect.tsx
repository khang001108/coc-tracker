"use client";

export const NUMBER_EFFECT_KEYS = [
  "num_bounce", "num_neon", "num_spin", "num_pop",
  "ne_fire_num", "ne_ice_num", "ne_rainbow_num", "ne_crown_num",
] as const;

/** Bọc quanh số cấp TH để áp hiệu ứng động. */
export function NumberEffect({ effectKey, children }: {
  effectKey?: string | null;
  children: React.ReactNode;
}) {
  if (!effectKey) return <>{children}</>;

  switch (effectKey) {

    /* ── Cũ ── */
    case "num_bounce":
      return (
        <span className="inline-block"
          style={{
            animation: "num-bounce 0.7s ease-in-out infinite",
            imageRendering: "pixelated",
            color: "#F4A130",
            textShadow: "0 0 4px rgba(244,161,48,0.6)",
            fontWeight: 900,
          }}>
          {children}
        </span>
      );

    case "num_neon":
      return (
        <span className="inline-block"
          style={{
            animation: "num-neon 1.5s ease-in-out infinite",
            color: "#00DFFF",
            textShadow: "0 0 6px #00BFFF, 0 0 14px #60B8FF, 0 0 2px #fff",
            fontWeight: 900,
          }}>
          {children}
        </span>
      );

    case "num_spin":
      return (
        <span className="relative inline-flex items-center justify-center">
          <span className="absolute inset-[-3px] rounded-full border-2 border-dashed border-yellow-400"
            style={{ animation: "num-spin-ring 3s linear infinite" }} />
          <span className="relative font-bold" style={{ color: "#F4A130" }}>{children}</span>
        </span>
      );

    case "num_pop":
      return (
        <span className="inline-block font-black"
          style={{
            animation: "num-pop 0.9s ease-in-out infinite",
            color: "#F4A130",
            textShadow: "0 0 4px rgba(244,161,48,0.7), 0 1px 0 rgba(0,0,0,0.5)",
          }}>
          {children}
        </span>
      );

    /* ── Hiệu ứng số mới — chỉ dùng color + textShadow, ko đổi background ── */

    case "ne_fire_num":
      return (
        <span className="inline-block font-black relative"
          style={{
            animation: "ne-fire-pulse 1.2s ease-in-out infinite",
            color: "#FF6A00",
            textShadow:
              "0 0 4px #FF4500, 0 0 10px #FF8C00, 0 0 20px #FFD700",
            WebkitTextStroke: "0.5px #FF0000",
          }}>
          {children}
        </span>
      );

    case "ne_ice_num":
      return (
        <span className="inline-block font-black"
          style={{
            animation: "ne-ice-glow 1.8s ease-in-out infinite",
            color: "#B0EEFF",
            textShadow:
              "0 0 5px #00BFFF, 0 0 12px #87CEEB, 0 0 24px #00FFFF",
            WebkitTextStroke: "0.5px #0080CC",
          }}>
          {children}
        </span>
      );

    case "ne_rainbow_num":
      return (
        <span className="inline-block font-black"
          style={{
            animation: "ne-rainbow-cycle 2.5s linear infinite",
            textShadow: "0 0 6px currentColor, 0 0 12px currentColor",
            WebkitTextStroke: "0.5px rgba(0,0,0,0.3)",
          }}>
          {children}
        </span>
      );

    case "ne_crown_num":
      return (
        <span className="inline-block font-black"
          style={{
            animation: "ne-crown-glow 1.5s ease-in-out infinite",
            color: "#FFD700",
            textShadow:
              "0 0 4px #FFD700, 0 0 10px #F4A130, 0 0 20px #FFD700",
            WebkitTextStroke: "0.5px #8B5A1E",
          }}>
          {children}
        </span>
      );

    default:
      return <>{children}</>;
  }
}
