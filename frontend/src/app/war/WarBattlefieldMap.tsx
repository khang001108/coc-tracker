"use client";
import { useEffect, useRef, useState } from "react";
import { thColor } from "@/lib/utils";
import { api } from "@/lib/api";
import { CastleIcon } from "@/lib/gameIcons";

const starColor = (s: number) =>
  s === 3 ? "#FFD700" : s === 2 ? "#C0C0C0" : s === 1 ? "#CD7F32" : "#444";

const starEmoji = (s: number) =>
  s === 3 ? "⭐⭐⭐" : s === 2 ? "⭐⭐" : s === 1 ? "⭐" : "—";

function Stars({ stars, size = 10 }: { stars: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 10 10">
          <polygon points="5,1 6.2,3.8 9.5,3.8 7,5.8 7.9,9 5,7.2 2.1,9 3,5.8 0.5,3.8 3.8,3.8"
            fill={i < stars ? "#FFD700" : "#2A1B4A"} stroke="#F4A13055" strokeWidth="0.5" />
        </svg>
      ))}
    </div>
  );
}

function MemberCard({
  member, attacks, defenses, side, iconMap, selected, onSelect,
}: {
  member: any; attacks: any[]; defenses: any[]; side: "left" | "right";
  iconMap: Record<string, any>; selected: boolean; onSelect: () => void;
}) {
  const th = member.townHallLevel;
  const color = thColor(th);
  const totalStars = attacks.reduce((s, a) => s + a.stars, 0);
  const maxStars = attacks.length * 3;
  const defended = defenses.some(d => d.stars === 0);
  const isRight = side === "right";

  return (
    <button onClick={onSelect}
      className={`w-full flex ${isRight ? "flex-row-reverse" : "flex-row"} items-center gap-2 rounded-xl px-2 py-2 transition-all text-left
        ${selected ? "ring-2 ring-yellow-400/80 bg-yellow-400/8" : "hover:bg-white/5"}`}
      style={{ background: selected ? "rgba(244,161,48,0.08)" : undefined }}>

      {/* Lâu đài icon */}
      <div className="shrink-0">
        <CastleIcon th={th} svgKey={iconMap[member.tag]?.castle} size={32} />
      </div>

      {/* Info */}
      <div className={`flex-1 min-w-0 ${isRight ? "text-right" : "text-left"}`}>
        <p className="text-[11px] font-semibold text-white truncate leading-tight">{member.name}</p>
        <Stars stars={totalStars} />
      </div>

      {/* Kết quả tấn công badge */}
      {attacks.length > 0 && (
        <div className={`flex flex-col gap-0.5 shrink-0 ${isRight ? "items-end" : "items-start"}`}>
          {attacks.map((a, i) => (
            <div key={i} className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ background: starColor(a.stars) + "30", color: starColor(a.stars) }}>
              ⚔️ #{a.defenderPos} {starEmoji(a.stars)}
            </div>
          ))}
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

  const ourTeam: any[] = [...(war?.clan?.members || [])].sort((a, b) => a.mapPosition - b.mapPosition);
  const theirTeam: any[] = [...(war?.opponent?.members || [])].sort((a, b) => a.mapPosition - b.mapPosition);

  // Xây dựng lookup: mỗi thành viên nhận attacksGiven + defensesTaken
  function buildLookup(attackers: any[], defenders: any[]) {
    const defenderByTag: Record<string, any> = {};
    defenders.forEach(m => { defenderByTag[m.tag] = m; });

    return attackers.reduce((acc, m) => {
      acc[m.tag] = (m.attacks || []).map((a: any) => ({
        ...a,
        defenderPos: defenderByTag[a.defenderTag]?.mapPosition ?? "?",
      }));
      return acc;
    }, {} as Record<string, any[]>);
  }

  function buildDefenses(defenders: any[], attackers: any[]) {
    const defMap: Record<string, any[]> = {};
    attackers.forEach(m => {
      (m.attacks || []).forEach((a: any) => {
        if (!defMap[a.defenderTag]) defMap[a.defenderTag] = [];
        defMap[a.defenderTag].push(a);
      });
    });
    return defMap;
  }

  const ourAttacks   = buildLookup(ourTeam, theirTeam);
  const theirAttacks = buildLookup(theirTeam, ourTeam);
  const ourDefenses  = buildDefenses(ourTeam, theirTeam);
  const theirDefenses = buildDefenses(theirTeam, ourTeam);

  // Khi hover/select 1 thành viên, làm nổi bật các thành viên có kết nối
  const connectedTags = new Set<string>();
  if (selected) {
    const team = selected.side === "left" ? ourTeam : theirTeam;
    const attacks = selected.side === "left" ? ourAttacks : theirAttacks;
    const opp = selected.side === "left" ? theirTeam : ourTeam;
    const m = team.find((m: any) => m.tag === selected.tag);
    if (m) {
      connectedTags.add(m.tag);
      (attacks[m.tag] || []).forEach((a: any) => {
        const def = opp.find((o: any) => o.mapPosition === a.defenderPos);
        if (def) connectedTags.add(def.tag);
      });
      const defMap = selected.side === "left" ? ourDefenses : theirDefenses;
      (defMap[m.tag] || []).forEach((a: any) => {
        const att = (selected.side === "left" ? theirTeam : ourTeam).find((o: any) =>
          (o.attacks || []).some((atk: any) => atk.defenderTag === m.tag));
        if (att) connectedTags.add(att.tag);
      });
    }
  }

  function isHighlighted(tag: string) {
    return !selected || connectedTags.has(tag);
  }

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">🗺️ Bản đồ chiến trường</h3>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span>⭐⭐⭐ = 3 sao</span>
          <span>⚔️ # = vị trí tấn công</span>
          {selected && <button onClick={() => setSelected(null)} className="text-yellow-500 hover:underline">✕ Bỏ chọn</button>}
        </div>
      </div>

      <div className="grid gap-0 px-2 pb-4" style={{ gridTemplateColumns: "1fr 8px 1fr" }}>
        {/* Header */}
        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide px-2 pb-1">{war?.clan?.name}</div>
        <div />
        <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide px-2 pb-1 text-right">{war?.opponent?.name}</div>

        {/* Hàng thành viên */}
        {Array.from({ length: Math.max(ourTeam.length, theirTeam.length) }).map((_, i) => {
          const left  = ourTeam[i];
          const right = theirTeam[i];
          return [
            <div key={`l-${i}`}
              style={{ opacity: left && isHighlighted(left.tag) ? 1 : 0.25, transition: "opacity 0.2s" }}>
              {left && (
                <MemberCard member={left} side="left"
                  attacks={ourAttacks[left.tag] || []}
                  defenses={ourDefenses[left.tag] || []}
                  iconMap={iconMap}
                  selected={selected?.tag === left.tag}
                  onSelect={() => setSelected(s => s?.tag === left.tag ? null : { tag: left.tag, side: "left" })} />
              )}
            </div>,
            <div key={`sep-${i}`} className="flex items-center justify-center">
              <span className="text-[9px] text-gray-700 font-mono">{i + 1}</span>
            </div>,
            <div key={`r-${i}`}
              style={{ opacity: right && isHighlighted(right.tag) ? 1 : 0.25, transition: "opacity 0.2s" }}>
              {right && (
                <MemberCard member={right} side="right"
                  attacks={theirAttacks[right.tag] || []}
                  defenses={theirDefenses[right.tag] || []}
                  iconMap={iconMap}
                  selected={selected?.tag === right.tag}
                  onSelect={() => setSelected(s => s?.tag === right.tag ? null : { tag: right.tag, side: "right" })} />
              )}
            </div>,
          ];
        })}
      </div>

      <p className="text-[10px] text-gray-600 px-4 pb-3">
        Bấm vào thành viên để highlight trận đánh liên quan. Badge ⚔️ #X = đánh vị trí X của đối phương.
      </p>
    </div>
  );
}
