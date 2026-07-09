"use client";
import { useEffect, useState } from "react";
import { api, getAdminToken } from "@/lib/api";
import { ArtBanner } from "@/components/ui/ArtBanner";
import { usePageBanner } from "@/lib/usePageBanner";
import { BarChart3, TrendingUp, TrendingDown, RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react";

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  war:          { icon: "⚔️", label: "War/CWL giỏi nhất" },
  donate:       { icon: "💎", label: "Donate nhiều nhất" },
  capital:      { icon: "🏰", label: "Kiếm Capital nhiều nhất" },
  best_attack:  { icon: "💥", label: "Tấn công anh dũng nhất" },
  best_defense: { icon: "🛡️", label: "Phòng thủ anh dũng nhất" },
  coins:        { icon: "🪙", label: "Kiếm Coins nhiều nhất" },
};
const CATEGORY_ORDER = ["war", "donate", "capital", "best_attack", "best_defense", "coins"];

function fmtDate(s?: string) {
  if (!s) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(s));
  } catch { return s; }
}

function CategoryBlock({ catKey, data }: { catKey: string; data: { good: any[]; bad: any[] } }) {
  const meta = CATEGORY_META[catKey];
  if (!meta) return null;
  return (
    <div className="card !p-4 space-y-3">
      <h3 className="font-bold text-white flex items-center gap-2">
        <span>{meta.icon}</span> {meta.label}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-green-400 flex items-center gap-1 mb-1.5"><TrendingUp size={12}/> Tốt nhất</p>
          <div className="space-y-1">
            {(data.good || []).length === 0 && <p className="text-xs text-gray-600">Chưa có dữ liệu</p>}
            {(data.good || []).map((e, i) => (
              <div key={i} className="flex items-center gap-2 bg-green-500/5 border border-green-500/10 rounded-lg px-2.5 py-1.5">
                <span className="text-xs w-4 text-gray-500 shrink-0">{i + 1}</span>
                <span className="text-sm text-white flex-1 truncate">{e.player_name}</span>
                <span className="text-[11px] text-green-400 text-right shrink-0">{e.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mb-1.5"><TrendingDown size={12}/> Cần cố gắng</p>
          <div className="space-y-1">
            {(data.bad || []).length === 0 && <p className="text-xs text-gray-600">Chưa có dữ liệu</p>}
            {(data.bad || []).map((e, i) => (
              <div key={i} className="flex items-center gap-2 bg-red-500/5 border border-red-500/10 rounded-lg px-2.5 py-1.5">
                <span className="text-xs w-4 text-gray-500 shrink-0">{i + 1}</span>
                <span className="text-sm text-white flex-1 truncate">{e.player_name}</span>
                <span className="text-[11px] text-red-400 text-right shrink-0">{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportView({ report }: { report: any }) {
  if (!report) return <p className="text-sm text-gray-500">Chưa có báo cáo nào — chờ tự động chạy vào thứ 2 hàng tuần.</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 flex items-center gap-1.5">
        <Clock size={12}/> {fmtDate(report.period_start)} → {fmtDate(report.period_end)}
      </p>
      {CATEGORY_ORDER.map(k => <CategoryBlock key={k} catKey={k} data={report.report?.[k] || { good: [], bad: [] }} />)}
    </div>
  );
}

export default function WeeklyReportPage() {
  const bannerSrc = usePageBanner("weekly-report", "/art/ruins-aftermath.jpg");
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
    <div className="space-y-4 pb-24 animate-fade-up">
      <div className="relative rounded-2xl overflow-hidden p-7 md:p-11"
        style={{ background: "linear-gradient(135deg, rgba(244,161,48,0.14), rgba(139,69,19,0.10))" }}>
        <ArtBanner src={bannerSrc} opacity={0.8} objectPosition="center 35%" />
        <div className="relative banner-content">
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 size={22} className="text-yellow-400" /> Báo cáo thống kê tuần
          </h1>
          <p className="page-subtitle">Top 5 tốt/xấu mỗi tuần — War, Donate, Capital, Tấn công/Phòng thủ, Coins</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-white flex items-center gap-2"><BarChart3 size={18} className="text-yellow-400"/> Tuần này</h2>
        {isAdmin && (
          <button onClick={generateNow} disabled={busy} className="btn-secondary text-xs flex items-center gap-1.5">
            <RefreshCw size={12} className={busy ? "animate-spin" : ""}/> Tạo lại ngay
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse"/>)}
        </div>
      ) : (
        <ReportView report={latest}/>
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
            <ReportView report={selected}/>
          </div>
        </div>
      )}
    </div>
  );
}
