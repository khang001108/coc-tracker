"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldArt, GoldCoinArt } from "@/components/ui/HeroArt";
import { api } from "@/lib/api";
import { formatNumber, roleLabel, roleClass, thColor, warStateLabel, formatDate } from "@/lib/utils";
import { Shield, Users, Trophy, Star, Swords, RefreshCw, AlertCircle, TrendingUp, Crown } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [c, w] = await Promise.all([api.getClan(), api.getCurrentWar()]);
      setClan(c);
      setWar(w);
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="card h-28 animate-pulse bg-gray-800" />)}
      </div>
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
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
            <p className="page-subtitle">#{clan?.tag?.replace("#", "") || "—"}</p>
          </div>
        </div>
        <button onClick={refresh} disabled={refreshing} title="Làm mới"
          className="icon-btn-game w-10 h-10 text-gray-900 shrink-0 disabled:opacity-60">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Clan description — viền hoa văn */}
      {clan?.description && (
        <div className="relative" style={{ padding: 2, borderRadius: 16, background: "linear-gradient(135deg, #F4A130 0%, #7A3A00 25%, #F4A130 50%, #7A3A00 75%, #F4A130 100%)" }}>
          {/* Diamond corners */}
          {(["top-[-4px] left-[-4px]","top-[-4px] right-[-4px]","bottom-[-4px] left-[-4px]","bottom-[-4px] right-[-4px]"] as const).map((pos, i) => (
            <svg key={i} className={`absolute ${pos} w-3 h-3 pointer-events-none z-10`} viewBox="0 0 12 12">
              <polygon points="6,0 12,6 6,12 0,6" fill="rgba(244,161,48,0.92)" stroke="rgba(244,161,48,0.4)" strokeWidth="0.5"/>
            </svg>
          ))}
          {/* Inner */}
          <div className="relative rounded-2xl px-5 py-4 overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(244,161,48,0.08),rgba(139,69,19,0.06))", backgroundImage: "repeating-linear-gradient(45deg,rgba(244,161,48,0.04) 0,rgba(244,161,48,0.04) 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px" }}>
            {/* Icon lửa trang trí */}
            <span className="absolute right-3 top-3 text-lg opacity-30 select-none">🔥</span>
            <span className="absolute left-3 bottom-3 text-sm opacity-20 select-none">⚔️</span>
            <p className="relative text-sm text-gray-200 italic leading-relaxed">"{clan.description}"</p>
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
        <div className="card border-red-500/20 bg-red-500/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Swords size={18} className="text-red-400" />
              War đang diễn ra
            </h2>
            <span className={`badge font-semibold ${warState.color}`}>{warState.label}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400 mb-1">{war.clan?.name}</p>
              <p className="text-2xl font-bold text-yellow-400">⭐ {clanStars}</p>
              <p className="text-sm text-gray-400">{war.clan?.destructionPercentage?.toFixed(2)}%</p>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-gray-600 font-bold text-xl">VS</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">{war.opponent?.name}</p>
              <p className="text-2xl font-bold text-red-400">⭐ {oppStars}</p>
              <p className="text-sm text-gray-400">{war.opponent?.destructionPercentage?.toFixed(2)}%</p>
            </div>
          </div>
          {war.endTime && (
            <p className="text-xs text-gray-500 text-center mt-3">Kết thúc: {formatDate(war.endTime)}</p>
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
                  <span style={{ color: thColor(m.townHallLevel) }}>{m.townHallLevel}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{m.name}</p>
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
