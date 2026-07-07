"use client";
import { useEffect, useRef, useState } from "react";
import { EmberField } from "@/components/ui/EmberField";
import { thColor } from "@/lib/utils";
import { api } from "@/lib/api";
import { CastleIcon, CannonIcon, ProjectileBall, PROJECTILE_DUR, ImpactExplosion, ProjectileMiniIcon } from "@/lib/gameIcons";
import { NameEffect } from "@/components/ui/NameEffect";
import { Swords, Shield, Eye, EyeOff } from "lucide-react";

/* Màu sao — sẫm đậm để dễ nhìn, đặc biệt trên nền sáng */
const STAR_FILL = (s: number) =>
  s === 3 ? "#FFD700" : s === 2 ? "#C0C0C0" : s === 1 ? "#CD853F" : "#888";
const STAR_FILL_EMPTY = "rgba(200,200,200,0.25)";

function Stars({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map(i => (
        <svg key={i} width={11} height={11} viewBox="0 0 10 10">
          <polygon points="5,1 6.2,3.8 9.5,3.8 7,5.8 7.9,9 5,7.2 2.1,9 3,5.8 0.5,3.8 3.8,3.8"
            fill={i < stars ? STAR_FILL(stars) : STAR_FILL_EMPTY} />
        </svg>
      ))}
    </div>
  );
}

/* Badge kết quả 1 đòn đánh — gọn, đọc được trên cả 2 theme */
function AttackBadge({ attack }: { attack: any }) {
  const s = attack.stars;
  const bg   = s === 3 ? "#92660022" : s === 2 ? "#44444422" : s === 1 ? "#6B320022" : "#33333311";
  const text = s === 3 ? "#7A5500"   : s === 2 ? "#444444"   : s === 1 ? "#5C2A00"   : "#666";
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[9px] font-bold leading-none"
      style={{ background: bg, color: text, border: `1px solid ${text}33` }}>
      ⚔ #{attack.defenderPos}
      {[0,1,2].map(i => (
        <svg key={i} width={8} height={8} viewBox="0 0 10 10">
          <polygon points="5,1 6.2,3.8 9.5,3.8 7,5.8 7.9,9 5,7.2 2.1,9 3,5.8 0.5,3.8 3.8,3.8"
            fill={i < s ? STAR_FILL(s) : STAR_FILL_EMPTY} />
        </svg>
      ))}
    </span>
  );
}

