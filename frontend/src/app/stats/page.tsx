"use client";
import { CocLoader } from "@/components/ui/CocLoader";
import { useEffect, useState } from "react";
import { api, getAdminToken } from "@/lib/api";
import { formatNumber, thColor, roleLabel } from "@/lib/utils";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, ShieldOff, HeartCrack, Copy, Check, RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { ArtBanner } from "@/components/ui/ArtBanner";
import { usePageBanner } from "@/lib/usePageBanner";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import { MedalRewardBox } from "@/components/ui/MedalRewardBox";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from "recharts";

const COLORS = ["#F4A130","#22c55e","#3b82f6","#a855f7","#ef4444","#ec4899","#14b8a6","#f59e0b"];

function fmtDate(s?: string) {
  if (!s) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(s));
  } catch { return s; }
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(getText()); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-yellow-400 transition-colors px-2 py-1 rounded-lg hover:bg-yellow-500/10 shrink-0">
      {copied ? <><Check size={11}/> Đã copy</> : <><Copy size={11}/> Copy</>}
    </button>
  );
}

/* ─── Tab: Báo cáo tuần (Top 5 tốt/xấu) ───────────────────────────────── */
const WEEKLY_CATEGORY_META: Record<string, { icon: string; label: string }> = {
  war:          { icon: "⚔️", label: "War/CWL giỏi nhất" },
  donate:       { icon: "💎", label: "Donate nhiều nhất" },
  capital:      { icon: "🏰", label: "Kiếm Capital nhiều nhất" },
  best_attack:  { icon: "💥", label: "Tấn công anh dũng nhất" },
  best_defense: { icon: "🛡️", label: "Phòng thủ anh dũng nhất" },
  coins:        { icon: "🪙", label: "Kiếm Coins nhiều nhất" },
};
const WEEKLY_CATEGORY_ORDER = ["war", "donate", "capital", "best_attack", "best_defense", "coins"];

function WeeklyRankRow({ e, i, tone }: { e: any; i: number; tone: "good" | "bad" }) {
  const isGood = tone === "good";
  return (
    <div className={isGood
      ? "flex items-start gap-2 bg-green-500/5 border border-green-500/10 rounded-lg px-2.5 py-1.5"
      : "flex items-start gap-2 bg-red-500/5 border border-red-500/10 rounded-lg px-2.5 py-1.5"}>
      <span className="text-xs w-4 text-gray-500 shrink-0 pt-0.5">{i + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{e.player_name}</p>
        {e.value && <p className={isGood ? "text-[10px] text-green-400 truncate" : "text-[10px] text-red-400 truncate"}>{e.value}</p>}
      </div>
    </div>
  );
}

function WeeklyRankList({ entries, tone }: { entries: any[]; tone: "good" | "bad" }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? entries : entries.slice(0, 3);
  return (
    <div className="space-y-1">
      {entries.length === 0 && <p className="text-xs text-gray-600">Chưa có dữ liệu</p>}
      {shown.map((e, i) => <WeeklyRankRow key={i} e={e} i={i} tone={tone} />)}
      {entries.length > 3 && (
        <button onClick={() => setExpanded(x => !x)} className="text-[10px] text-gray-500 hover:text-yellow-400">
          {expanded ? "Thu gọn ▲" : `Xem thêm ${entries.length - 3} ▼`}
        </button>
      )}
    </div>
  );
}

function WeeklyCategoryBlock({ catKey, data }: { catKey: string; data: { good: any[]; bad: any[] } }) {
  const meta = WEEKLY_CATEGORY_META[catKey];
  if (!meta) return null;
  return (
    <div className="card !p-4 space-y-3 border-l-2 border-yellow-500/30">
      <h3 className="font-bold text-white flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center text-sm shrink-0">{meta.icon}</span>
        {meta.label}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-green-500/[0.03] p-2.5">
          <p className="text-xs font-semibold text-green-400 flex items-center gap-1 mb-1.5"><TrendingUp size={12}/> Tốt nhất</p>
          <WeeklyRankList entries={data.good || []} tone="good"/>
        </div>
        <div className="rounded-xl bg-red-500/[0.03] p-2.5">
          <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mb-1.5"><TrendingDown size={12}/> Cần cố gắng</p>
          <WeeklyRankList entries={data.bad || []} tone="bad"/>
        </div>
      </div>
    </div>
  );
}

function WeeklyReportView({ report }: { report: any }) {
  if (!report) return <p className="text-sm text-gray-500">Chưa có báo cáo nào — chờ tự động chạy vào thứ 2 hàng tuần.</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl bg-yellow-500/5 border border-yellow-500/15 px-3 py-2">
        <Clock size={14} className="text-yellow-400 shrink-0"/>
        <p className="text-xs text-gray-300">{fmtDate(report.period_start)} → {fmtDate(report.period_end)}</p>
      </div>
      {WEEKLY_CATEGORY_ORDER.map(k => <WeeklyCategoryBlock key={k} catKey={k} data={report.report?.[k] || { good: [], bad: [] }} />)}
    </div>
  );
}

