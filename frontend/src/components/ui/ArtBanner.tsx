/**
 * Ảnh nền trang trí (thay cho các icon SVG watermark cũ) — phủ mờ dần vào
 * nền của card để chữ vẫn đọc rõ, tự co giãn đẹp trên cả điện thoại lẫn
 * máy tính (dùng object-cover, không bị méo/cắt xấu ở tỉ lệ nào).
 */
export function ArtBanner({
  src,
  objectPosition = "center",
  opacity = 0.8,
}: {
  src: string;
  objectPosition?: string;
  opacity?: number;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        style={{ objectPosition, opacity }}
        loading="lazy"
      />
      {/* Phủ đều toàn bộ ảnh (không chỉ mờ dần ở đáy) để chữ đè lên vẫn rõ —
          màu phủ đổi theo theme (tối/sáng) qua biến CSS, không hardcode */}
      <div className="absolute inset-0" style={{ background: "var(--art-overlay-wash)" }} />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, transparent 25%, var(--art-overlay-edge) 96%)" }}
      />
    </div>
  );
}