function MemberCard({ member, attacks, defenses, side, iconMap, selected, onSelect, maxAttacks }: {
  member: any; attacks: any[]; defenses: any[]; side: "left" | "right";
  iconMap: Record<string, any>; selected: boolean; onSelect: () => void; maxAttacks: number;
}) {
  const isRight = side === "right";
  const totalStars = attacks.reduce((s, a) => s + a.stars, 0);
  // Pháo + lâu đài giờ trang trí cho PHÒNG THỦ: mất bao nhiêu sao khi bị đánh
  // (best/cao nhất trong các lượt bị tấn công) — 2 pháo = 2 sao, lâu đài vỡ = sao thứ 3.
  const starsConceded = defenses.length ? Math.max(...defenses.map((d: any) => d.stars || 0)) : 0;
  const darkCannons = Math.min(2, starsConceded);
  const castleRuined = starsConceded >= 3;

  return (
    <button onClick={onSelect}
      className={`w-full rounded-xl px-1.5 py-1.5 transition-all ${selected ? "ring-1 ring-yellow-500" : "hover:bg-black/5"}`}
      style={{ background: selected ? "rgba(244,161,48,0.08)" : undefined }}>
      <div className={`flex ${isRight ? "flex-row-reverse" : "flex-row"} items-center gap-1.5`}>

        {/* Lâu đài chibi ở giữa, 2 pháo phòng thủ đặt sát 2 bên (nhỏ + khít lại
            để vừa màn hình điện thoại, trước to quá bị chèn sang cột bên
            cạnh) — vỡ nát hẳn (không chỉ tối màu) nếu mất sao khi phòng thủ.
            Lâu đài vỡ thành phế tích nếu mất trọn 3 sao. */}
        <div className={`flex items-center shrink-0 ${isRight ? "flex-row-reverse" : "flex-row"}`} style={{ gap: 1 }}>
          <CannonIcon size={14} svgKey={iconMap[member.tag]?.equipped_cannon} broken={0 < darkCannons} />
          <CastleIcon th={member.townHallLevel} svgKey={castleRuined ? "castle_ruins" : iconMap[member.tag]?.equipped_castle} size={34} animate={false} />
          <CannonIcon size={14} svgKey={iconMap[member.tag]?.equipped_cannon} broken={1 < darkCannons} />
        </div>

        {/* Name + stars + lượt đánh */}
        <div className={`flex-1 min-w-0 ${isRight ? "text-right" : "text-left"}`}>
          <p className="text-[10px] font-semibold truncate leading-tight" style={{ color: "var(--py-card-text, #e5e7eb)" }}>
            <NameEffect effectKey={iconMap[member.tag]?.equipped_effect}>{member.name}</NameEffect>
          </p>
          <div className={`flex gap-0.5 mt-0.5 ${isRight ? "justify-end" : "justify-start"}`}>
            <Stars stars={totalStars} />
          </div>
          {/* Lượt đánh — hiện icon tia đạn đang sở hữu, sáng = còn lượt, mờ = đã dùng */}
          <div className={`flex gap-0.5 mt-0.5 ${isRight ? "justify-end" : "justify-start"}`}>
            {Array.from({ length: maxAttacks }).map((_, i) => (
              <ProjectileMiniIcon key={i} size={14} svgKey={iconMap[member.tag]?.equipped_projectile} fired={!!attacks[i]} />
            ))}
          </div>
        </div>
      </div>

      {/* Attack badges — hiện bên phải card bên trái, bên trái card bên phải */}
      {attacks.length > 0 && (
        <div className={`flex flex-wrap gap-0.5 mt-1 ${isRight ? "justify-end" : "justify-start"}`}>
          {attacks.map((a, i) => <AttackBadge key={i} attack={a} />)}
        </div>
      )}
    </button>
  );
}

