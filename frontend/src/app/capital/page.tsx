"use client";
import { GoldCoinArt } from "@/components/ui/HeroArt";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Castle, TrendingUp, Users, Coins, AlertCircle } from "lucide-react";

export default function CapitalPage() {
  const [raid, setRaid] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRaidSeasons()
      .then(setRaid)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const members: any[] = raid?.members || [];
  const notRaided = members.filter(m => m.capitalResourcesLooted === 0);
  const sorted = [...members].sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted);
  const totalLooted = members.reduce((s, m) => s + (m.capitalResourcesLooted || 0), 0);
  const totalAttacks = members.reduce((s, m) => s + (m.attacks || 0), 0);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="relative rounded-2xl overflow-hidden p-5"
        style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(100,50,150,0.08))" }}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="page-title flex items-center gap-2">
              <Castle size={22} className="text-purple-400" /> Clan Capital
            </h1>
            <p className="page-subtitle">Raid Weekend — theo dõi đột kích</p>
          </div>
          <div className="shrink-0 hidden sm:block">
            <GoldCoinArt size={90} opacity={0.25} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-800" />)}
        </div>
      ) : !raid || !raid.startTime ? (
        <div className="card text-center py-12">
          <Castle size={40} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400">Không có dữ liệu Raid Season</p>
        </div>
      ) : (
        <>
          {/* Season info */}
          <div className="card border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-white">Raid Season hiện tại</h2>
              <span className={`badge font-semibold ${
                raid.state === "ongoing" ? "badge-green" : "badge-blue"
              }`}>
                {raid.state === "ongoing" ? "Đang diễn ra" : "Đã kết thúc"}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Gold cướp được", value: formatNumber(totalLooted), icon: Coins, color: "text-yellow-400" },
                { label: "Tổng attack",   value: totalAttacks, icon: TrendingUp, color: "text-green-400" },
                { label: "Tham gia",      value: `${members.length}/50`, icon: Users, color: "text-blue-400" },
                { label: "Chưa raid",     value: notRaided.length, icon: AlertCircle, color: notRaided.length > 0 ? "text-red-400" : "text-gray-500" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-gray-800 rounded-xl p-3">
                  <Icon size={16} className={`${color} mb-1`} />
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Not raided warning */}
          {notRaided.length > 0 && (
            <div className="card border-red-500/30 bg-red-500/5">
              <p className="text-red-400 font-semibold text-sm mb-2">
                ⚠️ {notRaided.length} thành viên chưa tham gia Raid
              </p>
              <div className="flex flex-wrap gap-2">
                {notRaided.map((m: any) => (
                  <span key={m.tag} className="badge-red">{m.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="card">
            <h3 className="font-bold text-white mb-4">Bảng xếp hạng Raid</h3>
            <div className="divide-y divide-gray-800">
              {sorted.map((m: any, i: number) => {
                const pct = totalLooted > 0 ? (m.capitalResourcesLooted / totalLooted) * 100 : 0;
                return (
                  <div key={m.tag} className="flex items-center gap-3 py-3">
                    <span className={`text-sm font-bold w-6 text-right shrink-0 ${
                      i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-600"
                    }`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.name}</p>
                      <div className="progress-bar mt-1.5 w-full">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-yellow-400">{formatNumber(m.capitalResourcesLooted)}</p>
                      <p className="text-xs text-gray-500">{m.attacks || 0} attack</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
