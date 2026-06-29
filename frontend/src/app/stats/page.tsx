"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNumber, thColor, roleLabel } from "@/lib/utils";
import { BarChart3, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from "recharts";

const COLORS = ["#F4A130","#22c55e","#3b82f6","#a855f7","#ef4444","#ec4899","#14b8a6","#f59e0b"];

export default function StatsPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getClanGames()
      .then(d => setMembers(d.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // TH distribution
  const thDist = members.reduce((acc: Record<number, number>, m) => {
    acc[m.th] = (acc[m.th] || 0) + 1;
    return acc;
  }, {});
  const thData = Object.entries(thDist)
    .map(([th, count]) => ({ th: `TH${th}`, count, color: thColor(Number(th)) }))
    .sort((a, b) => Number(b.th.replace("TH","")) - Number(a.th.replace("TH","")));

  // Donate bar chart (top 10)
  const donateData = [...members]
    .sort((a, b) => b.donations - a.donations)
    .slice(0, 10)
    .map(m => ({ name: m.name.slice(0, 8), donate: m.donations, received: m.donationsReceived }));

  // Role distribution
  const roleDist = members.reduce((acc: Record<string, number>, m) => {
    const r = roleLabel(m.role);
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});
  const roleData = Object.entries(roleDist).map(([name, value]) => ({ name, value }));

  const totalDonate = members.reduce((s, m) => s + m.donations, 0);
  const totalReceived = members.reduce((s, m) => s + m.donationsReceived, 0);
  const avgDonate = members.length ? Math.round(totalDonate / members.length) : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs shadow-xl">
        <p className="text-gray-400 mb-1 font-medium">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
            {p.name}: {formatNumber(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 size={22} className="text-yellow-400" /> Thống kê
        </h1>
        <p className="page-subtitle">Biểu đồ hoạt động clan</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="card h-64 animate-pulse bg-gray-800" />)}
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Thành viên",   value: members.length,        color: "text-blue-400" },
              { label: "Tổng donate",  value: formatNumber(totalDonate),  color: "text-green-400" },
              { label: "Tổng nhận",    value: formatNumber(totalReceived),color: "text-purple-400" },
              { label: "TB donate/NV", value: formatNumber(avgDonate),    color: "text-yellow-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="card text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Donate bar chart */}
            <div className="card">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-green-400" /> Top Donate (10 NV)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={donateData} barSize={12}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={v => formatNumber(v)} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="donate" fill="#22c55e" name="Donate" radius={[4,4,0,0]} />
                  <Bar dataKey="received" fill="#3b82f6" name="Nhận" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* TH distribution */}
            <div className="card">
              <h3 className="font-bold text-white mb-4">Phân bổ Town Hall</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={thData} barSize={20} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis type="category" dataKey="th" tick={{ fontSize: 10, fill: "#6b7280" }} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Số NV" radius={[0,4,4,0]}>
                    {thData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Role distribution pie */}
            <div className="card">
              <h3 className="font-bold text-white mb-4">Phân bổ Role</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}>
                    {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Donate ratio scatter */}
            <div className="card">
              <h3 className="font-bold text-white mb-4">Donate Ratio (Top 10)</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {[...members]
                  .map(m => ({ ...m, ratio: m.donationsReceived > 0 ? m.donations / m.donationsReceived : 99 }))
                  .sort((a, b) => b.ratio - a.ratio)
                  .slice(0, 10)
                  .map(m => (
                    <div key={m.tag} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 truncate shrink-0">{m.name}</span>
                      <div className="flex-1 progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min((m.donations / (members[0]?.donations || 1)) * 100, 100)}%` }} />
                      </div>
                      <span className={`text-xs font-bold shrink-0 w-10 text-right ${m.ratio >= 1 ? "text-green-400" : "text-red-400"}`}>
                        {m.ratio === 99 ? "∞" : m.ratio.toFixed(1)}x
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