export default function WarBattlefieldMap({ war }: { war: any }) {
  const [iconMap, setIconMap] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<{ tag: string; side: "left" | "right" } | null>(null);
  const [viewMode, setViewMode] = useState<"single" | "all">("single");
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [arcs, setArcs] = useState<{ id: string; x1: number; y1: number; x2: number; y2: number; side: "left" | "right"; attackerTag: string; begin: number }[]>([]);

  useEffect(() => {
    api.getRoster().then((roster: any[]) => {
      const m: Record<string, any> = {};
      roster.forEach(r => { m[r.tag] = r; });
      setIconMap(m);
    }).catch(() => {});
  }, []);

  const ourTeam  = [...(war?.clan?.members   || [])].sort((a, b) => a.mapPosition - b.mapPosition);
  const theirTeam = [...(war?.opponent?.members || [])].sort((a, b) => a.mapPosition - b.mapPosition);

  function buildAttackLookup(attackers: any[], defenders: any[]) {
    const byTag: Record<string, any> = {};
    defenders.forEach(m => { byTag[m.tag] = m; });
    return attackers.reduce((acc, m) => {
      acc[m.tag] = (m.attacks || []).map((a: any) => ({
        ...a, defenderPos: byTag[a.defenderTag]?.mapPosition ?? "?",
      }));
      return acc;
    }, {} as Record<string, any[]>);
  }

  function buildDefMap(defenders: any[], attackers: any[]) {
    const map: Record<string, any[]> = {};
    attackers.forEach(m => {
      (m.attacks || []).forEach((a: any) => {
        (map[a.defenderTag] ||= []).push({ ...a, attackerTag: m.tag });
      });
    });
    return map;
  }

  const ourAtks   = buildAttackLookup(ourTeam,   theirTeam);
  const theirAtks = buildAttackLookup(theirTeam, ourTeam);
  const ourDefs   = buildDefMap(ourTeam,   theirTeam);
  const theirDefs = buildDefMap(theirTeam, ourTeam);

  const connected = new Set<string>();
  let selectedMember: any = null;
  let attackDetails: any[] = [];
  let defenseDetails: any[] = [];
  if (selected) {
    const isLeft = selected.side === "left";
    const myAtks = isLeft ? ourAtks   : theirAtks;
    const myDefs = isLeft ? ourDefs   : theirDefs;
    const myTeam = isLeft ? ourTeam : theirTeam;
    const oppTeam = isLeft ? theirTeam : ourTeam;
    connected.add(selected.tag);
    selectedMember = myTeam.find(m => m.tag === selected.tag);
    (myAtks[selected.tag] || []).forEach((a: any) => {
      const def = oppTeam.find(o => o.mapPosition === a.defenderPos);
      if (def) connected.add(def.tag);
      attackDetails.push({ ...a, defenderName: def?.name || "?" });
    });
    (myDefs[selected.tag] || []).forEach((a: any) => {
      connected.add(a.attackerTag);
      const atk = oppTeam.find(o => o.tag === a.attackerTag);
      defenseDetails.push({ ...a, attackerName: atk?.name || "?", attackerPos: atk?.mapPosition });
    });
  }

  const fade = (tag: string) => viewMode === "all" || !selected || connected.has(tag);

  // Đo vị trí thật của từng thẻ trên màn hình để vẽ đúng đường bay tia đạn —
  // đáng tin cậy hơn hẳn tính theo index vì tên dài/ngắn khác nhau làm chiều
  // cao mỗi hàng không đều nhau.
  useEffect(() => {
    if (!containerRef.current) { setArcs([]); return; }
    if (viewMode === "single" && !selected) { setArcs([]); return; }
    const measure = () => {
      const containerBox = containerRef.current!.getBoundingClientRect();
      const center = (tag: string) => {
        const el = cardRefs.current.get(tag);
        if (!el) return null;
        const box = el.getBoundingClientRect();
        return { x: box.left + box.width / 2 - containerBox.left, y: box.top + box.height / 2 - containerBox.top };
      };
      const newArcs: typeof arcs = [];

      if (viewMode === "all") {
        // Gom TẤT CẢ đòn đánh 2 bên lại, xếp theo đúng thứ tự đã đánh (order
        // của CoC) rồi rải đều "begin" ra 1 khung thời gian ngắn — mô phỏng
        // "ai đánh trước thì đạn bay trước" (CoC không cho biết giờ thật của
        // từng đòn đánh, chỉ có thứ tự, nên đây là ước lượng theo thứ tự chứ
        // không phải đúng tỉ lệ giờ thực 1:1).
        const allShots: { attackerTag: string; defenderTag: string; side: "left" | "right"; order: number }[] = [];
        Object.entries(ourAtks).forEach(([tag, atks]) => (atks as any[]).forEach(a => allShots.push({ attackerTag: tag, defenderTag: a.defenderTag, side: "left", order: a.order ?? 0 })));
        Object.entries(theirAtks).forEach(([tag, atks]) => (atks as any[]).forEach(a => allShots.push({ attackerTag: tag, defenderTag: a.defenderTag, side: "right", order: a.order ?? 0 })));
        allShots.sort((a, b) => a.order - b.order);
        const CYCLE = 18; // dàn trải toàn bộ đòn đánh trong war ra 18 giây
        allShots.forEach((s, i) => {
          const from = center(s.attackerTag);
          const to = center(s.defenderTag);
          const beginDelay = allShots.length > 1 ? (i / (allShots.length - 1)) * CYCLE : 0;
          if (from && to) newArcs.push({ id: `all-${i}`, x1: from.x, y1: from.y, x2: to.x, y2: to.y, side: s.side, attackerTag: s.attackerTag, begin: beginDelay });
        });
      } else if (selected) {
        // attackDetails: tia bắn ĐI từ người đang chọn -> phe bắn = phe của người đang chọn
        attackDetails.forEach((a, i) => {
          const from = center(selected.tag);
          const to = center(a.defenderTag);
          if (from && to) newArcs.push({ id: `atk-${i}`, x1: from.x, y1: from.y, x2: to.x, y2: to.y, side: selected.side, attackerTag: selected.tag, begin: 0 });
        });
        // defenseDetails: tia bắn ĐẾN người đang chọn -> phe bắn = phe đối phương
        defenseDetails.forEach((a, i) => {
          const from = center(a.attackerTag);
          const to = center(selected.tag);
          const attackerSide = selected.side === "left" ? "right" : "left";
          if (from && to) newArcs.push({ id: `def-${i}`, x1: from.x, y1: from.y, x2: to.x, y2: to.y, side: attackerSide, attackerTag: a.attackerTag, begin: 0 });
        });
      }
      setArcs(newArcs);
    };
    // Đợi 1 nhịp để layout ổn định (đổi selected có thể làm card đổi vị trí)
    const t = setTimeout(measure, 30);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, war, viewMode]);

  const rows = Math.max(ourTeam.length, theirTeam.length);
  const maxAttacks = war?.attacksPerMember || (war?.isCWL ? 1 : 2);

  return (
    <div className="card !p-0 overflow-hidden relative">
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 flex-wrap gap-1">
        <h3 className="font-bold text-sm" style={{ color: "var(--py-card-text, #fff)" }}>🗺️ Chiến trường</h3>
        <div className="flex items-center gap-2 text-[9px] text-gray-500 flex-wrap">
          <button onClick={() => { setViewMode(v => v === "all" ? "single" : "all"); setSelected(null); }}
            title={viewMode === "all" ? "Đang xem tất cả — bấm để tắt" : "Xem tất cả"}
            className="p-1.5 rounded-lg flex items-center justify-center"
            style={{ background: viewMode === "all" ? "rgba(244,161,48,0.2)" : "rgba(120,120,140,0.12)", color: viewMode === "all" ? "#F4A130" : "#9CA3AF" }}>
            {viewMode === "all" ? <Eye size={13}/> : <EyeOff size={13}/>}
          </button>
          <span>⚔ #X = vị trí tấn công</span>
          <span className="flex items-center gap-1">
            {Array.from({ length: maxAttacks }).map((_, i) => (
              <ProjectileMiniIcon key={i} size={11} fired={false} />
            ))}
            = {maxAttacks} lượt đánh
          </span>
          {selected && viewMode === "single" && (
            <>
              <span className="flex items-center gap-1 text-sky-400"><Swords size={10}/> phe mình</span>
              <span className="flex items-center gap-1 text-red-400"><Shield size={10}/> phe địch</span>
              <button onClick={() => setSelected(null)} className="text-yellow-600 font-bold">✕</button>
            </>
          )}
        </div>
      </div>
      {viewMode === "all" && (
        <p className="px-3 pb-1 text-[9px] text-gray-500">
          Đang phát lại theo đúng thứ tự đánh (ai đánh trước bay trước) — dồn cả trận vào ~18 giây cho dễ theo dõi.
        </p>
      )}

      {/* Team labels */}
      <div className="grid px-2" style={{ gridTemplateColumns: "1fr 20px 1fr" }}>
        <p className="text-[9px] font-bold text-blue-600 truncate">{war?.clan?.name}</p>
        <div />
        <p className="text-[9px] font-bold text-red-500 truncate text-right">{war?.opponent?.name}</p>
      </div>

      {/* Member rows */}
      <div className="px-1 pb-3 space-y-0 relative" ref={containerRef}>
        {Array.from({ length: rows }).map((_, i) => {
          const left  = ourTeam[i];
          const right = theirTeam[i];
          return (
            <div key={i} className="grid items-start" style={{ gridTemplateColumns: "1fr 18px 1fr" }}>
              <div ref={el => { if (left) { if (el) cardRefs.current.set(left.tag, el); else cardRefs.current.delete(left.tag); } }}
                style={{ opacity: left && fade(left.tag) ? 1 : 0.2, transition: "opacity 0.15s" }}>
                {left && (
                  <MemberCard member={left} side="left"
                    attacks={ourAtks[left.tag] || []} defenses={ourDefs[left.tag] || []} iconMap={iconMap} maxAttacks={maxAttacks}
                    selected={selected?.tag === left.tag}
                    onSelect={() => { setViewMode("single"); setSelected(s => s?.tag === left.tag ? null : { tag: left.tag, side: "left" }); }} />
                )}
              </div>

              <div className="flex items-center justify-center pt-2">
                <span className="text-[9px] text-gray-400 font-mono font-bold">{i + 1}</span>
              </div>

              <div ref={el => { if (right) { if (el) cardRefs.current.set(right.tag, el); else cardRefs.current.delete(right.tag); } }}
                style={{ opacity: right && fade(right.tag) ? 1 : 0.2, transition: "opacity 0.15s" }}>
                {right && (
                  <MemberCard member={right} side="right"
                    attacks={theirAtks[right.tag] || []} defenses={theirDefs[right.tag] || []} iconMap={iconMap} maxAttacks={maxAttacks}
                    selected={selected?.tag === right.tag}
                    onSelect={() => { setViewMode("single"); setSelected(s => s?.tag === right.tag ? null : { tag: right.tag, side: "right" }); }} />
                )}
              </div>
            </div>
          );
        })}

        {/* Lớp phủ tia đạn — vẽ SAU danh sách thành viên để luôn hiện TRÊN
            lâu đài/pháo, không bị nhà che mất hướng bay ở điểm xuất phát nữa. */}
        {arcs.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", zIndex: 30 }}>
            {arcs.map(a => {
              const midX = (a.x1 + a.x2) / 2;
              const midY = (a.y1 + a.y2) / 2;
              const dx = a.x2 - a.x1;
              const dy = a.y2 - a.y1;
              const dist = Math.hypot(dx, dy) || 1;
              // Luôn cong lên trên — cho phép cong CAO HƠN khi 2 người ở xa
              // nhau (màn hình máy tính cột 2 bên cách xa nhau).
              const arcHeight = Math.min(140, Math.max(20, dist * 0.4));
              const ctrlX = midX;
              const ctrlY = midY - arcHeight;
              const pathD = `M ${a.x1} ${a.y1} Q ${ctrlX} ${ctrlY} ${a.x2} ${a.y2}`;
              const isOurs = a.side === "left";
              const color = isOurs ? "#38BDF8" : "#FF5A36";
              const skinKey = iconMap[a.attackerTag]?.equipped_projectile || "proj_classic";
              return (
                <g key={a.id}>
                  {/* Đường bay mờ, luôn hiện để thấy rõ hình vòng cung */}
                  <path d={pathD} fill="none" stroke={color} strokeOpacity={0.28} strokeWidth={1.5} strokeDasharray="3 4" />

                  <ProjectileBall svgKey={skinKey} pathD={pathD} teamColor={color} dur={PROJECTILE_DUR} begin={a.begin} />

                  {/* Hiệu ứng nổ lúc đạn chạm đích — theo skin đã trang bị của người bắn */}
                  <ImpactExplosion svgKey={iconMap[a.attackerTag]?.equipped_explosion || "exp_classic"} x={a.x2} y={a.y2} dur={PROJECTILE_DUR} begin={a.begin} />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
