"use client";
import { useEffect, useRef, useState } from "react";
import { EmberField } from "@/components/ui/EmberField";
import { thColor } from "@/lib/utils";
import { api } from "@/lib/api";
import { CastleIcon, CannonIcon } from "@/lib/gameIcons";
import { NameEffect } from "@/components/ui/NameEffect";
import { Swords, Shield } from "lucide-react";

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

function MemberCard({ member, attacks, side, iconMap, selected, onSelect, maxAttacks }: {
  member: any; attacks: any[]; side: "left" | "right";
  iconMap: Record<string, any>; selected: boolean; onSelect: () => void; maxAttacks: number;
}) {
  const isRight = side === "right";
  const totalStars = attacks.reduce((s, a) => s + a.stars, 0);

  return (
    <button onClick={onSelect}
      className={`w-full rounded-xl px-1.5 py-1.5 transition-all ${selected ? "ring-1 ring-yellow-500" : "hover:bg-black/5"}`}
      style={{ background: selected ? "rgba(244,161,48,0.08)" : undefined }}>
      <div className={`flex ${isRight ? "flex-row-reverse" : "flex-row"} items-center gap-1.5`}>

        {/* Castle icon */}
        <div className="shrink-0">
          <CastleIcon th={member.townHallLevel} svgKey={iconMap[member.tag]?.equipped_castle} size={28} animate={false} />
        </div>

        {/* Name + stars + cannons */}
        <div className={`flex-1 min-w-0 ${isRight ? "text-right" : "text-left"}`}>
          <p className="text-[10px] font-semibold truncate leading-tight" style={{ color: "var(--py-card-text, #e5e7eb)" }}>
            <NameEffect effectKey={iconMap[member.tag]?.equipped_effect}>{member.name}</NameEffect>
          </p>
          <div className={`flex gap-0.5 mt-0.5 ${isRight ? "justify-end" : "justify-start"}`}>
            <Stars stars={totalStars} />
          </div>
          {/* Số pháo = số lượt đánh cho phép (1 ở CWL, 2 ở war thường) */}
          <div className={`flex gap-0.5 mt-0.5 ${isRight ? "justify-end" : "justify-start"}`}>
            {Array.from({ length: maxAttacks }).map((_, i) => (
              <CannonIcon key={i} size={10} svgKey={iconMap[member.tag]?.equipped_cannon} fired={!!attacks[i]} />
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
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [arcs, setArcs] = useState<{ id: string; x1: number; y1: number; x2: number; y2: number; kind: "attack" | "defense" }[]>([]);

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

  const fade = (tag: string) => !selected || connected.has(tag);

  // Đo vị trí thật của từng thẻ trên màn hình để vẽ đúng đường bay tia đạn —
  // đáng tin cậy hơn hẳn tính theo index vì tên dài/ngắn khác nhau làm chiều
  // cao mỗi hàng không đều nhau.
  useEffect(() => {
    if (!selected || !containerRef.current) { setArcs([]); return; }
    const measure = () => {
      const containerBox = containerRef.current!.getBoundingClientRect();
      const center = (tag: string) => {
        const el = cardRefs.current.get(tag);
        if (!el) return null;
        const box = el.getBoundingClientRect();
        return { x: box.left + box.width / 2 - containerBox.left, y: box.top + box.height / 2 - containerBox.top };
      };
      const newArcs: typeof arcs = [];
      attackDetails.forEach((a, i) => {
        const from = center(selected.tag);
        const to = center(a.defenderTag);
        if (from && to) newArcs.push({ id: `atk-${i}`, x1: from.x, y1: from.y, x2: to.x, y2: to.y, kind: "attack" });
      });
      defenseDetails.forEach((a, i) => {
        const from = center(a.attackerTag);
        const to = center(selected.tag);
        if (from && to) newArcs.push({ id: `def-${i}`, x1: from.x, y1: from.y, x2: to.x, y2: to.y, kind: "defense" });
      });
      setArcs(newArcs);
    };
    // Đợi 1 nhịp để layout ổn định (đổi selected có thể làm card đổi vị trí)
    const t = setTimeout(measure, 30);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, war]);

  const rows = Math.max(ourTeam.length, theirTeam.length);
  const maxAttacks = war?.attacksPerMember || (war?.isCWL ? 1 : 2);

  return (
    <div className="card !p-0 overflow-hidden relative">
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 flex-wrap gap-1">
        <h3 className="font-bold text-sm" style={{ color: "var(--py-card-text, #fff)" }}>🗺️ Chiến trường</h3>
        <div className="flex items-center gap-2 text-[9px] text-gray-500 flex-wrap">
          <span>⚔ #X = vị trí tấn công</span>
          <span className="flex items-center gap-1">
            {Array.from({ length: maxAttacks }).map((_, i) => (
              <CannonIcon key={i} size={11} svgKey="cannon_basic" fired={false} />
            ))}
            = {maxAttacks} lượt đánh
          </span>
          {selected && (
            <>
              <span className="flex items-center gap-1 text-red-400"><Swords size={10}/> tấn công</span>
              <span className="flex items-center gap-1 text-sky-400"><Shield size={10}/> bị đánh</span>
              <button onClick={() => setSelected(null)} className="text-yellow-600 font-bold">✕</button>
            </>
          )}
        </div>
      </div>

      {/* Team labels */}
      <div className="grid px-2" style={{ gridTemplateColumns: "1fr 20px 1fr" }}>
        <p className="text-[9px] font-bold text-blue-600 truncate">{war?.clan?.name}</p>
        <div />
        <p className="text-[9px] font-bold text-red-500 truncate text-right">{war?.opponent?.name}</p>
      </div>

      {/* Member rows */}
      <div className="px-1 pb-3 space-y-0 relative" ref={containerRef}>
        {/* Lớp phủ tia đạn — vẽ đường bay cong kiểu pháo bắn + đạn bay có hiệu ứng phát sáng */}
        {arcs.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", zIndex: 5 }}>
            <defs>
              <radialGradient id="ballAttack" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFD27A" />
                <stop offset="60%" stopColor="#FF5A36" />
                <stop offset="100%" stopColor="#FF5A36" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ballDefense" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#CFEFFF" />
                <stop offset="60%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
              </radialGradient>
            </defs>
            {arcs.map(a => {
              const midX = (a.x1 + a.x2) / 2;
              const midY = (a.y1 + a.y2) / 2;
              const dist = Math.hypot(a.x2 - a.x1, a.y2 - a.y1);
              const arcHeight = Math.min(70, Math.max(22, dist * 0.35));
              const ctrlX = midX;
              const ctrlY = midY - arcHeight;
              const pathD = `M ${a.x1} ${a.y1} Q ${ctrlX} ${ctrlY} ${a.x2} ${a.y2}`;
              const color = a.kind === "attack" ? "#FF5A36" : "#38BDF8";
              const ball = a.kind === "attack" ? "url(#ballAttack)" : "url(#ballDefense)";
              return (
                <g key={a.id}>
                  {/* Đường bay mờ, luôn hiện để thấy rõ hình vòng cung */}
                  <path d={pathD} fill="none" stroke={color} strokeOpacity={0.28} strokeWidth={1.5} strokeDasharray="3 4" />
                  {/* Đạn bay có vệt sáng, lặp lại liên tục */}
                  <circle r="5" fill={ball}>
                    <animateMotion dur="1.1s" repeatCount="indefinite" path={pathD} />
                  </circle>
                  <circle r="2.2" fill={color}>
                    <animateMotion dur="1.1s" repeatCount="indefinite" path={pathD} />
                  </circle>
                </g>
              );
            })}
          </svg>
        )}
        {Array.from({ length: rows }).map((_, i) => {
          const left  = ourTeam[i];
          const right = theirTeam[i];
          return (
            <div key={i} className="grid items-start" style={{ gridTemplateColumns: "1fr 18px 1fr" }}>
              <div ref={el => { if (left) { if (el) cardRefs.current.set(left.tag, el); else cardRefs.current.delete(left.tag); } }}
                style={{ opacity: left && fade(left.tag) ? 1 : 0.2, transition: "opacity 0.15s" }}>
                {left && (
                  <MemberCard member={left} side="left"
                    attacks={ourAtks[left.tag] || []} iconMap={iconMap} maxAttacks={maxAttacks}
                    selected={selected?.tag === left.tag}
                    onSelect={() => setSelected(s => s?.tag === left.tag ? null : { tag: left.tag, side: "left" })} />
                )}
              </div>

              <div className="flex items-center justify-center pt-2">
                <span className="text-[9px] text-gray-400 font-mono font-bold">{i + 1}</span>
              </div>

              <div ref={el => { if (right) { if (el) cardRefs.current.set(right.tag, el); else cardRefs.current.delete(right.tag); } }}
                style={{ opacity: right && fade(right.tag) ? 1 : 0.2, transition: "opacity 0.15s" }}>
                {right && (
                  <MemberCard member={right} side="right"
                    attacks={theirAtks[right.tag] || []} iconMap={iconMap} maxAttacks={maxAttacks}
                    selected={selected?.tag === right.tag}
                    onSelect={() => setSelected(s => s?.tag === right.tag ? null : { tag: right.tag, side: "right" })} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
