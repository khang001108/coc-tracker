/**
 * Bộ icon SVG tự vẽ phong cách La Mã/Hy Lạp cổ đại (vòng nguyệt quế, cột đền,
 * khiên, cuộn giấy, huy chương...) — dùng làm icon cho MỌI pill tab trong web,
 * thay thế emoji (hiển thị khác nhau tuỳ máy/font) bằng hình vẽ nhất quán.
 * Mỗi icon là 1 <svg> line-art đơn giản, viewBox 24x24, dùng chung currentColor
 * nên đổi màu được qua CSS (đặt trong khung huy hiệu vàng ở SlidingTabs).
 */
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Vòng nguyệt quế — tổng quan / chung / thành tích chung */
export function LaurelIcon() {
  return (
    <svg {...base}>
      <path d="M8 4c-2.5 1-4 4-4 7.5C4 16 6 19 9.5 20" />
      <path d="M16 4c2.5 1 4 4 4 7.5 0 4.5-2 7.5-5.5 8.5" />
      {[5, 8, 11, 14].map(y => (
        <path key={"l" + y} d={`M${7 - (y - 5) * 0.15} ${y} l-2.6 -1.1`} />
      ))}
      {[5, 8, 11, 14].map(y => (
        <path key={"r" + y} d={`M${17 + (y - 5) * 0.15} ${y} l2.6 -1.1`} />
      ))}
    </svg>
  );
}

/** Cột đền Doric — quản trị / chung / clan */
export function ColumnIcon() {
  return (
    <svg {...base}>
      <path d="M5 4h14" /><path d="M5 20h14" />
      <path d="M7 4v14" /><path d="M17 4v14" />
      <path d="M10 4v14" /><path d="M14 4v14" />
      <path d="M4 20h16" strokeWidth={2} />
    </svg>
  );
}

/** Cuộn giấy — lịch sử / nội quy / nhật ký */
export function ScrollIcon() {
  return (
    <svg {...base}>
      <path d="M6 5.5a2 2 0 1 1 0 4H18" />
      <path d="M18 18.5a2 2 0 1 0 0-4H6" />
      <path d="M6 7.5v10" /><path d="M18 5.5v11" />
      <path d="M9 10h7" /><path d="M9 13.5h7" />
    </svg>
  );
}

