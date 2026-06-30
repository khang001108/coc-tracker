"use client";
import { useEffect, useRef, useState } from "react";
import { thColor } from "@/lib/utils";
import { api } from "@/lib/api";
import { CastleIcon, CannonIcon } from "@/lib/gameIcons";

const ROW_H = 60;
const PAD_TOP = 20;
const COL_X_LEFT = 46;
const COL_X_RIGHT_OFFSET = 46; // tính từ mép phải

function findDefenderPosition(defenderTag: string, list: any[]): number | null {
  const found = list.find((m: any) => m.tag === defenderTag);
  return found ? found.mapPosition : null;
}

export default function WarBattlefieldMap({ war }: { war: any }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(720);
  const [iconMap, setIconMap] = useState<Record<string, { castle: string; cannon: string }>>({});

  useEffect(() => {
    api.getRoster().then((roster: any[]) => {
      const map: Record<string, { castle: string; cannon: string }> = {};
      roster.forEach(m => { map[m.tag] = { castle: m.equipped_castle, cannon: m.equipped_cannon }; });
      setIconMap(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ourTeam: any[] = [...(war?.clan?.members || [])].sort((a, b) => a.mapPosition - b.mapPosition);
  const theirTeam: any[] = [...(war?.opponent?.members || [])].sort((a, b) => a.mapPosition - b.mapPosition);
  const rows = Math.max(ourTeam.length, theirTeam.length);
  const height = PAD_TOP * 2 + rows * ROW_H;

  function yFor(pos: number) {
    return PAD_TOP + (pos - 1) * ROW_H + ROW_H / 2;
  }

  const starColor = (stars: number) =>
    stars === 3 ? "#FFD700" : stars === 2 ? "#C0C0C0" : stars === 1 ? "#CD7F32" : "#555";

  // Thu thập toàn bộ đường tấn công: ta đánh địch + địch đánh ta
  type Line = { id: string; fromY: number; toY: number; fromSide: "left" | "right"; stars: number; order: number; attackerName: string; defenderTh: number };
  const lines: Line[] = [];

  ourTeam.forEach((m: any) => {
    (m.attacks || []).forEach((a: any) => {
      const defPos = findDefenderPosition(a.defenderTag, theirTeam);
      if (defPos == null) return;
      lines.push({
        id: `${m.tag}-${a.order}`,
        fromY: yFor(m.mapPosition), toY: yFor(defPos), fromSide: "left",
        stars: a.stars, order: a.order, attackerName: m.name,
        defenderTh: theirTeam.find((t: any) => t.mapPosition === defPos)?.townHallLevel || 0,
      });
    });
  });
  theirTeam.forEach((m: any) => {
    (m.attacks || []).forEach((a: any) => {
      const defPos = findDefenderPosition(a.defenderTag, ourTeam);
      if (defPos == null) return;
      lines.push({
        id: `opp-${m.tag}-${a.order}`,
        fromY: yFor(m.mapPosition), toY: yFor(defPos), fromSide: "right",
        stars: a.stars, order: a.order, attackerName: m.name,
        defenderTh: ourTeam.find((t: any) => t.mapPosition === defPos)?.townHallLevel || 0,
      });
    });
  });

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          🗺️ Bản đồ chiến trường
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#FFD700" }} /> 3⭐</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#C0C0C0" }} /> 2⭐</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#CD7F32" }} /> 1⭐</span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <div ref={containerRef} className="relative mx-auto" style={{ width: "100%", minWidth: 360, maxWidth: 720, height }}>
          {/* Đường kẻ vùng giữa */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-800" />

          {/* Nhãn 2 phe */}
          <div className="absolute top-0 left-3 text-[10px] font-bold text-blue-400 uppercase tracking-wide">
            {war?.clan?.name || "Ta"}
          </div>
          <div className="absolute top-0 right-3 text-[10px] font-bold text-red-400 uppercase tracking-wide">
            {war?.opponent?.name || "Địch"}
          </div>

          {/* SVG đường tấn công */}
          <svg className="absolute inset-0 pointer-events-none" width="100%" height={height} style={{ overflow: "visible" }}>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
              </marker>
            </defs>
            {lines.map(l => {
              const rightX = containerWidth - COL_X_RIGHT_OFFSET;
              const x1 = l.fromSide === "left" ? COL_X_LEFT : rightX;
              const x2 = l.fromSide === "left" ? rightX : COL_X_LEFT;
              const active = hovered === null || hovered === l.id;
              return (
                <g key={l.id} opacity={active ? 1 : 0.12} style={{ color: starColor(l.stars), transition: "opacity 0.2s" }}>
                  <line x1={x1} y1={l.fromY} x2={x2} y2={l.toY}
                    stroke={starColor(l.stars)} strokeWidth={hovered === l.id ? 2.5 : 1.5}
                    strokeDasharray="5,4" markerEnd="url(#arrow)" />
                </g>
              );
            })}
          </svg>

          {/* Cột nhà bên ta */}
          {ourTeam.map((m: any) => {
            const attacks = m.attacks || [];
            return (
              <div key={m.tag}
                className="absolute flex flex-col items-center gap-0.5"
                style={{ left: COL_X_LEFT - 17, top: yFor(m.mapPosition) - 23 }}
                onMouseEnter={() => setHovered(`${m.tag}-hover`)}
                onMouseLeave={() => setHovered(null)}>
                <CastleIcon th={m.townHallLevel} svgKey={iconMap[m.tag]?.castle} />
                <div className="flex gap-0.5">
                  {[0, 1].map(i => (
                    <CannonIcon key={i} size={12} svgKey={iconMap[m.tag]?.cannon} fired={!!attacks[i]} />
                  ))}
                </div>
              </div>
            );
          })}
          {ourTeam.map((m: any) => (
            <div key={`label-${m.tag}`} className="absolute text-[10px] text-gray-400 truncate"
              style={{ left: COL_X_LEFT + 22, top: yFor(m.mapPosition) - 6, width: "calc(50% - 80px)" }}>
              {m.name}
            </div>
          ))}

          {/* Cột nhà bên địch */}
          {theirTeam.map((m: any) => {
            const attacks = m.attacks || [];
            return (
              <div key={m.tag} className="absolute flex flex-col items-center gap-0.5"
                style={{ right: COL_X_RIGHT_OFFSET - 17, top: yFor(m.mapPosition) - 23 }}>
                <CastleIcon th={m.townHallLevel} svgKey={iconMap[m.tag]?.castle} />
                <div className="flex gap-0.5">
                  {[0, 1].map(i => (
                    <CannonIcon key={i} size={12} svgKey={iconMap[m.tag]?.cannon} fired={!!attacks[i]} />
                  ))}
                </div>
              </div>
            );
          })}
          {theirTeam.map((m: any) => (
            <div key={`label-${m.tag}`} className="absolute text-[10px] text-gray-400 truncate text-right"
              style={{ right: COL_X_RIGHT_OFFSET + 22, top: yFor(m.mapPosition) - 6, width: "calc(50% - 80px)" }}>
              {m.name}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-gray-600 px-4 pb-3 pt-1">
        Mỗi lâu đài = 1 thành viên (số là cấp Hội Đồng Chiến Tranh), 2 pháo nhỏ bên dưới = 2 lượt đánh. Đường đứt nối người tấn công sang nhà bị đánh, màu theo số sao. Đổi giao diện lâu đài/pháo riêng tại trang Đăng nhập.
      </p>
    </div>
  );
}
