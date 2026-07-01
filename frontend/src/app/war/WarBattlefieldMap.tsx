"use client";
import { useEffect, useState } from "react";
import { thColor } from "@/lib/utils";
import { api } from "@/lib/api";
import { CastleIcon, CannonIcon } from "@/lib/gameIcons";

/* Màu sao — sẫm đậm để dễ nhìn, đặc biệt trên nền sáng */
const STAR_FILL = (s: number) =>
  s === 3 ? "#B8860B" : s === 2 ? "#606060" : s === 1 ? "#7B4513" : "#888";
const STAR_FILL_EMPTY = "#CCCCCC44";

function Stars({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map(i => (
        <svg key={i} width={9} height={9} viewBox="0 0 10 10">
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
        <svg key={i} width={7} height={7} viewBox="0 0 10 10">
          <polygon points="5,1 6.2,3.8 9.5,3.8 7,5.8 7.9,9 5,7.2 2.1,9 3,5.8 0.5,3.8 3.8,3.8"
            fill={i < s ? STAR_FILL(s) : STAR_FILL_EMPTY} />
        </svg>
      ))}
    </span>
  );
}

function MemberCard({ member, attacks, side, iconMap, selected, onSelect }: {
  member: any; attacks: any[]; side: "left" | "right";
  iconMap: Record<string, any>; selected: boolean; onSelect: () => void;
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
          <CastleIcon th={member.townHallLevel} svgKey={iconMap[member.tag]?.castle} size={28} />
        </div>

        {/* Name + stars + cannons */}
        <div className={`flex-1 min-w-0 ${isRight ? "text-right" : "text-left"}`}>
          <p className="text-[10px] font-semibold truncate leading-tight" style={{ color: "var(--py-card-text, #e5e7eb)" }}>
            {member.name}
          </p>
          <div className={`flex gap-0.5 mt-0.5 ${isRight ? "justify-end" : "justify-start"}`}>
            <Stars stars={totalStars} />
          </div>
          {/* 2 pháo = 2 lượt đánh */}
          <div className={`flex gap-0.5 mt-0.5 ${isRight ? "justify-end" : "justify-start"}`}>
            {[0, 1].map(i => (
              <CannonIcon key={i} size={10} svgKey={iconMap[member.tag]?.cannon} fired={!!attacks[i]} thColor={thColor(member.townHallLevel)} />
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
  if (selected) {
    const isLeft = selected.side === "left";
    const myAtks = isLeft ? ourAtks   : theirAtks;
    const myDefs = isLeft ? ourDefs   : theirDefs;
    const oppTeam = isLeft ? theirTeam : ourTeam;
    connected.add(selected.tag);
    (myAtks[selected.tag] || []).forEach((a: any) => {
      const def = oppTeam.find(o => o.mapPosition === a.defenderPos);
      if (def) connected.add(def.tag);
    });
    (myDefs[selected.tag] || []).forEach((a: any) => connected.add(a.attackerTag));
  }

  const fade = (tag: string) => !selected || connected.has(tag);

  const rows = Math.max(ourTeam.length, theirTeam.length);

  return (
    <div className="card !p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 flex-wrap gap-1">
        <h3 className="font-bold text-sm" style={{ color: "var(--py-card-text, #fff)" }}>🗺️ Bản đồ chiến trường</h3>
        <div className="flex items-center gap-2 text-[9px] text-gray-500 flex-wrap">
          <span>⚔ #X = vị trí tấn công</span>
          <span>🔫🔫 = 2 lượt đánh</span>
          {selected && (
            <button onClick={() => setSelected(null)} className="text-yellow-600 font-bold">✕</button>
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
      <div className="px-1 pb-3 space-y-0">
        {Array.from({ length: rows }).map((_, i) => {
          const left  = ourTeam[i];
          const right = theirTeam[i];
          return (
            <div key={i} className="grid items-start" style={{ gridTemplateColumns: "1fr 18px 1fr" }}>
              <div style={{ opacity: left && fade(left.tag) ? 1 : 0.2, transition: "opacity 0.15s" }}>
                {left && (
                  <MemberCard member={left} side="left"
                    attacks={ourAtks[left.tag] || []} iconMap={iconMap}
                    selected={selected?.tag === left.tag}
                    onSelect={() => setSelected(s => s?.tag === left.tag ? null : { tag: left.tag, side: "left" })} />
                )}
              </div>

              <div className="flex items-center justify-center pt-2">
                <span className="text-[9px] text-gray-400 font-mono font-bold">{i + 1}</span>
              </div>

              <div style={{ opacity: right && fade(right.tag) ? 1 : 0.2, transition: "opacity 0.15s" }}>
                {right && (
                  <MemberCard member={right} side="right"
                    attacks={theirAtks[right.tag] || []} iconMap={iconMap}
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