/** Cân công lý cách điệu — xét duyệt / chế tài */
export function ScaleIcon() {
  return (
    <svg {...base}>
      <path d="M12 3v17" /><path d="M8 20h8" />
      <path d="M4 7h16" />
      <path d="M4 7 L2.3 11.5a2.2 2.2 0 0 0 3.4 0Z" />
      <path d="M20 7 L18.3 11.5a2.2 2.2 0 0 0 3.4 0Z" />
      <circle cx="12" cy="3.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Khiên tròn hoplite — war / phòng thủ */
export function ShieldIcon() {
  return (
    <svg {...base}>
      <path d="M12 3 5 5.5v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10v-5Z" />
      <path d="M12 8v8" /><path d="M8.5 12h7" />
    </svg>
  );
}

/** Kiếm chéo — CWL / chiến đấu */
export function SwordsIcon() {
  return (
    <svg {...base}>
      <path d="M4 20 15 9" /><path d="M13 7l2 2-1.3 1.3-2-2Z" fill="currentColor" />
      <path d="M20 20 9 9" /><path d="M11 7l-2 2 1.3 1.3 2-2Z" fill="currentColor" />
      <path d="M4 20l2-.6M20 20l-2-.6" />
    </svg>
  );
}

/** Huy chương ngôi sao — công trạng / huy chương / danh vọng */
export function MedalIcon() {
  return (
    <svg {...base}>
      <path d="M8 3 5 8l3 1M16 3l3 5-3 1" />
      <circle cx="12" cy="13" r="6" />
      <path d="M12 10.2 13 12.3 15.3 12.6 13.6 14.2 14 16.5 12 15.3 10 16.5 10.4 14.2 8.7 12.6 11 12.3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Bình gốm amphora — cửa hàng / kho báu */
export function AmphoraIcon() {
  return (
    <svg {...base}>
      <path d="M10 3h4" /><path d="M10 3c0 2-1.5 2-1.5 4M14 3c0 2 1.5 2 1.5 4" />
      <path d="M8.5 7c-2 1.5-2.5 4-2.5 6 0 4.5 2.5 8 6 8s6-3.5 6-8c0-2-.5-4.5-2.5-6" />
      <path d="M6.3 11h11.4" />
    </svg>
  );
}

/** Ngọn đuốc Olympic — sự kiện / nhiệm vụ */
export function TorchIcon() {
  return (
    <svg {...base}>
      <path d="M12 22V13" />
      <path d="M12 13c-3-1.5-4-4-2.7-7.4C10 4 11 2.5 12 2c1 .5 2 2 2.7 3.6C16 9 15 11.5 12 13Z" />
      <path d="M9 9.5c.6.9 1.6 1.5 3 1.7" />
    </svg>
  );
}

/** Bảng đá khắc chữ — thông báo / dữ liệu */
export function TabletIcon() {
  return (
    <svg {...base}>
      <path d="M5 3.5 19 3l.6 17-15 .5Z" />
      <path d="M8 8h8" /><path d="M8 11.5h8" /><path d="M8 15h5" />
    </svg>
  );
}

/** Kèn loa sứ giả — Discord / Telegram (liên lạc) */
export function HeraldIcon() {
  return (
    <svg {...base}>
      <path d="M3 10v4h3l6 4V6L6 10Z" />
      <path d="M15 9.5c1.2 1 1.2 4.5 0 5.5" />
      <path d="M18 7c2.2 2 2.2 8 0 10" />
    </svg>
  );
}

/** Bình nghiêng đổ — dọn dẹp tài sản */
export function UrnPourIcon() {
  return (
    <svg {...base}>
      <path d="M6 4h6l1 3-2 8c-.3 1.5-1.7 2.5-3 2.5S5.3 16.5 5 15l-2-8 1-3Z" transform="rotate(-25 9 12)" />
      <path d="M16 9c1 1 2.4 1.6 4 1.7" />
      <circle cx="21" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="14.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Ô lát mosaic — bố cục / trang trí */
export function MosaicIcon() {
  return (
    <svg {...base}>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  );
}

/** Đàn lia — nhạc nền */
export function LyreIcon() {
  return (
    <svg {...base}>
      <path d="M6 20V9c0-3 1.5-5 2.5-6M18 20V9c0-3-1.5-5-2.5-6" />
      <path d="M6 20h2M16 20h2" />
      <path d="M9 8v11M12 6.5V19M15 8v11" />
      <path d="M6 11c0-2 1-3.5 3-4M18 11c0-2-1-3.5-3-4" />
    </svg>
  );
}

/** Cờ hiệu vexillum — ảnh nền / banner */
export function BannerIcon() {
  return (
    <svg {...base}>
      <path d="M6 3v18" />
      <path d="M6 4h13l-2.5 3.5L19 11H6Z" />
    </svg>
  );
}

/** Kim tự tháp bậc thang — sơ đồ / cấp bậc */
export function ZigguratIcon() {
  return (
    <svg {...base}>
      <path d="M3 19h18" />
      <path d="M5 19v-3h14v3" />
      <path d="M7 16v-3h10v3" />
      <path d="M9 13v-3h6v3" />
      <path d="M12 10V6" />
    </svg>
  );
}

/** Chân dung công dân La Mã — danh sách thành viên */
export function CitizensIcon() {
  return (
    <svg {...base}>
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="16" cy="9.5" r="2" />
      <path d="M4.5 19c.3-3 2.2-5 4.5-5s4.2 2 4.5 5" />
      <path d="M14 19c.3-2.3 1.7-4 3.5-4s3.2 1.7 3.5 4" />
    </svg>
  );
}

/** Bảng sáp + bút stylus — nhật ký */
export function TabletStylusIcon() {
  return (
    <svg {...base}>
      <rect x="4.5" y="4" width="12" height="16" rx="1.2" />
      <path d="M7.5 8h6M7.5 11.5h6M7.5 15h4" />
      <path d="M14.5 20 20 14.5 21.3 15.8 15.8 21.3Z" />
    </svg>
  );
}

/** Mầm cây ô liu — trồng trọt */
export function SproutIcon() {
  return (
    <svg {...base}>
      <path d="M12 21V11" />
      <path d="M12 12c0-3.5-2-5.5-5.5-5.8C6 10 8 12.5 12 12Z" />
      <path d="M12 9c0-3 1.8-5 5-5.3.8 3.3-1.2 6-5 5.3Z" />
    </svg>
  );
}

/** Cây nhỏ tán tròn — trang trí farm (cây/vật nuôi) */
export function OliveTreeIcon() {
  return (
    <svg {...base}>
      <path d="M12 21v-7" />
      <circle cx="9.5" cy="9" r="3.2" />
      <circle cx="14.5" cy="8" r="3" />
      <circle cx="12" cy="6" r="2.6" />
    </svg>
  );
}

/** Villa mái ngói — farm của tôi */
export function VillaIcon() {
  return (
    <svg {...base}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10.5 20v-5h3v5" />
    </svg>
  );
}

/** Compa vẽ bản đồ — ghé thăm / khám phá */
export function CompassIcon() {
  return (
    <svg {...base}>
      <path d="M12 3.5 3 8.5 12 20.5 21 8.5Z" />
      <circle cx="12" cy="3.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M12 8 9.5 15" />
    </svg>
  );
}

/** Chim bồ câu đưa thư — Telegram */
export function DoveIcon() {
  return (
    <svg {...base}>
      <path d="M4 12c3-3 6-3.5 9-2.3L20 6l-3 6.3c1 2.7.2 5.5-2.3 7.2-3 2-6.7 1.6-9-1" />
      <path d="M13 9.7 8 15" />
      <circle cx="15.3" cy="8.3" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Xăng-đan có cánh (Hermes) — sứ giả / thông báo */
export function MessengerIcon() {
  return (
    <svg {...base}>
      <path d="M6 15c0-4 2.5-7 6-7s6 3 6 7" />
      <path d="M6 15h12v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" />
      <path d="M4 10c1.5.3 2.7 0 3.5-1M20 10c-1.5.3-2.7 0-3.5-1" />
    </svg>
  );
}

/** Cột đổ gãy — chế tài / hạ cấp */
export function BrokenColumnIcon() {
  return (
    <svg {...base}>
      <path d="M4 20h9" />
      <path d="M6.5 20 8 10" /><path d="M10.5 20 9.8 15" />
      <path d="M9 8l4-1.3-.6-2.4L8 5.5Z" />
      <path d="M14 12.5l6 2" /><path d="M14 12.5l1.4 4.3" /><path d="M14 12.5l4.5-1.6" />
    </svg>
  );
}

/** Cổng thành khép — khai trừ */
export function GateIcon() {
  return (
    <svg {...base}>
      <path d="M5 20V6h4v14" /><path d="M15 20V6h4v14" />
      <path d="M5 6h14" />
      <path d="M9 20V9h6v11" strokeDasharray="2.5 2" />
      <path d="M4 21h16" strokeWidth={2} />
    </svg>
  );
}
