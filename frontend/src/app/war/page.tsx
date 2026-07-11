"use client";
import { CocLoader } from "@/components/ui/CocLoader";
import { EmberField } from "@/components/ui/EmberField";
import { useEmberColor } from "@/lib/useEmberColor";
import { usePageBanner } from "@/lib/usePageBanner";
import { ArtBanner } from "@/components/ui/ArtBanner";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate, thColor } from "@/lib/utils";
import { Swords, Shield, Star, CheckCircle, XCircle, Clock, Trophy, Map, List, Copy, Check, AlertTriangle, RefreshCw } from "lucide-react";
import WarBattlefieldMap from "./WarBattlefieldMap";
import { NameEffect } from "@/components/ui/NameEffect";
import { getCurrentClanInfo } from "@/lib/clanContext";

/** Top 3 đòn đánh hay nhất của 1 war cụ thể — sao cao nhất → % phá huỷ cao
 * nhất → nhanh nhất (giống công thức 'anh dũng nhất' dùng ở CWL/Thống kê). */
function computeTop3(clanMembers: any[], opponentMembers: any[]) {
  const nameByTag: Record<string, string> = {};
  opponentMembers.forEach((m: any) => { nameByTag[m.tag] = m.name; });
  const best: { tag: string; name: string; stars: number; destruction: number; duration: number }[] = [];
  clanMembers.forEach((m: any) => {
    const attacks = m.attacks || [];
    if (attacks.length === 0) return;
    const top = attacks.reduce((a: any, b: any) =>
      (b.stars > a.stars || (b.stars === a.stars && b.destructionPercentage > a.destructionPercentage) ||
       (b.stars === a.stars && b.destructionPercentage === a.destructionPercentage && b.duration < a.duration)) ? b : a
    );
    best.push({ tag: m.tag, name: m.name, stars: top.stars, destruction: top.destructionPercentage, duration: top.duration });
  });
  return best.sort((a, b) => b.stars - a.stars || b.destruction - a.destruction || a.duration - b.duration).slice(0, 3);
}

