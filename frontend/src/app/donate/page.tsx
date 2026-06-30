"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNumber, thColor, roleLabel, roleClass } from "@/lib/utils";
import { Heart, Gamepad2, ArrowUpDown } from "lucide-react";

type SortKey = "donations" | "donationsReceived" | "ratio" | "name" | "th";

export default function DonatePage() {
  const [members, setMembers] = useState<any[]>([]);
  const [tab, setTab] = useState<"donate" | "games">("donate");
  const [sortKey, setSortKey] = useState<SortKey>("donations");
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getClanGames()
      .then(d => setMembers(d.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sorted = [...members].sort((a, b) => {
    const ratio = (m: any) => m.donationsReceived > 0 ? m.donations / m.donationsReceived : m.donations;
    const vals: Record<SortKey, any> = {
      donations: [a.donations, b.donations],
      donationsReceived: [a.donationsReceived, b.donationsReceived],
      ratio: [ratio(a), ratio(b)],
      name: [a.name, b.name],
      th: [a.th, b.th],
    };
    const [va, vb] = vals[sortKey];
    const cmp = typeof va === "string" ? va.localeCompare(vb) : vb - va;
    return sortAsc ? -cmp : cmp;
  });

  const totalDonate = members.reduce((s, m) => s + (m.donations || 0), 0);
  const totalReceived = members.reduce((s, m) => s + (m.donationsReceived || 0), 0);
  const topDonor = [...members].sort((a, b) => b.donations - a.donations)[0];

  function SortBtn({ k, label, align = "left" }: { k: SortKey; label: string; align?: "left" | "right" }) {
    return (
      <button onClick={() => toggleSort(k)}
        className={`flex items-center gap-1 text-xs font-medium transition-colors w-full ${
          align === "right" ? "justify-end" : "justify-start"
        } ${sortKey === k ? "text-yellow-400" : "text-gray-500 hover:text-gray-300"}`}>
        {label} <ArrowUpDown size={10} className="shrink-0" />
      </button>
    );
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Heart size={22} className="text-pink-400" /> Donate & Clan Games
        </h1>
        <p className="page-subtitle">Thống kê đóng góp và điểm clan games</p>
      </div>

      {/* Tabs */}
      <div className="tab-pill-group">
        {([["donate","❤️ Donate"],["games","🎮 Clan Games"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`${
              tab === id ? "tab-pill-active" : "tab-pill"
            }`}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="card h-64 animate-pulse bg-gray-800" />
      ) : tab === "donate" ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-400">{formatNumber(totalDonate)}</p>
              <p className="text-xs text-gray-500 mt-1">Tổng donate</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-blue-400">{formatNumber(totalReceived)}</p>
              <p className="text-xs text-gray-500 mt-1">Tổng nhận</p>
            </div>
            <div className="card text-center">
              <p className="text-sm font-bold text-yellow-400 truncate">{topDonor?.name || "—"}</p>
              <p className="text-xs text-gray-500 mt-1">Top donor</p>
              {topDonor && <p className="text-xs text-green-400">{formatNumber(topDonor.donations)}</p>}
            </div>
          </div>

          {/* Table */}
          <div className="card !p-0 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-1 px-3 py-3 bg-gray-800/50 text-xs text-gray-500 font-medium border-b border-gray-800">
              <div className="col-span-1"><SortBtn k="th" label="TH" /></div>
              <div className="col-span-4"><SortBtn k="name" label="Tên" /></div>
              <div className="col-span-3"><SortBtn k="donations" label="Donate" align="right" /></div>
              <div className="col-span-3"><SortBtn k="donationsReceived" label="Nhận" align="right" /></div>
              <div className="col-span-1"><SortBtn k="ratio" label="Ratio" align="right" /></div>
            </div>
            <div className="divide-y divide-gray-800/50">
              {sorted.map((m, i) => {
                const ratio = m.donationsReceived > 0 ? (m.donations / m.donationsReceived).toFixed(1) : "∞";
                const ratioNum = m.donationsReceived > 0 ? m.donations / m.donationsReceived : 99;
                return (
                  <div key={m.tag} className="grid grid-cols-12 gap-1 px-3 py-3 items-center hover:bg-gray-800/30 transition-colors">
                    <div className="col-span-1">
                      <div className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center"
                        style={{ color: thColor(m.th), background: thColor(m.th) + "22" }}>
                        {m.th}
                      </div>
                    </div>
                    <div className="col-span-4 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.name}</p>
                      <p className={`text-xs ${roleClass(m.role)}`}>{roleLabel(m.role)}</p>
                    </div>
                    <div className="col-span-3 text-right">
                      <p className="text-sm font-bold text-green-400">{formatNumber(m.donations)}</p>
                    </div>
                    <div className="col-span-3 text-right">
                      <p className="text-sm text-blue-400">{formatNumber(m.donationsReceived)}</p>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className={`text-xs font-semibold ${ratioNum >= 1 ? "text-green-400" : "text-red-400"}`}>
                        {ratio}x
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* Clan Games */
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Gamepad2 size={18} className="text-purple-400" /> Điểm Clan Games
            </h3>
            <p className="text-xs text-gray-500">Sắp xếp theo điểm</p>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            💡 Dữ liệu điểm Clan Games được cập nhật tự động mỗi 15 phút từ CoC API.
          </p>
          <div className="divide-y divide-gray-800">
            {sorted.map((m, i) => (
              <div key={m.tag} className="flex items-center gap-3 py-3">
                <span className={`text-sm font-bold w-6 text-right shrink-0 ${
                  i < 3 ? ["text-yellow-400","text-gray-300","text-amber-600"][i] : "text-gray-600"
                }`}>{i + 1}</span>
                <div className="th-badge text-[10px]" style={{ color: thColor(m.th) }}>{m.th}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{m.name}</p>
                  <div className="progress-bar mt-1">
                    <div className="progress-fill" style={{ width: `${Math.min((m.donations / (sorted[0]?.donations || 1)) * 100, 100)}%` }} />
                  </div>
                </div>
                <p className="text-sm font-bold text-yellow-400 shrink-0">{formatNumber(m.donations)} pts</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
