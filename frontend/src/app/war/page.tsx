"use client";
import { CocLoader } from "@/components/ui/CocLoader";
import { EmberField } from "@/components/ui/EmberField";
import { ArtBanner } from "@/components/ui/ArtBanner";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate, thColor } from "@/lib/utils";
import { Swords, Shield, Star, CheckCircle, XCircle, Clock, Trophy, Map, List, Copy, Check, AlertTriangle } from "lucide-react";
import WarBattlefieldMap from "./WarBattlefieldMap";
import { NameEffect } from "@/components/ui/NameEffect";

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

export default function WarPage() {
  const [war, setWar] = useState<any>(null);
  const [cwlNext, setCwlNext] = useState<any>(null);
  const [warLog, setWarLog] = useState<any[]>([]);
  const [logSubTab, setLogSubTab] = useState<"random" | "cwl">("random");
  const [cwlHistory, setCwlHistory] = useState<any[]>([]);
  const [cwlHistoryLoading, setCwlHistoryLoading] = useState(false);
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

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [w, wl, c, cwlWar, roster] = await Promise.allSettled([
        api.getCurrentWar(), api.getWarLog(), api.getCWL(), api.getCWLCurrentWar(), api.getRoster()
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
      if (wl.status === "fulfilled") setWarLog((wl.value as any).items || []);
      if (c.status === "fulfilled") setCwl(c.value);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (tab !== "log" || logSubTab !== "cwl" || cwlHistory.length > 0) return;
    setCwlHistoryLoading(true);
    api.getWarHistoryLog("cwl", 30).then((res: any) => setCwlHistory(res.items || [])).finally(() => setCwlHistoryLoading(false));
  }, [tab, logSubTab]);

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
        tabs={[{id:"current",label:"War hiện tại"},{id:"log",label:"Lịch sử"},{id:"cwl",label:"CWL"}]}
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
                <ArtBanner src="/art/pekka-lava.jpg" opacity={0.8} objectPosition="center 25%" />
                <EmberField count={22} speed={1.4} />
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
                <div className="card flex items-center gap-3" style={{ borderColor: "rgba(244,161,48,0.25)" }}>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0"
                    style={{ background: "rgba(244,161,48,0.15)", color: "#F4A130" }}>
                    Vòng tiếp theo
                  </span>
                  {cwlNext.opponent?.badgeUrl && (
                    <img src={cwlNext.opponent.badgeUrl} alt="" className="w-8 h-8 object-contain shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">vs {cwlNext.opponent?.name}</p>
                    <p className="text-xs text-gray-500">
                      {cwlNext.state === "preparation" ? "⚔️ Đang chuẩn bị" : cwlNext.state === "inWar" ? "🔥 Đang đánh" : cwlNext.state}
                      {cwlNext.startTime ? ` · Bắt đầu ${formatDate(cwlNext.startTime)}` : ""}
                    </p>
                  </div>
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
                      className="flex items-center gap-1 text-xs text-red-400/80 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
                      {copiedMissing ? <><Check size={12}/> Đã copy</> : <><Copy size={12}/> Copy danh sách</>}
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
            warLog.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Không có lịch sử war</p>
            ) : (
              <div className="space-y-3">
                {warLog.map((w: any, i: number) => {
                  const won = w.clan?.stars > w.opponent?.stars;
                  const draw = w.clan?.stars === w.opponent?.stars;
                  return (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-800">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        won ? "bg-green-500/20 text-green-400" : draw ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {won ? "W" : draw ? "D" : "L"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">vs {w.opponent?.name}</p>
                        <p className="text-xs text-gray-500">{w.teamSize}v{w.teamSize} · {w.endTime?.slice(0, 8)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-yellow-400">⭐{w.clan?.stars} — {w.opponent?.stars}⭐</p>
                        <p className="text-xs text-gray-500">{w.clan?.destructionPercentage?.toFixed(1)}% vs {w.opponent?.destructionPercentage?.toFixed(1)}%</p>
                      </div>
                    </div>
                  );
                })}
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
            <div className="space-y-3">
              {cwlHistory.map((w: any) => {
                const won = w.result === "win";
                const draw = w.result === "tie";
                return (
                  <div key={w.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-800">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      won ? "bg-green-500/20 text-green-400" : draw ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {won ? "W" : draw ? "D" : "L"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">vs {w.opponent_name}</p>
                      <p className="text-xs text-gray-500">{w.team_size}v{w.team_size} · {w.war_end_time?.slice(0, 10)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-yellow-400">⭐{w.clan_stars} — {w.opponent_stars}⭐</p>
                      <p className="text-xs text-gray-500">{w.clan_destruction?.toFixed?.(1)}% vs {w.opponent_destruction?.toFixed?.(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // CWL tab
        <div className="card">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-yellow-400" /> Clan War League
          </h3>
          {!cwl || cwl.error ? (
            <p className="text-gray-500 text-center py-8">Không có CWL đang diễn ra</p>
          ) : (
            <div className="space-y-2">
              {(cwl.clans || []).map((c: any, i: number) => (
                <div key={c.tag} className={`flex items-center gap-3 p-3 rounded-xl ${c.tag === cwl.clan?.tag ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-gray-800"}`}>
                  <span className="text-gray-500 w-5 text-right text-sm shrink-0">{i + 1}</span>
                  {c.badgeUrls?.small && <img src={c.badgeUrls.small} alt="" className="w-8 h-8 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-500">Level {c.clanLevel}</p>
                  </div>
                  {c.tag === cwl.clan?.tag && <span className="badge-gold text-xs">Clan mình</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
