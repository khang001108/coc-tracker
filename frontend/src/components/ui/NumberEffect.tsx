"use client";

export const NUMBER_EFFECT_KEYS = ["num_bounce", "num_neon", "num_spin", "num_pop"] as const;

/** Bọc quanh số cấp TH (trong th-badge) để áp hiệu ứng động dễ thương/pixel. */
export function NumberEffect({ effectKey, children }: { effectKey?: string | null; children: React.ReactNode }) {
  if (!effectKey) return <>{children}</>;

  switch (effectKey) {
    case "num_bounce":
      return <span className="inline-block" style={{ animation: "num-bounce 0.7s ease-in-out infinite", imageRendering: "pixelated" }}>{children}</span>;

    case "num_neon":
      return <span className="inline-block" style={{ animation: "num-neon 1.5s ease-in-out infinite", color: "#fff" }}>{children}</span>;

    case "num_spin":
      return (
        <span className="relative inline-flex items-center justify-center">
          <span className="absolute inset-[-3px] rounded-full border-2 border-dashed border-yellow-400"
            style={{ animation: "num-spin-ring 3s linear infinite" }} />
          <span className="relative">{children}</span>
        </span>
      );

    case "num_pop":
      return <span className="inline-block" style={{ animation: "num-pop 0.9s ease-in-out infinite", color: "#FFD700" }}>{children}</span>;

    default:
      return <>{children}</>;
  }
}