/* ─── Tab: Top Cúp ─────────────────────────────────────────────────────── */
function TrophyLeaderboardTab() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMembers().then((r: any) => setMembers(r.items || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse"/>)}</div>;

  const ranked = [...members].sort((a, b) => (b.trophies || 0) - (a.trophies || 0));
  const medal = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

  return (
    <div className="card space-y-1.5">
      <h3 className="font-bold text-white flex items-center gap-2 mb-2">🏆 Top Cúp thành viên</h3>
      {ranked.map((m, i) => (
        <div key={m.tag} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${i < 3 ? "bg-yellow-500/5 border border-yellow-500/15" : "bg-gray-800/50"}`}>
          <span className="text-sm w-6 text-center shrink-0">{medal(i) || i + 1}</span>
          <span className="text-sm text-white flex-1 truncate">{m.name}</span>
          <span className="text-xs text-yellow-400 shrink-0">🏆 {(m.trophies || 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Tab: Danh vọng ───────────────────────────────────────────────────── */
function ReputationLeaderboardTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReputationLeaderboard(50).then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse"/>)}</div>;

  const medal = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
  const tierColor: Record<string, string> = { "Kim Cương": "text-cyan-300", "Vàng": "text-yellow-400", "Bạc": "text-gray-300", "Đồng": "text-orange-400" };

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-xs text-gray-500">
          Danh vọng là thước đo uy tín lâu dài, tính theo CHẤT LƯỢNG đóng góp (tham gia/thắng
          War, 3 sao, CWL, Donate, Raid, Clan Games...). Danh vọng càng cao, hệ số Coins thưởng war-star càng lớn.
        </p>
      </div>
      <div className="card space-y-1.5">
        <h3 className="font-bold text-white flex items-center gap-2 mb-2">🏵️ Xếp hạng Danh vọng</h3>
        {rows.length === 0 && <p className="text-sm text-gray-600 text-center py-4">Chưa có dữ liệu Danh vọng.</p>}
        {rows.map((r, i) => (
          <div key={r.player_tag} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${i < 3 ? "bg-yellow-500/5 border border-yellow-500/15" : "bg-gray-800/50"}`}>
            <span className="text-sm w-6 text-center shrink-0">{medal(i) || i + 1}</span>
            <span className="text-sm text-white flex-1 truncate">{r.player_name}</span>
            <span className={`text-[10px] shrink-0 ${tierColor[r.tier.name] || "text-gray-400"}`}>{r.tier.name}</span>
            <span className="text-xs text-yellow-400 shrink-0 w-14 text-right">{r.total}đ</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyReportTab() {
  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const isAdmin = !!getAdminToken();

  async function load() {
    setLoading(true);
    try {
      const [l, h] = await Promise.all([
        api.getWeeklyLatest().catch(() => null),
        api.getWeeklyHistory(20).catch(() => []),
      ]);
      setLatest(l); setHistory(h || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function generateNow() {
    setBusy(true);
    try { await api.generateWeeklyNow(); await load(); }
    catch (e: any) { alert(e.message || "Lỗi tạo báo cáo"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="card !py-3 !px-4 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <span className="text-base">📊</span> Top 5 tốt/xấu mỗi tuần — tự động tổng hợp mỗi thứ 2.
        </p>
        {isAdmin && (
          <button onClick={generateNow} disabled={busy} className="btn-secondary text-xs flex items-center gap-1.5 shrink-0">
            <RefreshCw size={12} className={busy ? "animate-spin" : ""}/> Tạo lại ngay
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse"/>)}
        </div>
      ) : (
        <WeeklyReportView report={latest}/>
      )}

      {history.length > 0 && (
        <div className="pt-2">
          <button onClick={() => setShowHistory(s => !s)}
            className="flex items-center gap-1.5 text-sm font-bold text-white w-full">
            Lịch sử báo cáo ({history.length}) {showHistory ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {history.map((h) => (
                <button key={h.id} onClick={() => setSelected(h)}
                  className="w-full text-left bg-gray-800/50 hover:bg-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 flex items-center gap-2 transition-colors">
                  <Clock size={12} className="text-gray-500 shrink-0"/>
                  {fmtDate(h.period_start)} → {fmtDate(h.period_end)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="relative w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto rounded-2xl p-4 space-y-3"
            style={{ background: "var(--py-card-bg, linear-gradient(180deg,#241640,#1A0F2E))" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Báo cáo tuần</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-sm">Đóng ✕</button>
            </div>
            <WeeklyReportView report={selected}/>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const [tab, setTab] = useState<"overview" | "weekly">("overview");
  const [overviewSubTab, setOverviewSubTab] = useState<"general" | "cumulative" | "medals" | "trophies" | "reputation">("general");
  const [members, setMembers] = useState<any[]>([]);
  const bannerSrc = usePageBanner("stats", "/art/ruins-aftermath.jpg");
  const [war, setWar] = useState<any>(null);
  const [warLog, setWarLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");
  const [warActivity, setWarActivity] = useState<{ weakest_war: any[]; most_skips: any[]; mvp_attack?: any; mvp_defense?: any }>({ weakest_war: [], most_skips: [] });
  const [donationTrend, setDonationTrend] = useState<{ least_donate: any[] }>({ least_donate: [] });
  const [topCoins, setTopCoins] = useState<any[]>([]);
  const [coinsScope, setCoinsScope] = useState<"clan" | "all">("clan");
  const [coinsCopied, setCoinsCopied] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([api.getClanGames(), api.getCurrentWar(), api.getWarLog()])
      .then(([m, w, wl]) => {
        if (m.status === "fulfilled") setMembers((m.value as any).members || []);
        if (w.status === "fulfilled") setWar(w.value);
        if (wl.status === "fulfilled") setWarLog((wl.value as any).items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.getTopCoins(10, coinsScope).then((res: any) => setTopCoins(res.top || [])).catch(() => {});
  }, [coinsScope]);

  useEffect(() => {
    setInsightsLoading(true);
    Promise.allSettled([api.getWarActivity(period), api.getDonationTrend(period)])
      .then(([wa, dt]) => {
        if (wa.status === "fulfilled") setWarActivity(wa.value as any);
        if (dt.status === "fulfilled") setDonationTrend(dt.value as any);
      })
      .finally(() => setInsightsLoading(false));
  }, [period]);

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

  const periodLabel = period === "week" ? "7 ngày qua" : period === "month" ? "30 ngày qua" : "từ khi lập web";

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="relative rounded-2xl overflow-hidden p-7 md:p-11"
        style={{ background: "linear-gradient(135deg, rgba(244,161,48,0.14), rgba(139,69,19,0.10))" }}>
        <ArtBanner src={bannerSrc} opacity={0.8} objectPosition="center 35%" />
        <div className="relative banner-content">
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 size={22} className="text-yellow-400" /> Thống kê
          </h1>
          <p className="page-subtitle">Biểu đồ hoạt động clan</p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <SlidingTabs
          tabs={[
            {id:"overview",label:"Tổng quan"},
            {id:"weekly",label:"Báo cáo tuần"},
          ]}
          active={tab} onChange={(id) => setTab(id as any)} className="w-max"/>
      </div>

      {tab === "weekly" ? (
        <WeeklyReportTab/>
      ) : (
        <>
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <SlidingTabs
              tabs={[
                {id:"general",label:"Chung"},
                {id:"cumulative",label:"Tích luỹ"},
                {id:"medals",label:"Huy chương CWL"},
                {id:"trophies",label:"Top Cúp"},
                {id:"reputation",label:"Danh vọng"},
              ]}
              active={overviewSubTab} onChange={(id) => setOverviewSubTab(id as any)} className="w-max"/>
          </div>

          {overviewSubTab === "medals" ? (
            <MedalRewardBox/>
          ) : overviewSubTab === "trophies" ? (
            <TrophyLeaderboardTab/>
          ) : overviewSubTab === "reputation" ? (
            <ReputationLeaderboardTab/>
          ) : overviewSubTab === "cumulative" ? (
            <CumulativeTab
              period={period} setPeriod={setPeriod} periodLabel={periodLabel}
              warActivity={warActivity} insightsLoading={insightsLoading}
              topCoins={topCoins} coinsScope={coinsScope} setCoinsScope={setCoinsScope}
              coinsCopied={coinsCopied} setCoinsCopied={setCoinsCopied}
            />
          ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CocLoader text="Đang tải thống kê..." minHeight={200} />
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Thành viên",   value: members.length,             color: "text-blue-400",   icon: "👥" },
              { label: "Tổng donate",  value: formatNumber(totalDonate),  color: "text-green-400",  icon: "💎" },
              { label: "Tổng nhận",    value: formatNumber(totalReceived),color: "text-purple-400", icon: "📥" },
              { label: "TB donate/NV", value: formatNumber(avgDonate),    color: "text-yellow-400", icon: "📊" },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="card text-center">
                <p className="text-lg mb-0.5">{icon}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Donate bar chart */}
            <div className="card">
              <h3 className="font-bold text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-green-400" /> Top Donate (10 NV)
              </h3>
              <p className="text-[11px] text-gray-500 mb-3">Donate và nhận quân hiện tại của 10 người donate nhiều nhất</p>
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
              <h3 className="font-bold text-white">Phân bổ Town Hall</h3>
              <p className="text-[11px] text-gray-500 mb-3">Số lượng thành viên theo từng cấp Town Hall</p>
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
              <h3 className="font-bold text-white">Phân bổ Role</h3>
              <p className="text-[11px] text-gray-500 mb-1">Tỉ lệ Thủ lĩnh / Đồng thủ lĩnh / Trưởng lão / Thành viên</p>
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

          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}

function CumulativeTab({ period, setPeriod, periodLabel, warActivity, insightsLoading, topCoins, coinsScope, setCoinsScope, coinsCopied, setCoinsCopied }: {
  period: "week" | "month" | "all"; setPeriod: (p: "week" | "month" | "all") => void; periodLabel: string;
  warActivity: { weakest_war: any[]; most_skips: any[] }; insightsLoading: boolean;
  topCoins: any[]; coinsScope: "clan" | "all"; setCoinsScope: (s: "clan" | "all") => void;
  coinsCopied: boolean; setCoinsCopied: (b: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="card !py-3 !px-4">
        <p className="text-xs text-gray-500">
          Dữ liệu tích luỹ liên tục <strong className="text-gray-300">từ khi lập web</strong> — càng dùng lâu càng chính xác. Khác với "Báo cáo tuần" (chỉ tính riêng tuần gần nhất).
        </p>
      </div>

      {/* Nhiều Coins nhất — xếp đầu tiên */}
      {topCoins.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5"><CoinIcon size={16}/> Nhiều Coins nhất</h4>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg overflow-hidden border border-gray-700 text-xs">
                <button onClick={() => setCoinsScope("clan")} className={`px-2.5 py-1 ${coinsScope === "clan" ? "bg-yellow-500 text-black font-semibold" : "text-gray-400"}`}>Trong clan</button>
                <button onClick={() => setCoinsScope("all")} className={`px-2.5 py-1 ${coinsScope === "all" ? "bg-yellow-500 text-black font-semibold" : "text-gray-400"}`}>Liên clan</button>
              </div>
              <button onClick={() => {
                const lines = topCoins.map((p, i) => coinsScope === "all"
                  ? `${i + 1}. ${p.name} (${p.clan_name}) — ${p.coins.toLocaleString()} coins`
                  : `${i + 1}. ${p.name} — ${p.coins.toLocaleString()} coins`);
                const header = coinsScope === "all" ? "🪙 XẾP HẠNG COINS LIÊN CLAN" : "🪙 XẾP HẠNG COINS TRONG CLAN";
                navigator.clipboard.writeText(`${header}\n${lines.join("\n")}`);
                setCoinsCopied(true);
                setTimeout(() => setCoinsCopied(false), 2000);
              }} title="Copy làm báo cáo" className="text-gray-500 hover:text-yellow-400 shrink-0">
                {coinsCopied ? <Check size={15}/> : <Copy size={15}/>}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {topCoins.map((p, i) => (
              <div key={p.tag} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-center shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
                {coinsScope === "all" && (
                  p.clan_badge ? <img src={p.clan_badge} alt="" className="w-5 h-5 object-contain shrink-0" title={p.clan_name} />
                    : <span className="w-5 h-5 shrink-0" />
                )}
                <span className="flex-1 min-w-0 truncate">
                  <span className="text-gray-300">{p.name}</span>
                  {coinsScope === "all" && <span className="text-gray-600 text-xs ml-1.5">· {p.clan_name}</span>}
                </span>
                <span className="text-yellow-400 font-semibold shrink-0 flex items-center gap-1"><CoinIcon size={14}/> {p.coins.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-600 mt-2">Chỉ tính người đã đăng nhập/nhận tài khoản trên web — Coins kiếm được từ war/donate.</p>
        </div>
      )}

      {/* Hiệu suất kém — cần admin lưu ý */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" /> Cần lưu ý ({periodLabel})
          </h3>
          <div className="flex gap-1 p-0.5 rounded-lg bg-gray-800">
            {[{ v: "week", l: "Tuần" }, { v: "month", l: "Tháng" }, { v: "all", l: "Từ đầu" }].map(o => (
              <button key={o.v} onClick={() => setPeriod(o.v as any)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${period === o.v ? "bg-yellow-500 text-gray-900 font-semibold" : "text-gray-400"}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5"><HeartCrack size={14} className="text-red-400" /> War yếu nhất (TB sao/war)</h4>
              {warActivity.weakest_war.length > 0 && (
                <CopyButton getText={() =>
                  `⭐ WAR YẾU NHẤT (TB sao/war — ${periodLabel}):\n` +
                  warActivity.weakest_war.map((p, i) => `${i + 1}. ${p.name}: ${p.avg_stars}⭐ TB (${p.wars} war)`).join("\n")
                } />
              )}
            </div>
            {insightsLoading ? (
              <p className="text-xs text-gray-600">Đang tải...</p>
            ) : warActivity.weakest_war.length === 0 ? (
              <p className="text-xs text-gray-600">Chưa đủ dữ liệu war trong khoảng thời gian này</p>
            ) : (
              <div className="space-y-2">
                {warActivity.weakest_war.map(p => (
                  <div key={p.tag} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 truncate">{p.name}</span>
                    <span className="text-red-400 font-semibold shrink-0">{p.avg_stars}⭐ TB · {p.wars} war</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5"><ShieldOff size={14} className="text-orange-400" /> Hay bỏ war nhất</h4>
              {warActivity.most_skips.length > 0 && (
                <CopyButton getText={() =>
                  `🛡️ HAY BỎ WAR NHẤT (${periodLabel}):\n` +
                  warActivity.most_skips.map((p, i) => `${i + 1}. ${p.name}: bỏ ${p.skipped}/${p.wars} war (${p.skip_rate}%)`).join("\n")
                } />
              )}
            </div>
            {insightsLoading ? (
              <p className="text-xs text-gray-600">Đang tải...</p>
            ) : warActivity.most_skips.length === 0 ? (
              <p className="text-xs text-gray-600">Chưa có ai bỏ war trong khoảng thời gian này</p>
            ) : (
              <div className="space-y-2">
                {warActivity.most_skips.map(p => (
                  <div key={p.tag} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 truncate">{p.name}</span>
                    <span className="text-orange-400 font-semibold shrink-0">{p.skipped}/{p.wars} war ({p.skip_rate}%)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-gray-600 mt-3">
          "War yếu nhất"/"Hay bỏ war" tính từ dữ liệu tích luỹ mỗi khi có war kết thúc (kể cả CWL) — càng dùng lâu càng chính xác.
          Xem "Tấn công/Phòng thủ anh dũng nhất" và "Donate ít nhất" theo TỪNG TUẦN ở tab "Báo cáo tuần".
        </p>
      </div>
    </div>
  );
}
