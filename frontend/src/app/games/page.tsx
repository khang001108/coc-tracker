"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNumber, thColor, roleLabel, roleClass } from "@/lib/utils";
import { Gamepad2, Trophy, RefreshCw } from "lucide-react";
import { NameEffect } from "@/components/ui/NameEffect";
import { NumberEffect } from "@/components/ui/NumberEffect";

export default function GamesPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [rosterMap, setRosterMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [d, roster] = await Promise.allSettled([api.getClanGames(), api.getRoster()]);
      if (d.status === "fulfilled") setMembers((d.value as any).members || []);
      if (roster.status === "fulfilled") {
        const map: Record<string, any> = {};
        (roster.value as any[]).forEach(r => { map[r.tag] = r; });
        setRosterMap(map);
      }
      setLastUpdate(new Date());
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // Auto-refresh mỗi 5 phút
    const t = setInterval(() => load(true), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const sorted = [...members].sort((a, b) => b.donations - a.donations);
  const maxPts = sorted[0]?.donations || 1;
  const totalPts = members.reduce((s, m) => s + (m.donations || 0), 0);
  const completed = members.filter(m => m.donations >= 4000).length; // Clan Games max ~4000

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Gamepad2 size={22} className="text-purple-400" /> Clan Games
          </h1>
          <p className="page-subtitle">Điểm đóng góp của từng thành viên</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm shrink-0">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-purple-400">{formatNumber(totalPts)}</p>
          <p className="text-xs text-gray-500 mt-1">Tổng điểm</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-400">{completed}</p>
          <p className="text-xs text-gray-500 mt-1">Hoàn thành (≥4000đ)</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-yellow-400">{members.length - completed}</p>
          <p className="text-xs text-gray-500 mt-1">Chưa hoàn thành</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="card h-16 animate-pulse bg-gray-800" />)}
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Bảng xếp hạng ({sorted.length} NV)</h3>
            {lastUpdate && (
              <p className="text-xs text-gray-600">
                Cập nhật: {lastUpdate.toLocaleTimeString("vi-VN")}
              </p>
            )}
          </div>
          <div className="divide-y divide-gray-800/50">
            {sorted.map((m, i) => {
              const pct = Math.min((m.donations / maxPts) * 100, 100);
              const done = m.donations >= 4000;
              return (
                <div key={m.tag} className="px-4 py-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-sm font-bold w-6 text-right shrink-0 ${
                      i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-600"
                    }`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}`}
                    </span>
                    <div className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center shrink-0"
                      style={{ color: thColor(m.th), background: thColor(m.th) + "22" }}>
                      <NumberEffect effectKey={rosterMap[m.tag]?.equipped_number_effect}>{m.th}</NumberEffect>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        <NameEffect effectKey={rosterMap[m.tag]?.equipped_effect}>{m.name}</NameEffect>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {done && <span className="badge-green text-[10px]">✓ Hoàn thành</span>}
                      <p className="text-sm font-bold text-purple-400">{formatNumber(m.donations)}</p>
                    </div>
                  </div>
                  <div className="progress-bar ml-9">
                    <div className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: done
                          ? "linear-gradient(90deg, #22c55e, #16a34a)"
                          : "linear-gradient(90deg, #a855f7, #7c3aed)"
                      }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
