"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNumber, thColor, roleLabel } from "@/lib/utils";
import { BarChart3, TrendingUp, AlertTriangle, ShieldOff, HeartCrack } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from "recharts";

const COLORS = ["#F4A130","#22c55e","#3b82f6","#a855f7","#ef4444","#ec4899","#14b8a6","#f59e0b"];

export default function StatsPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [war, setWar] = useState<any>(null);
  const [warLog, setWarLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([api.getClanGames(), api.getCurrentWar(), api.getWarLog()])
      .then(([m, w, wl]) => {
        if (m.status === "fulfilled") setMembers((m.value as any).members || []);
        if (w.status === "fulfilled") setWar(w.value);
        if (wl.status === "fulfilled") setWarLog((wl.value as any).items || []);
      })
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

  // Tổng hợp hiệu suất war: gộp war hiện tại (nếu có dữ liệu đòn đánh) + tối đa 4 war gần nhất trong log
  const warsForStats: any[] = [];
  if (war && (war.state === "inWar" || war.state === "warEnded")) warsForStats.push(war);
  warsForStats.push(...warLog.slice(0, 4));

  const perfMap: Record<string, { name: string; totalStars: number; warsCounted: number; skipped: number; attacksUsed: number }> = {};
  warsForStats.forEach(w => {
    (w.clan?.members || []).forEach((m: any) => {
      if (!perfMap[m.tag]) perfMap[m.tag] = { name: m.name, totalStars: 0, warsCounted: 0, skipped: 0, attacksUsed: 0 };
      const attacks = m.attacks || [];
      perfMap[m.tag].totalStars += attacks.reduce((s: number, a: any) => s + a.stars, 0);
      perfMap[m.tag].warsCounted += 1;
      perfMap[m.tag].attacksUsed += attacks.length;
      if (attacks.length === 0) perfMap[m.tag].skipped += 1;
    });
  });
  const perfList = Object.values(perfMap);
  const weakestWar = [...perfList]
    .filter(p => p.warsCounted > 0)
    .sort((a, b) => (a.totalStars / a.warsCounted) - (b.totalStars / b.warsCounted))
    .slice(0, 8);
  const mostSkipped = [...perfList]
    .filter(p => p.skipped > 0)
    .sort((a, b) => b.skipped - a.skipped)
    .slice(0, 8);
  const lowestDonate = [...members].sort((a, b) => a.donations - b.donations).slice(0, 8);

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
              <ResponsiveContainer width="100%" height={280}>
                <PieChart margin={{ top: 20, right: 30, bottom: 10, left: 30 }}>
                  <Pie data={roleData} dataKey="value" nameKey="name"
                    cx="50%" cy="52%" outerRadius={75}
                    label={({ cx, cy, midAngle, outerRadius, name, value }) => {
                      const RADIAN = Math.PI / 180;
                      const r = outerRadius + 28;
                      const x = cx + r * Math.cos(-midAngle * RADIAN);
                      const y = cy + r * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="#9ca3af" textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central" fontSize={11} fontWeight={500}>
                          {`${name}: ${value}`}
                        </text>
                      );
                    }}
                    labelLine={{ stroke: "#4b5563", strokeWidth: 1 }}>
                    {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
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

          {/* Hiệu suất kém — cần admin lưu ý */}
          <div>
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" /> Cần lưu ý (dựa trên war hiện tại + tối đa 4 war gần nhất)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="card">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5"><HeartCrack size={14} className="text-red-400" /> War yếu nhất (TB sao/war)</h4>
                {weakestWar.length === 0 ? (
                  <p className="text-xs text-gray-600">Chưa đủ dữ liệu war</p>
                ) : (
                  <div className="space-y-2">
                    {weakestWar.map(p => (
                      <div key={p.name} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 truncate">{p.name}</span>
                        <span className="text-red-400 font-semibold shrink-0">{(p.totalStars / p.warsCounted).toFixed(1)}⭐ TB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5"><ShieldOff size={14} className="text-orange-400" /> Hay bỏ war nhất</h4>
                {mostSkipped.length === 0 ? (
                  <p className="text-xs text-gray-600">Chưa có ai bỏ war gần đây</p>
                ) : (
                  <div className="space-y-2">
                    {mostSkipped.map(p => (
                      <div key={p.name} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 truncate">{p.name}</span>
                        <span className="text-orange-400 font-semibold shrink-0">{p.skipped}/{p.warsCounted} war</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5"><TrendingUp size={14} className="text-gray-400 rotate-180" /> Donate ít nhất</h4>
                <div className="space-y-2">
                  {lowestDonate.map(m => (
                    <div key={m.tag} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 truncate">{m.name}</span>
                      <span className="text-gray-400 font-semibold shrink-0">{m.donations}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-600 mt-2">
              Lưu ý: CoC API không cung cấp dữ liệu "thời gian online cuối" của thành viên, nên không thể thống kê chính xác "ai ít online nhất" — đây là giới hạn từ phía Supercell, không phải thiếu sót của web. "Hay bỏ war" và "Donate ít nhất" là 2 chỉ số gần nhất phản ánh mức độ hoạt động.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