function AttackBar({ attacks, maxAttacks = 2 }: { attacks: any[]; maxAttacks?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: maxAttacks }).map((_, i) => {
        const a = attacks[i];
        return (
          <div key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
            a ? `bg-yellow-500/20 text-yellow-400 border border-yellow-500/40` : "bg-gray-800 text-gray-600 border border-gray-700"
          }`}>
            {a ? `${a.stars}⭐` : "—"}
          </div>
        );
      })}
    </div>
  );
}

function WarMemberRow({ member, mapPosition, maxAttacks = 2, rosterMap = {} }: { member: any; mapPosition: number; maxAttacks?: number; rosterMap?: Record<string, any> }) {
  const attacks = member.attacks || [];
  const totalStars = attacks.reduce((s: number, a: any) => s + a.stars, 0);
  const bestDestruction = attacks.length > 0 ? Math.max(...attacks.map((a: any) => a.destructionPercentage)) : 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-800 last:border-0">
      <span className="text-gray-600 text-xs w-5 shrink-0">#{mapPosition}</span>
      <div className="th-badge text-[11px]" style={{ color: thColor(member.townHallLevel) }}>
        {member.townHallLevel}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          <NameEffect effectKey={rosterMap[member.tag]?.equipped_effect}>{member.name}</NameEffect>
        </p>
        {attacks.length > 0 && (
          <p className="text-xs text-gray-500">{bestDestruction.toFixed(0)}% phá hủy</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <AttackBar attacks={attacks} maxAttacks={maxAttacks} />
        {attacks.length > 0 && (
          <span className="badge-gold text-xs">⭐{totalStars}</span>
        )}
        {attacks.length === 0 && (
          <span className="badge-red text-xs">Chưa đánh</span>
        )}
      </div>
    </div>
  );
}

/** war_end_time từ CoC API dạng "20260711T142757.000Z" — đổi sang dd/MM/yyyy
 * cho dễ đọc thay vì cắt chuỗi thô (dễ bị lỗi như "20260711T1"). */
function fmtWarDate(raw?: string): string {
  if (!raw || raw.length < 8) return raw || "";
  const y = raw.slice(0, 4), m = raw.slice(4, 6), d = raw.slice(6, 8);
  return `${d}/${m}/${y}`;
}

function WarHistoryCard({ w, expanded, onToggle, top3, skippers, loading }: {
  w: any; expanded: boolean; onToggle: () => void; top3: any[]; skippers: string[]; loading: boolean;
}) {
  const won = w.result === "win";
  const draw = w.result === "tie";
  const [copied, setCopied] = useState(false);
  const myClan = getCurrentClanInfo();

  function copyDetail() {
    const lines = [
      `⚔️ ${myClan?.clan_name || "Clan"} vs ${w.opponent_name} (${w.team_size}v${w.team_size}) — ${fmtWarDate(w.war_end_time)}`,
      `⭐ ${w.clan_stars} — ${w.opponent_stars}⭐ · ${w.clan_destruction?.toFixed?.(1)}% vs ${w.opponent_destruction?.toFixed?.(1)}%`,
      "",
      "🔥 Top 3 đánh hay nhất:",
      ...(top3.length > 0
        ? top3.map((m, i) => `${i + 1}. ${m.name} — ${m.stars}⭐ · ${m.destruction}% · ${Math.floor(m.duration / 60)}p${m.duration % 60}s`)
        : ["Không có dữ liệu"]),
    ];
    if (skippers.length > 0) lines.push("", "❌ Bỏ lượt (chưa đánh hết):", ...skippers.map(n => `- ${n}`));
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-xl bg-gray-800 overflow-hidden">
      <button onClick={onToggle} className="w-full p-3 text-left space-y-2">
        {/* Hàng 1: 2 icon clan nhỏ + tên clan + ngày */}
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-1.5 shrink-0">
            {myClan?.badge_url ? (
              <img src={myClan.badge_url} alt="" className="w-6 h-6 rounded-full object-contain bg-gray-900 ring-2 ring-gray-800"/>
            ) : <div className="w-6 h-6 rounded-full bg-gray-700 ring-2 ring-gray-800"/>}
            {w.opponent_badge ? (
              <img src={w.opponent_badge} alt="" className="w-6 h-6 rounded-full object-contain bg-gray-900 ring-2 ring-gray-800"/>
            ) : <div className="w-6 h-6 rounded-full bg-gray-700 ring-2 ring-gray-800"/>}
          </div>
          <p className="text-xs text-gray-400 truncate flex-1 min-w-0">
            <span className="text-white font-medium">{myClan?.clan_name || "Clan"}</span> vs <span className="text-white font-medium">{w.opponent_name}</span>
          </p>
          <span className="text-[11px] text-gray-500 shrink-0">{w.team_size}v{w.team_size} · {fmtWarDate(w.war_end_time)}</span>
        </div>

        {/* Hàng 2: số sao 2 bên + nhãn kết quả — gọn, không nền xám */}
        <div className="flex items-center justify-center gap-3 py-1">
          <span className="flex items-center gap-1 text-lg font-bold text-yellow-400">⭐ {w.clan_stars}</span>
          <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider border shrink-0 ${
            draw ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
              : won ? "bg-green-500/10 text-green-400 border-green-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}>
            {draw ? "DRAW" : won ? "WIN" : "LOST"}
          </span>
          <span className="flex items-center gap-1 text-lg font-bold text-gray-400">{w.opponent_stars} ⭐</span>
        </div>
        <p className="text-[11px] text-gray-500 text-center">{w.clan_destruction?.toFixed?.(1)}% vs {w.opponent_destruction?.toFixed?.(1)}%</p>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-700 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">🔥 Top 3 đánh hay nhất (sao cao nhất → % phá huỷ cao nhất → nhanh nhất)</p>
            <button onClick={copyDetail} title="Copy chi tiết" className="text-gray-500 hover:text-yellow-400 shrink-0">
              {copied ? <Check size={13} className="text-green-400"/> : <Copy size={13}/>}
            </button>
          </div>
          {loading ? (
            <p className="text-xs text-gray-600">Đang tải...</p>
          ) : top3.length === 0 ? (
            <p className="text-xs text-gray-600">Không có dữ liệu đòn đánh (war này chưa được web ghi lại lúc kết thúc)</p>
          ) : top3.map((m, idx) => (
            <div key={m.tag || idx} className="flex items-center gap-2 text-sm">
              <span>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</span>
              <span className="flex-1 text-gray-200 truncate">{m.name}</span>
              <span className="text-yellow-400 font-semibold shrink-0">⭐{m.stars} · {m.destruction}% · {Math.floor(m.duration/60)}p{m.duration%60}s</span>
            </div>
          ))}
          {skippers.length > 0 && (
            <>
              <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700/60">❌ Bỏ lượt (chưa đánh hết lượt)</p>
              <div className="flex flex-wrap gap-1.5">
                {skippers.map(n => (
                  <span key={n} className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">{n}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function WarPage() {
  const [war, setWar] = useState<any>(null);
  const [cwlNext, setCwlNext] = useState<any>(null);
  const [showNextDetail, setShowNextDetail] = useState(false);
  const [logSubTab, setLogSubTab] = useState<"random" | "cwl">("random");
  const [cwlHistory, setCwlHistory] = useState<any[]>([]);
  const [cwlHistoryLoading, setCwlHistoryLoading] = useState(false);
  const [medalsBySeasonNumber, setMedalsBySeasonNumber] = useState<Record<number, string[]>>({});
  const [randomHistory, setRandomHistory] = useState<any[]>([]);
  const [randomHistoryLoading, setRandomHistoryLoading] = useState(false);
  const [expandedRandomWar, setExpandedRandomWar] = useState<number | null>(null);
  const [randomTop3ByIdx, setRandomTop3ByIdx] = useState<Record<number, any[]>>({});
  const [randomSkippersByIdx, setRandomSkippersByIdx] = useState<Record<number, string[]>>({});
  const [randomTop3Loading, setRandomTop3Loading] = useState<number | null>(null);
  const [cwlStandings, setCwlStandings] = useState<any>(null);
  const [cwlTop, setCwlTop] = useState<any>(null);
  const [cwlExtraLoading, setCwlExtraLoading] = useState(false);
  const emberColor = useEmberColor();
  const bannerSrc = usePageBanner("war", "/art/pekka-lava.jpg");
  const [expandedCwlWar, setExpandedCwlWar] = useState<number | null>(null);
  const [cwlTop3ByIdx, setCwlTop3ByIdx] = useState<Record<number, any[]>>({});
  const [cwlSkippersByIdx, setCwlSkippersByIdx] = useState<Record<number, string[]>>({});
  const [cwlTop3Loading, setCwlTop3Loading] = useState<number | null>(null);
  const [cwl, setCwl] = useState<any>(null);
  const [rosterMap, setRosterMap] = useState<Record<string, any>>({});
  const [tab, setTab] = useState<"current" | "log" | "cwl">(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("tab");
      if (q === "cwl" || q === "log" || q === "current") return q;
    }
    return "current";
  });
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [loading, setLoading] = useState(true);
  const [copiedMissing, setCopiedMissing] = useState(false);

  async function load() {
    setLoading(true);
    const [w, c, cwlWar, roster] = await Promise.allSettled([
      api.getCurrentWar(), api.getCWL(), api.getCWLCurrentWar(), api.getRoster()
    ]);
    if (roster.status === "fulfilled") {
      const map: Record<string, any> = {};
      (roster.value as any[]).forEach(r => { map[r.tag] = r; });
      setRosterMap(map);
    }
    let warData = w.status === "fulfilled" ? w.value : null;
    // Nếu không có war thường, kiểm tra CWL war (vòng hiện tại)
    if ((!warData || warData.state === "notInWar") && cwlWar.status === "fulfilled") {
      const cw: any = cwlWar.value;
      if (cw?.current && cw.current.state && cw.current.state !== "notInWar") {
        warData = cw.current;
        setCwlNext(cw.next || null);
      }
    }
    // Gắn badge từ war thường nếu chưa có
    if (warData && !warData.isCWL) {
      if (warData.clan?.badgeUrls?.medium) warData.clan.badgeUrl = warData.clan.badgeUrls.medium;
      if (warData.opponent?.badgeUrls?.medium) warData.opponent.badgeUrl = warData.opponent.badgeUrls.medium;
    }
    setWar(warData);
    if (c.status === "fulfilled") setCwl(c.value);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (tab !== "log" || logSubTab !== "cwl" || cwlHistory.length > 0) return;
    setCwlHistoryLoading(true);
    api.getWarHistoryLog("cwl", 30).then((res: any) => setCwlHistory(res.items || [])).finally(() => setCwlHistoryLoading(false));
  }, [tab, logSubTab]);

  useEffect(() => {
    if (tab !== "log" || logSubTab !== "cwl") return;
    api.getMedalHistory(200).then((rows: any[]) => {
      const map: Record<number, string[]> = {};
      rows.forEach(r => {
        if (r.season_number == null) return;
        (map[r.season_number] ||= []).push(r.player_name);
      });
      setMedalsBySeasonNumber(map);
    }).catch(() => {});
  }, [tab, logSubTab]);

  useEffect(() => {
    if (tab !== "log" || logSubTab !== "random" || randomHistory.length > 0) return;
    setRandomHistoryLoading(true);
    api.getWarHistoryLog("random", 30).then((res: any) => setRandomHistory(res.items || [])).finally(() => setRandomHistoryLoading(false));
  }, [tab, logSubTab]);

  useEffect(() => {
    if (tab !== "cwl" || cwlStandings) return;
    setCwlExtraLoading(true);
    Promise.allSettled([api.getCWLStandings(), api.getCWLTopWarriors()]).then(([s, t]) => {
      if (s.status === "fulfilled") setCwlStandings(s.value);
      if (t.status === "fulfilled") setCwlTop(t.value);
    }).finally(() => setCwlExtraLoading(false));
  }, [tab]);

  const clanMembers = war?.clan?.members?.sort((a: any, b: any) => a.mapPosition - b.mapPosition) || [];
  const notAttacked = clanMembers.filter((m: any) => (m.attacks || []).length === 0);
  const maxAttacks = war?.attacksPerMember || (war?.isCWL ? 1 : 2);

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="page-title flex items-center gap-2"><Swords size={22} className="text-red-400" /> War & CWL</h1>
        <p className="page-subtitle">Theo dõi chiến tranh clan</p>
      </div>

      {/* Tabs */}
      <SlidingTabs
        tabs={[{id:"current",label:"War hiện tại"},{id:"cwl",label:"CWL"},{id:"log",label:"Lịch sử"}]}
        active={tab} onChange={(id) => setTab(id as any)} />

      {loading ? (
        <CocLoader text="Đang tải dữ liệu War..." minHeight={220} />
      ) : tab === "current" ? (
        <>
          {!war || war.state === "notInWar" ? (
            war?.error === "war_log_private" ? (
              <div className="card text-center py-12 border-yellow-500/30 bg-yellow-500/5">
                <AlertTriangle size={40} className="mx-auto mb-3 text-yellow-500" />
                <p className="text-yellow-400 font-semibold mb-2">Nhật ký chiến tranh đang để riêng tư</p>
                <p className="text-sm text-gray-400 max-w-md mx-auto">{war.message}</p>
              </div>
            ) : (
              <div className="card text-center py-12">
                <Shield size={40} className="mx-auto mb-3 text-gray-700" />
                <p className="text-gray-400">Clan không có War đang diễn ra</p>
              </div>
            )
          ) : (
            <>
              {/* War header */}
              <div className="card relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a0505, #2a0a0a)", borderColor: war.isCWL ? "#5C2A00" : "#5C1E1E" }}>
                <ArtBanner src={bannerSrc} opacity={0.8} objectPosition="center 25%" />
                <EmberField count={22} speed={1.4} color={emberColor} />
                {/* CWL badge */}
                {war.isCWL && (
                  <div className="relative flex justify-center mb-2 banner-content">
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5"
                      style={{ background: "rgba(244,161,48,0.15)", border: "1px solid rgba(244,161,48,0.35)", color: "#F4A130" }}>
                      🏆 Clan War League {war.season ? `· ${war.season}` : ""}
                    </span>
                  </div>
                )}

                <div className="relative grid grid-cols-3 gap-2 md:gap-4 text-center mb-2 banner-content">
                  {/* Our clan */}
                  <div className="flex flex-col items-center gap-1">
                    {war.clan?.badgeUrl && (
                      <img src={war.clan.badgeUrl} alt="" className="w-10 h-10 object-contain drop-shadow-lg"/>
                    )}
                    <p className="text-xs text-gray-300 font-semibold truncate max-w-[90px]">{war.clan?.name}</p>
                    {war.state !== "preparation" ? (
                      <>
                        <p className="text-2xl font-bold text-yellow-400">⭐ {war.clan?.stars}</p>
                        <p className="text-[11px] text-gray-200">{war.clan?.attacks}/{war.teamSize * maxAttacks} atk</p>
                        <p className="text-[11px] text-gray-300">{war.clan?.destructionPercentage?.toFixed(1)}%</p>
                      </>
                    ) : (
                      <p className="text-xs text-yellow-500 mt-1">⚔️ Đang chuẩn bị</p>
                    )}
                  </div>

                  {/* VS center */}
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-gray-200 font-bold text-lg">VS</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      war.state === "inWar" ? "bg-green-500/20 text-green-400" :
                      war.state === "preparation" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-blue-500/20 text-blue-400"
                    }`}>
                      {{ inWar: "Đang đánh", preparation: "Chuẩn bị", warEnded: "Kết thúc" }[war.state as string] || war.state}
                    </span>
                    {war.startTime && war.state === "preparation" && (
                      <p className="text-[10px] text-gray-300">Bắt đầu: {formatDate(war.startTime)}</p>
                    )}
                    {war.state === "preparation" && (
                      <p className="text-[9px] text-gray-400 mt-0.5">📡 Supercell API</p>
                    )}
                    {war.endTime && (
                      <p className="text-[10px] text-gray-300">{war.state === "preparation" ? "Kết thúc:" : ""}  {formatDate(war.endTime)}</p>
                    )}
                    <p className="text-[10px] text-gray-300">{war.teamSize}v{war.teamSize}</p>
                  </div>

                  {/* Opponent — luôn hiện (API Supercell cung cấp data cả 2 bên kể cả ngày chuẩn bị) */}
                  <div className="flex flex-col items-center gap-1">
                    {war.opponent?.badgeUrl ? (
                      <img src={war.opponent.badgeUrl} alt="" className="w-10 h-10 object-contain drop-shadow-lg"/>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">🏰</div>
                    )}
                    <p className="text-xs text-gray-300 font-semibold truncate max-w-[90px]">{war.opponent?.name}</p>
                    {war.state === "preparation" ? (
                      <p className="text-[10px] text-yellow-600 mt-0.5 italic">⚔️ Chờ đánh</p>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-red-400">⭐ {war.opponent?.stars}</p>
                        <p className="text-[11px] text-gray-200">{war.opponent?.attacks}/{war.teamSize * maxAttacks} atk</p>
                        <p className="text-[11px] text-gray-300">{war.opponent?.destructionPercentage?.toFixed(1)}%</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* War tiếp theo (CWL) — tách riêng, tránh nhầm với war đang diễn ra ở trên */}
              {war.isCWL && cwlNext && (
                <div className="card" style={{ borderColor: "rgba(244,161,48,0.25)" }}>
                  <button onClick={() => setShowNextDetail(v => !v)} className="w-full text-left space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0"
                        style={{ background: "rgba(244,161,48,0.15)", color: "#F4A130" }}>
                        Vòng tiếp theo
                      </span>
                      <span className="text-[11px] text-yellow-500 flex items-center gap-1 ml-auto shrink-0">
                        {showNextDetail ? "Ẩn đội hình ▲" : "Xem đội hình ▼"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {cwlNext.opponent?.badgeUrl && (
                        <img src={cwlNext.opponent.badgeUrl} alt="" className="w-10 h-10 object-contain shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">vs {cwlNext.opponent?.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cwlNext.state === "preparation" ? "⚔️ Đang chuẩn bị" : cwlNext.state === "inWar" ? "🔥 Đang đánh" : cwlNext.state}
                        </p>
                        {cwlNext.startTime && (
                          <p className="text-xs text-gray-500">Bắt đầu {formatDate(cwlNext.startTime)}</p>
                        )}
                      </div>
                    </div>
                  </button>
                  {showNextDetail && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <p className="text-[11px] text-gray-500 mb-2">
                        📋 Đội hình 2 bên đã lên cặp đấu (chưa có lượt đánh vì war chưa bắt đầu) — dựa theo vị trí bản đồ CoC xếp:
                      </p>
                      <WarBattlefieldMap war={cwlNext} />
                    </div>
                  )}
                </div>
              )}

              {/* Missing attacks warning */}
              {notAttacked.length > 0 && (
                <div className="card border-red-500/30 bg-red-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-red-400 font-semibold text-sm flex items-center gap-2">
                      <XCircle size={16} /> {notAttacked.length} thành viên chưa đánh
                    </p>
                    <button
                      onClick={() => {
                        const text = `⚠️ ${notAttacked.length} thành viên CHƯA ĐÁNH WAR:\n` +
                          notAttacked.map((m: any, i: number) => `${i + 1}. ${m.name}`).join("\n");
                        navigator.clipboard.writeText(text);
                        setCopiedMissing(true);
                        setTimeout(() => setCopiedMissing(false), 1500);
                      }}
                      className="flex items-center gap-1 text-xs text-red-400/80 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10" title="Copy danh sách">
                      {copiedMissing ? <Check size={14}/> : <Copy size={14}/>}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {notAttacked.map((m: any) => (
                      <span key={m.tag} className="badge-red">{m.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Member list */}
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">Danh sách tấn công ({clanMembers.length} thành viên)</h3>
                <div className="flex gap-1 p-0.5 rounded-lg bg-gray-800">
                  <button onClick={() => setViewMode("map")}
                    className={`p-1.5 rounded-md ${viewMode === "map" ? "bg-yellow-500 text-gray-900" : "text-gray-500"}`}>
                    <Map size={14} />
                  </button>
                  <button onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-yellow-500 text-gray-900" : "text-gray-500"}`}>
                    <List size={14} />
                  </button>
                </div>
              </div>

              {viewMode === "map" ? (
                <WarBattlefieldMap war={war} />
              ) : (
                <div className="card">
                  {clanMembers.map((m: any) => (
                    <WarMemberRow key={m.tag} member={m} mapPosition={m.mapPosition} maxAttacks={maxAttacks} rosterMap={rosterMap} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : tab === "log" ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-white">Lịch sử War</h3>
            <SlidingTabs
              tabs={[{ id: "random", label: "War thường" }, { id: "cwl", label: "CWL" }]}
              active={logSubTab} onChange={(id) => setLogSubTab(id as any)} />
          </div>

          {logSubTab === "random" ? (
            randomHistoryLoading ? (
              <p className="text-gray-500 text-center py-8">Đang tải...</p>
            ) : randomHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Chưa có lịch sử war thường nào được ghi nhận</p>
                <p className="text-[11px] text-gray-600 mt-1">Web chỉ tự lưu lại từ lúc bạn cập nhật tính năng này trở đi.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {randomHistory.map((w: any, i: number) => (
                  <WarHistoryCard key={w.id}
                    w={w} expanded={expandedRandomWar === i}
                    top3={randomTop3ByIdx[i] || []} skippers={randomSkippersByIdx[i] || []}
                    loading={randomTop3Loading === i}
                    onToggle={() => {
                      const next = expandedRandomWar === i ? null : i;
                      setExpandedRandomWar(next);
                      if (next !== null && !randomTop3ByIdx[i] && w.war_end_time) {
                        setRandomTop3Loading(i);
                        api.getWarLogTopAttackers(w.war_end_time)
                          .then((res: any) => {
                            setRandomTop3ByIdx(prev => ({ ...prev, [i]: res.top3 || [] }));
                            setRandomSkippersByIdx(prev => ({ ...prev, [i]: res.skippers || [] }));
                          })
                          .catch(() => setRandomTop3ByIdx(prev => ({ ...prev, [i]: [] })))
                          .finally(() => setRandomTop3Loading(null));
                      }
                    }} />
                ))}
              </div>
            )
          ) : cwlHistoryLoading ? (
            <p className="text-gray-500 text-center py-8">Đang tải...</p>
          ) : cwlHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Chưa có lịch sử CWL nào được ghi nhận</p>
              <p className="text-[11px] text-gray-600 mt-1">CoC API không cho xem lại các mùa CWL cũ — web chỉ tự lưu lại từ lúc bạn cập nhật tính năng này trở đi.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {(() => {
                // Nhóm theo season_number (Mùa 1, Mùa 2...) — giữ nguyên thứ tự
                // mới nhất trước, chỉ gộp các war LIÊN TIẾP cùng mùa lại 1 khối.
                const groups: { season: number | null; wars: { w: any; idx: number }[] }[] = [];
                cwlHistory.forEach((w: any, idx: number) => {
                  const season = w.season_number ?? null;
                  const last = groups[groups.length - 1];
                  if (last && last.season === season) last.wars.push({ w, idx });
                  else groups.push({ season, wars: [{ w, idx }] });
                });
                return groups.map((g, gi) => (
                  <div key={gi}>
                    <div className="flex items-center justify-between flex-wrap gap-1.5 mb-2">
                      <p className="text-xs font-bold text-yellow-500 flex items-center gap-1.5">
                        🏆 {g.season ? `Mùa ${g.season}` : "Chưa rõ mùa"}
                      </p>
                      {g.season && medalsBySeasonNumber[g.season]?.length > 0 && (
                        <p className="text-[11px] text-green-400 flex items-center gap-1">
                          🎖️ Đã trao: {medalsBySeasonNumber[g.season].join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="space-y-3">
                      {g.wars.map(({ w, idx: i }) => (
                        <WarHistoryCard key={w.id}
                          w={w} expanded={expandedCwlWar === i}
                          top3={cwlTop3ByIdx[i] || []} skippers={cwlSkippersByIdx[i] || []}
                          loading={cwlTop3Loading === i}
                          onToggle={() => {
                            const next = expandedCwlWar === i ? null : i;
                            setExpandedCwlWar(next);
                            if (next !== null && !cwlTop3ByIdx[i] && w.war_end_time) {
                              setCwlTop3Loading(i);
                              api.getWarLogTopAttackers(w.war_end_time)
                                .then((res: any) => {
                                  setCwlTop3ByIdx(prev => ({ ...prev, [i]: res.top3 || [] }));
                                  setCwlSkippersByIdx(prev => ({ ...prev, [i]: res.skippers || [] }));
                                })
                                .catch(() => setCwlTop3ByIdx(prev => ({ ...prev, [i]: [] })))
                                .finally(() => setCwlTop3Loading(null));
                            }
                          }} />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      ) : (
        // CWL tab
        <div className="space-y-4">
          {/* Đang đấu với ai / sắp đấu với ai */}
          {cwl?.current && (
            <div className="card">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Trophy size={18} className="text-yellow-400" /> Đang đấu với
              </h3>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {cwl.current.clan?.badgeUrl && <img src={cwl.current.clan.badgeUrl} className="w-9 h-9 shrink-0" alt="" />}
                  <p className="text-sm font-semibold text-white truncate">{cwl.current.clan?.name}</p>
                </div>
                <span className="text-gray-500 font-bold text-sm shrink-0">
                  {cwl.current.clan?.stars ?? 0} — {cwl.current.opponent?.stars ?? 0}
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                  <p className="text-sm font-semibold text-white truncate">{cwl.current.opponent?.name}</p>
                  {cwl.current.opponent?.badgeUrl && <img src={cwl.current.opponent.badgeUrl} className="w-9 h-9 shrink-0" alt="" />}
                </div>
              </div>
              {cwl.next?.opponent?.name && (
                <p className="text-xs text-gray-500 text-center mt-3 pt-3 border-t border-gray-800">
                  Vòng tiếp theo: vs {cwl.next.opponent.name}
                </p>
              )}
            </div>
          )}

          {/* Top thành viên anh dũng nhất cả mùa CWL */}
          <div className="card">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">🔥 Top 3 anh dũng nhất mùa này</h3>
            {cwlExtraLoading ? (
              <p className="text-gray-500 text-center py-6 text-sm">Đang tải...</p>
            ) : !cwlTop?.top?.length ? (
              <p className="text-gray-500 text-center py-6 text-sm">Chưa có dữ liệu (cần ít nhất 1 vòng đã đánh)</p>
            ) : (
              <div className="space-y-2">
                {cwlTop.top.map((m: any, i: number) => (
                  <div key={m.tag} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-800">
                    <span className="text-lg shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                      <p className="text-xs text-gray-500">Đánh {m.opponent} · Vòng {m.round}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-yellow-400">⭐{m.stars} · {m.destruction}%</p>
                      <p className="text-xs text-gray-500">{Math.floor(m.duration / 60)}p{m.duration % 60}s</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bảng xếp hạng các clan trong nhóm CWL */}
          <div className="card">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-yellow-400" /> Bảng xếp hạng CWL{cwlStandings?.season ? ` · ${cwlStandings.season}` : ""}
            </h3>
            {cwlExtraLoading ? (
              <p className="text-gray-500 text-center py-8">Đang tải...</p>
            ) : !cwlStandings?.clans?.length ? (
              <p className="text-gray-500 text-center py-8">Không có CWL đang diễn ra</p>
            ) : (
              <div className="space-y-2">
                {cwlStandings.clans.map((c: any) => (
                  <div key={c.tag} className={`flex items-center gap-3 p-3 rounded-xl ${c.tag === cwlStandings.my_tag ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-gray-800"}`}>
                    <span className="text-gray-500 w-5 text-right text-sm shrink-0">{c.rank}</span>
                    {c.badge && <img src={c.badge} alt="" className="w-8 h-8 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.wins}T-{c.losses}B-{c.ties}H · {c.wars_played} war</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-yellow-400">⭐{c.stars}</p>
                      <p className="text-xs text-gray-500">{c.avg_destruction}% TB</p>
                    </div>
                    {c.tag === cwlStandings.my_tag && <span className="badge-gold text-xs shrink-0">Clan mình</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
