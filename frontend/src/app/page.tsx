"use client";
import { CocLoader } from "@/components/ui/CocLoader";
import { ClanSwitcher } from "@/components/ui/ClanSwitcher";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArtBanner } from "@/components/ui/ArtBanner";
import { api } from "@/lib/api";
import { formatNumber, roleLabel, roleClass, thColor, warStateLabel, formatDate } from "@/lib/utils";
import { Shield, Users, Trophy, Star, Swords, AlertCircle, TrendingUp, Crown, Copy, Check } from "lucide-react";
import { NameEffect } from "@/components/ui/NameEffect";
import { NumberEffect } from "@/components/ui/NumberEffect";
import { EmberField } from "@/components/ui/EmberField";

function StatCard({ label, value, sub, icon: Icon, color = "text-yellow-400" }: any) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gray-800`}>
          <Icon size={20} className={color} />
        </div>
      </div>
      <p className="stat-value">{value ?? "—"}</p>
      <p className="stat-label mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card text-center py-12">
      <AlertCircle size={40} className="mx-auto mb-3 text-gray-700" />
      <p className="text-gray-400 font-medium">{message}</p>
      <p className="text-sm text-gray-600 mt-1">
        Vào <Link href="/settings" className="text-yellow-500 hover:underline">Cài đặt</Link> để thêm API key và clan tag
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [clan, setClan] = useState<any>(null);
  const [war, setWar] = useState<any>(null);
  const [cwl, setCwl] = useState<any>(null);
  const [rosterMap, setRosterMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [tagCopied, setTagCopied] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [c, w, cw, roster] = await Promise.allSettled([
        api.getClan(), api.getCurrentWar(), api.getCWLCurrentWar(), api.getRoster(),
      ]);
      if (c.status === "fulfilled") setClan(c.value); else throw c.reason;
      setWar(w.status === "fulfilled" ? w.value : null);
      setCwl(cw.status === "fulfilled" ? cw.value : null);
      if (roster.status === "fulfilled") {
        const map: Record<string, any> = {};
        (roster.value as any[]).forEach(r => { map[r.tag] = r; });
        setRosterMap(map);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    let refreshError = "";
    try {
      await api.refreshClan();
    } catch (e: any) {
      refreshError = e.message || "Lỗi khi làm mới";
    }
    await load();
    if (refreshError) setError(refreshError);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    // Auto-refresh mỗi 5 phút
    const t = setInterval(() => load(), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-9 w-24 bg-gray-800 rounded-xl animate-pulse" />
      </div>
      <CocLoader text="Đang tải clan..." minHeight={180} />
    </div>
  );

  if (error) return (
    <div className="space-y-4">
      <h1 className="page-title">Tổng quan</h1>
      <EmptyState message={error} />
    </div>
  );

  const members = clan?.memberList || [];
  const warState = warStateLabel(war?.state || "notInWar");
  const clanStars = war?.clan?.stars ?? 0;
  const oppStars = war?.opponent?.stars ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header — bấm vào huy hiệu/tên hội để đổi clan (nếu có quyền) */}
      <div className="flex items-start justify-between gap-4">
        <ClanSwitcher>
          <div className="flex items-center gap-4">
            {clan?.badgeUrls?.medium && (
              <img src={clan.badgeUrls.medium} alt="badge" className="w-14 h-14 rounded-xl" />
            )}
            <div>
              <h1 className="page-title flex items-center gap-2">
                {clan?.name || "Clan"}
                {clan?.warLeague?.name && (
                  <span className="badge-gold text-xs">{clan.warLeague.name}</span>
                )}
              </h1>
              <p className="page-subtitle flex items-center gap-1.5">
                #{clan?.tag?.replace("#", "") || "—"}
                {clan?.tag && (
                  <span
                    onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(clan.tag); setTagCopied(true); setTimeout(() => setTagCopied(false), 1500); }}
                    title="Copy tag clan"
                    className="cursor-pointer text-gray-500 hover:text-yellow-400 transition-colors">
                    {tagCopied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </span>
                )}
              </p>
            </div>
          </div>
        </ClanSwitcher>
      </div>

      {/* Clan description — viền hoa văn */}
      {clan?.description && (
        <div className="relative rounded-2xl overflow-hidden"
          style={{ padding: "2px", background: "linear-gradient(135deg, #F4A130 0%, #B87320 40%, #FFD700 60%, #B87320 80%, #F4A130 100%)" }}>
          {/* Diamond corners */}
          {["top-[-5px] left-[-5px]","top-[-5px] right-[-5px]","bottom-[-5px] left-[-5px]","bottom-[-5px] right-[-5px]"].map((pos, i) => (
            <svg key={i} className={`absolute ${pos} w-[14px] h-[14px] pointer-events-none z-10`} viewBox="0 0 14 14">
              <polygon points="7,0 14,7 7,14 0,7" fill="#F4A130" stroke="#FFD700" strokeWidth="1"/>
              <polygon points="7,3 11,7 7,11 3,7" fill="#FFD700" opacity={0.6}/>
            </svg>
          ))}
          {/* Inner content */}
          <div className="relative rounded-[14px] px-5 py-3.5"
            style={{ background: "var(--py-card-bg, linear-gradient(180deg,#241640,#1A0F2E))" }}>
            {/* Hoa văn nền mờ */}
            <div className="absolute inset-0 rounded-[14px] pointer-events-none"
              style={{ backgroundImage: "repeating-linear-gradient(135deg,rgba(244,161,48,0.04) 0,rgba(244,161,48,0.04) 1px,transparent 0,transparent 50%)", backgroundSize: "10px 10px" }}/>
            {/* Dấu nháy mở trang trí */}
            <span className="absolute left-2 top-1 text-2xl leading-none font-serif opacity-20 select-none"
              style={{ color: "#F4A130" }}>"</span>
            <span className="absolute right-2 bottom-1 text-2xl leading-none font-serif opacity-20 select-none"
              style={{ color: "#F4A130" }}>"</span>
            <p className="relative text-sm font-medium italic leading-relaxed px-3"
              style={{ color: "var(--py-card-text, #e5e7eb)" }}>"{clan.description}"</p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Thành viên"    value={`${clan?.members || 0}/50`}   icon={Users}    color="text-blue-400" />
        <StatCard label="Điểm Clan"     value={formatNumber(clan?.clanPoints || 0)} icon={Trophy} color="text-yellow-400" />
        <StatCard label="Level Clan"    value={clan?.clanLevel || 0}          icon={Star}     color="text-purple-400" />
        <StatCard label="War Wins"      value={clan?.warWins || 0}            icon={Swords}   color="text-red-400"
          sub={`Streak: ${clan?.warWinStreak || 0}`} />
      </div>

      {/* War status */}
      {war?.state && war.state !== "notInWar" && (
        <div className="card border-red-500/20 bg-red-500/5 relative overflow-hidden">
          <ArtBanner src="/art/barbarian-fireball.jpg" opacity={0.8} objectPosition="center 25%" />
          <EmberField count={18} speed={1.2} />
          <div className="relative flex items-center justify-between mb-4 banner-content">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Swords size={18} className="text-red-400" />
              War đang diễn ra
            </h2>
            <span className={`badge font-semibold ${warState.color}`}>{warState.label}</span>
          </div>
          <div className="relative grid grid-cols-3 gap-4 text-center banner-content">
            <div>
              <p className="text-xs text-gray-300 mb-1">{war.clan?.name}</p>
              <p className="text-2xl font-bold text-yellow-400">⭐ {clanStars}</p>
              <p className="text-sm text-gray-300">{war.clan?.destructionPercentage?.toFixed(2)}%</p>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-gray-200 font-bold text-xl">VS</span>
            </div>
            <div>
              <p className="text-xs text-gray-300 mb-1">{war.opponent?.name}</p>
              <p className="text-2xl font-bold text-red-400">⭐ {oppStars}</p>
              <p className="text-sm text-gray-300">{war.opponent?.destructionPercentage?.toFixed(2)}%</p>
            </div>
          </div>
          {war.endTime && (
            <p className="relative text-xs text-gray-300 text-center mt-3 banner-content">Kết thúc: {formatDate(war.endTime)}</p>
          )}
        </div>
      )}

      {/* CWL status — tách riêng khỏi war thường ở trên, vì 1 clan có thể vừa
          war thường vừa CWL cùng lúc */}
      {cwl?.current?.state && cwl.current.state !== "notInWar" && (
        <div className="card relative overflow-hidden" style={{ borderColor: "rgba(244,161,48,0.3)", background: "rgba(244,161,48,0.04)" }}>
          <ArtBanner src="/art/dragon-fire-logo.jpg" opacity={0.75} objectPosition="center 30%" />
          <EmberField count={18} speed={1.2} />
          <div className="relative flex items-center justify-between mb-4 banner-content">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Trophy size={18} className="text-yellow-400" />
              Clan War League{cwl.season ? ` · ${cwl.season}` : ""}
            </h2>
            <span className={`badge font-semibold ${warStateLabel(cwl.current.state).color}`}>
              {warStateLabel(cwl.current.state).label}
            </span>
          </div>
          <div className="relative grid grid-cols-3 gap-4 text-center banner-content">
            <div>
              <p className="text-xs text-gray-300 mb-1">{cwl.current.clan?.name}</p>
              <p className="text-2xl font-bold text-yellow-400">⭐ {cwl.current.clan?.stars ?? 0}</p>
              <p className="text-sm text-gray-300">{cwl.current.clan?.destructionPercentage?.toFixed(2)}%</p>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-gray-200 font-bold text-xl">VS</span>
            </div>
            <div>
              <p className="text-xs text-gray-300 mb-1">{cwl.current.opponent?.name}</p>
              <p className="text-2xl font-bold text-red-400">⭐ {cwl.current.opponent?.stars ?? 0}</p>
              <p className="text-sm text-gray-300">{cwl.current.opponent?.destructionPercentage?.toFixed(2)}%</p>
            </div>
          </div>
          {cwl.next?.opponent?.name && (
            <p className="relative text-xs text-gray-500 text-center mt-3">Vòng tiếp theo: vs {cwl.next.opponent.name}</p>
          )}
        </div>
      )}

      {/* Top members */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Crown size={18} className="text-yellow-400" />
            Thành viên
          </h2>
          <Link href="/members" className="text-xs text-yellow-500 hover:underline">Xem tất cả →</Link>
        </div>

        {members.length === 0 ? (
          <EmptyState message="Không có dữ liệu thành viên" />
        ) : (
          <div className="divide-y divide-gray-800">
            {members.slice(0, 10).map((m: any, i: number) => (
              <div key={m.tag} className="flex items-center gap-3 py-3">
                <span className="text-gray-600 text-sm w-6 text-right shrink-0">{i + 1}</span>
                <div className="th-badge" style={{ background: `linear-gradient(135deg, ${thColor(m.townHallLevel)}33, #1a1a1a)`, borderColor: thColor(m.townHallLevel) + "44" }}>
                  <span style={{ color: thColor(m.townHallLevel) }}>
                    <NumberEffect effectKey={rosterMap[m.tag]?.equipped_number_effect}>{m.townHallLevel}</NumberEffect>
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    <NameEffect effectKey={rosterMap[m.tag]?.equipped_effect}>{m.name}</NameEffect>
                  </p>
                  <p className={`text-xs ${roleClass(m.role)}`}>{roleLabel(m.role)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-yellow-400">🏆 {formatNumber(m.trophies)}</p>
                  <p className="text-xs text-gray-500">Donate: {m.donations}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
