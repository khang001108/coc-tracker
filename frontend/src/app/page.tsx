"use client";
import { CocLoader } from "@/components/ui/CocLoader";
import { ClanSwitcher } from "@/components/ui/ClanSwitcher";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArtBanner } from "@/components/ui/ArtBanner";
import { OrnateFrame } from "@/components/ui/OrnateFrame";
import { useEmberColor } from "@/lib/useEmberColor";
import { usePageBanner } from "@/lib/usePageBanner";
import { api } from "@/lib/api";
import { formatNumber, roleLabel, roleClass, thColor, warStateLabel, formatDate } from "@/lib/utils";
import { Shield, Users, Trophy, Star, Swords, AlertCircle, TrendingUp, Crown, Copy, Check, RefreshCw } from "lucide-react";
import { NameEffect } from "@/components/ui/NameEffect";
import { NumberEffect } from "@/components/ui/NumberEffect";
import { EmberField } from "@/components/ui/EmberField";

function StatCard({ label, value, sub, icon: Icon, color = "text-yellow-400" }: any) {
  return (
    <div className="card !p-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-800`}>
          <Icon size={15} className={color} />
        </div>
        <div className="min-w-0">
          <p className="stat-value !text-base leading-tight truncate">{value ?? "—"}</p>
          <p className="stat-label !text-[10px] leading-tight truncate">{label}</p>
        </div>
      </div>
      {sub && <p className="text-[10px] text-gray-500 mt-1">{sub}</p>}
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
  const [raid, setRaid] = useState<any>(null);
  const [rosterMap, setRosterMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [syncFailed, setSyncFailed] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [tagCopied, setTagCopied] = useState(false);
  const [overviewCfg, setOverviewCfg] = useState<Record<string, string>>({});
  const emberColor = useEmberColor();
  const warBannerSrc = usePageBanner("overview_war", "/art/barbarian-fireball.jpg");
  const cwlBannerSrc = usePageBanner("overview_cwl", "/art/dragon-fire-logo.jpg");

  async function load(silent = false) {
    if (!silent) setLoading(true);
    if (!silent) setError("");
    try {
      const [c, w, cw, roster, r] = await Promise.allSettled([
        api.getClan(), api.getCurrentWar(), api.getCWLCurrentWar(), api.getRoster(), api.getRaidSeasons(),
      ]);
      if (c.status === "fulfilled") setClan(c.value); else throw c.reason;
      setWar(w.status === "fulfilled" ? w.value : null);
      setCwl(cw.status === "fulfilled" ? cw.value : null);
      setRaid(r.status === "fulfilled" ? r.value : null);
      if (roster.status === "fulfilled") {
        const map: Record<string, any> = {};
        (roster.value as any[]).forEach(m => { map[m.tag] = m; });
        setRosterMap(map);
      }
      setSyncFailed(false);
    } catch (e: any) {
      // Tải ngầm (silent) mà lỗi thì KHÔNG xoá nội dung đang xem để hiện lỗi
      // to đùng — chỉ báo nhẹ 1 chấm đỏ nhỏ, dữ liệu cũ vẫn còn nguyên trên
      // màn hình, người dùng tự quyết có cần bấm tải lại hay không.
      if (silent) setSyncFailed(true);
      else setError(e.message);
    } finally {
      if (!silent) setLoading(false);
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
    api.getPublicSettings().then(setOverviewCfg).catch(() => {});
    // Auto-refresh mỗi 5 phút — CHỈ khi tab đang thật sự hiển thị, để không
    // tốn tải/pin khi tab bị ẩn (chuyển app khác, khoá màn hình...). Khi
    // quay lại tab, tải mới ngay lập tức thay vì đợi tới mốc 5 phút tiếp theo.
    let t: ReturnType<typeof setInterval> | null = null;
    function startInterval() {
      if (t) return;
      t = setInterval(() => load(true), 5 * 60 * 1000);
    }
    function stopInterval() {
      if (t) { clearInterval(t); t = null; }
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        load(true);
        startInterval();
      } else {
        stopInterval();
      }
    }
    startInterval();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
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
        {syncFailed && (
          <button onClick={() => load(true)} title="Lần tải ngầm gần nhất bị lỗi — bấm để thử lại"
            className="shrink-0 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>

      {/* Clan description — viền hoa văn */}
      {clan?.description && (
        <OrnateFrame>
        <div className="relative rounded-2xl overflow-hidden"
          style={{ padding: "2px", background: "linear-gradient(135deg, #F4A130 0%, #B87320 40%, #FFD700 60%, #B87320 80%, #F4A130 100%)" }}>
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
        </OrnateFrame>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Thành viên"    value={`${clan?.members || 0}/50`}   icon={Users}    color="text-blue-400" />
        <StatCard label="Điểm Clan"     value={formatNumber(clan?.clanPoints || 0)} icon={Trophy} color="text-yellow-400" />
        <StatCard label="Level Clan"    value={clan?.clanLevel || 0}          icon={Star}     color="text-purple-400" />
        <StatCard label="War Wins"      value={clan?.warWins || 0}            icon={Swords}   color="text-red-400"
          sub={`Streak: ${clan?.warWinStreak || 0}`} />
      </div>

      {/* War status */}
      {war?.state && war.state !== "notInWar" && overviewCfg.overview_show_war !== "false" && (
        <Link href="/war" className="block card border-red-500/20 bg-red-500/5 relative overflow-hidden transition-transform hover:scale-[1.01] active:scale-[0.99]">
          <ArtBanner src={warBannerSrc} opacity={0.8} objectPosition="center 25%" />
          <EmberField count={18} speed={1.2} color={emberColor} />
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
        </Link>
      )}

      {/* CWL status — tách riêng khỏi war thường ở trên, vì 1 clan có thể vừa
          war thường vừa CWL cùng lúc */}
      {cwl?.current?.state && cwl.current.state !== "notInWar" && overviewCfg.overview_show_cwl !== "false" && (
        <Link href="/war?tab=cwl" className="block card relative overflow-hidden transition-transform hover:scale-[1.01] active:scale-[0.99]" style={{ borderColor: "rgba(244,161,48,0.3)", background: "rgba(244,161,48,0.04)" }}>
          <ArtBanner src={cwlBannerSrc} opacity={0.75} objectPosition="center 30%" />
          <EmberField count={18} speed={1.2} color={emberColor} />
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
        </Link>
      )}

      {/* Capital Raid status — hiện khi đang có Raid Weekend diễn ra */}
      {raid?.state === "ongoing" && overviewCfg.overview_show_capital !== "false" && (
        <Link href="/capital" className="block card relative overflow-hidden transition-transform hover:scale-[1.01] active:scale-[0.99]" style={{ borderColor: "rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.04)" }}>
          <ArtBanner src="/art/capital-sky-islands.jpg" opacity={0.8} objectPosition="center 40%" />
          <div className="relative flex items-center justify-between mb-4 banner-content">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Shield size={18} className="text-purple-400" />
              Clan Capital — Raid Weekend
            </h2>
            <span className="badge font-semibold badge-green">Đang diễn ra</span>
          </div>
          <div className="relative grid grid-cols-3 gap-4 text-center banner-content">
            <div>
              <p className="text-2xl font-bold text-yellow-400">{formatNumber((raid.members || []).reduce((s: number, m: any) => s + (m.capitalResourcesLooted || 0), 0))}</p>
              <p className="text-xs text-gray-300">Gold cướp được</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-300">{(raid.members || []).reduce((s: number, m: any) => s + (m.attacks || 0), 0)}</p>
              <p className="text-xs text-gray-300">Tổng attack</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-300">{raid.members?.length || 0}/{clan?.members || 50}</p>
              <p className="text-xs text-gray-300">Tham gia</p>
            </div>
          </div>
        </Link>
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

      {/* Top Cúp + Danh vọng (rút gọn — xem đầy đủ ở Thống kê) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopTrophiesBox members={members} />
        <TopReputationBox />
      </div>
    </div>
  );
}

function TopTrophiesBox({ members }: { members: any[] }) {
  const ranked = [...members].sort((a, b) => (b.trophies || 0) - (a.trophies || 0)).slice(0, 5);
  const medal = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-white flex items-center gap-2"><Trophy size={16} className="text-yellow-400"/> Top Cúp</h2>
        <Link href="/stats" className="text-xs text-yellow-500 hover:underline">Xem tất cả →</Link>
      </div>
      {ranked.length === 0 ? <EmptyState message="Không có dữ liệu"/> : (
        <div className="space-y-1.5">
          {ranked.map((m, i) => (
            <div key={m.tag} className="flex items-center gap-2">
              <span className="text-xs w-5 text-center shrink-0">{medal(i) || i + 1}</span>
              <span className="text-sm text-white flex-1 truncate">{m.name}</span>
              <span className="text-xs text-yellow-400 shrink-0">🏆 {formatNumber(m.trophies || 0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopReputationBox() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getReputationLeaderboard(5).then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const medal = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-white flex items-center gap-2">🏵️ Danh vọng</h2>
        <Link href="/stats" className="text-xs text-yellow-500 hover:underline">Xem tất cả →</Link>
      </div>
      {loading ? (
        <div className="h-24 bg-gray-800 rounded-xl animate-pulse"/>
      ) : rows.length === 0 ? <EmptyState message="Chưa có dữ liệu Danh vọng"/> : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={r.player_tag} className="flex items-center gap-2">
              <span className="text-xs w-5 text-center shrink-0">{medal(i) || i + 1}</span>
              <span className="text-sm text-white flex-1 truncate">{r.player_name}</span>
              <span className="text-xs text-yellow-400 shrink-0">{r.total}đ</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
