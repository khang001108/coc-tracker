"use client";
import { CocLoader } from "@/components/ui/CocLoader";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNumber, thColor, roleLabel, roleClass, formatDate } from "@/lib/utils";
import { Users, Search, UserPlus, UserMinus, Trophy, Crown, Coins, ShieldCheck, ChevronRight } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { ArtBanner } from "@/components/ui/ArtBanner";
import { usePageBanner } from "@/lib/usePageBanner";
import { NameEffect } from "@/components/ui/NameEffect";
import { NumberEffect } from "@/components/ui/NumberEffect";
import { ReputationBadge } from "@/components/ui/ReputationBadge";
import { useReputationRankMap } from "@/lib/useReputationRankMap";
import { ZigguratIcon, CitizensIcon, TabletStylusIcon } from "@/components/ui/GrecoIcons";
import { MarqueeText } from "@/components/ui/MarqueeText";
import { SortToggle } from "@/components/ui/SortToggle";

const ROLE_ORDER = ["leader", "coLeader", "admin", "member"];
const ROLE_TITLE: Record<string, string> = {
  leader: "Thủ Lĩnh", coLeader: "Đồng Thủ Lĩnh", admin: "Huynh Trưởng", member: "Thành Viên",
};

/* Màu viền theo cấp bậc */
const RANK_STYLE: Record<string, { border: string; glow: string; text: string; label: string }> = {
  leader:   { border: "#F4A130", glow: "rgba(244,161,48,0.45)",  text: "#FFD700", label: "🥇 " },
  coLeader: { border: "#B0B8C8", glow: "rgba(192,200,216,0.35)", text: "#C8D0E0", label: "🥈 " },
  admin:    { border: "#C88040", glow: "rgba(200,128,64,0.3)",   text: "#DBA060", label: "🥉 " },
  member:   { border: "#3B82F6", glow: "rgba(59,130,246,0.25)",  text: "#60A5FA", label: "" },
};

const CARD_W = 96; // px — cố định để đồng nhất tất cả nhóm

/** Hoa văn trang trí 2 bên toggle — 1 dải hoạ tiết kim cương nhỏ lặp lại
 * theo đúng màu cấp bậc, để mỗi nhóm (Thủ lĩnh/Đồng thủ lĩnh/...) có 1 "chữ
 * ký" hình ảnh riêng thay vì chỉ 1 đường kẻ mờ như trước. */
function RoleFlourish({ color, glow, flip = false }: { color: string; glow: string; flip?: boolean }) {
  const dots = [0, 1, 2, 3, 4];
  return (
    <span className={`flex-1 flex items-center gap-1 min-w-[24px] ${flip ? "flex-row-reverse" : ""}`}
      style={{ filter: `drop-shadow(0 0 2px ${glow})` }}>
      <span className="h-px flex-1 opacity-25" style={{ background: `linear-gradient(${flip ? "to left" : "to right"}, transparent, ${color})` }}/>
      {dots.map(i => (
        <svg key={i} width={i === 2 ? 7 : 4} height={i === 2 ? 7 : 4} viewBox="0 0 8 8" className="shrink-0"
          style={{ opacity: 0.3 + i * 0.12 }}>
          <polygon points="4,0 8,4 4,8 0,4" fill={color} />
        </svg>
      ))}
    </span>
  );
}

function PyramidGroupSection({ g, gi, onSelect }: {
  g: { role: string; list: any[] };
  gi: number;
  onSelect: (m: any) => void;
}) {
  const defaultOpen = gi === 0;
  const [open, setOpen] = useState(defaultOpen);

  const rs = RANK_STYLE[g.role] || RANK_STYLE.member;
  const cols = Math.min(3, g.list.length); // tối đa 3 cột, ít hơn nếu ít thành viên

  return (
    <div className="space-y-3">
      {/* Header */}
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-2">
        <RoleFlourish color={rs.border} glow={rs.glow} />
        <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0" style={{ filter: `drop-shadow(0 0 3px ${rs.glow})` }}>
          <polygon points="4,0 8,4 4,8 0,4" fill={rs.border} />
        </svg>
        <span className="relative text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-4 py-2 rounded-full transition-all select-none overflow-hidden"
          style={{ color: rs.text, background: "var(--py-pill-bg)", border: `1.5px solid ${rs.border}`, boxShadow: `0 0 10px ${rs.glow}` }}>
          <span className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `radial-gradient(${rs.border} 0.6px, transparent 0.6px)`,
            backgroundSize: "6px 6px", opacity: 0.12,
          }} />
          <Crown size={12} className="relative"/> <span className="relative">{rs.label}{ROLE_TITLE[g.role]} ({g.list.length})</span>
          <span className="relative opacity-50 ml-1 text-[10px]">{open ? "▲" : "▼"}</span>
        </span>
        <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0" style={{ filter: `drop-shadow(0 0 3px ${rs.glow})` }}>
          <polygon points="4,0 8,4 4,8 0,4" fill={rs.border} />
        </svg>
        <RoleFlourish color={rs.border} glow={rs.glow} flip />
      </button>

      {/* Cards — grid cố định CARD_W, căn giữa */}
      {open && (
        <div className="flex justify-center">
          <div className="grid gap-2.5"
            style={{ gridTemplateColumns: `repeat(${cols}, ${CARD_W}px)` }}>
            {g.list.map(m => (
              <button key={m.tag} onClick={() => onSelect(m)}
                className="flex flex-col items-center gap-1.5 py-3 px-1.5 rounded-2xl transition-all hover:-translate-y-0.5 hover:scale-105"
                style={{
                  width: CARD_W,
                  background: "var(--py-card-bg)",
                  border: `1.5px solid ${rs.border}`,
                  boxShadow: `0 0 10px ${rs.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                }}>
                <div className="th-badge" style={{ color: thColor(m.townHallLevel), background: thColor(m.townHallLevel) + "22", borderColor: thColor(m.townHallLevel) + "44" }}>
                  {m.townHallLevel}
                </div>
                <p className="text-[11px] font-semibold text-center truncate w-full px-1" style={{ color: "var(--py-card-text)" }}>
                  {m.name}
                </p>
                <p className="text-[10px] font-medium" style={{ color: rs.text }}>🏆 {formatNumber(m.trophies)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PyramidView({ members, onSelect }: { members: any[]; onSelect: (m: any) => void }) {
  const groups = ROLE_ORDER.map(role => ({
    role,
    list: [...members.filter(m => m.role === role || (role === "admin" && m.role === "elder"))].sort((a, b) => b.trophies - a.trophies),
  })).filter(g => g.list.length > 0);

  return (
    <div className="space-y-5 py-2">
      {groups.map((g, gi) => (
        <PyramidGroupSection key={g.role} g={g} gi={gi} onSelect={onSelect} />
      ))}
    </div>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const bannerSrc = usePageBanner("members", "/art/royal-vista.jpg");
  const repRankMap = useReputationRankMap();
  const [memberLog, setMemberLog] = useState<any[]>([]);
  const [rosterMap, setRosterMap] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [tab, setTab] = useState<"list" | "pyramid" | "log">("pyramid");
  const [selected, setSelected] = useState<any>(null);
  const [playerDetail, setPlayerDetail] = useState<any>(null);
  const [reputation, setReputation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [war, setWar] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [m, log, roster, w] = await Promise.allSettled([api.getMembers(), api.getMemberLog(), api.getRoster(), api.getCurrentWar()]);
      if (m.status === "fulfilled") setMembers((m.value as any).items || []);
      if (log.status === "fulfilled") setMemberLog(log.value as any[]);
      if (roster.status === "fulfilled") {
        const map: Record<string, any> = {};
        (roster.value as any[]).forEach(r => { map[r.tag] = r; });
        setRosterMap(map);
      }
      if (w.status === "fulfilled") setWar(w.value);
      setLoading(false);
    }
    load();
  }, []);

  async function openPlayer(member: any) {
    setSelected(member);
    setDetailLoading(true);
    try {
      const detail = await api.getPlayer(member.tag);
      setPlayerDetail(detail);
    } catch { setPlayerDetail(null); }
    try {
      setReputation(await api.getMemberReputation(member.tag));
    } catch { setReputation(null); }
    setDetailLoading(false);
  }

  const warAttackMap: Record<string, boolean> = {};
  if (war?.state === "inWar" || war?.state === "warEnded") {
    (war.clan?.members || []).forEach((m: any) => { warAttackMap[m.tag] = (m.attacks || []).length > 0; });
  }
  const filtered = members
    .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortAsc ? (a.trophies || 0) - (b.trophies || 0) : (b.trophies || 0) - (a.trophies || 0));

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="relative rounded-2xl overflow-hidden p-7 md:p-11"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.14), rgba(139,69,19,0.08))" }}>
        <ArtBanner src={bannerSrc} opacity={0.85} objectPosition="center 45%" />
        <div className="relative banner-content">
          <h1 className="page-title flex items-center gap-2">
            <Users size={22} className="text-blue-400" /> Thành viên
          </h1>
          <p className="page-subtitle">{members.length}/50 thành viên</p>
        </div>
      </div>

      {/* Tabs */}
      <SlidingTabs
        tabs={[
          {id:"pyramid",label:"Sơ đồ",icon:<ZigguratIcon/>},
          {id:"list",label:"Danh sách",icon:<CitizensIcon/>},
          {id:"log",label:"Nhật ký",icon:<TabletStylusIcon/>},
        ]}
        active={tab} onChange={(id) => setTab(id as any)} />

      {loading ? (
        <CocLoader text="Đang tải thành viên..." minHeight={220} />
      ) : tab === "pyramid" ? (
        <div className="card">
          <PyramidView members={members} onSelect={openPlayer} />
        </div>
      ) : tab === "list" ? (
        <>
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input className="input pl-9" placeholder="Tìm kiếm thành viên..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <SortToggle asc={sortAsc} onToggle={() => setSortAsc(a => !a)} title="Sắp xếp theo Cúp"/>
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="divide-y divide-gray-800">
              {filtered.map((m, i) => (
                <button key={m.tag} onClick={() => openPlayer(m)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors text-left">
                  <span className="text-gray-600 text-xs w-5 shrink-0 text-right">{i + 1}</span>
                  <div className="th-badge" style={{ color: thColor(m.townHallLevel), background: thColor(m.townHallLevel) + "22", borderColor: thColor(m.townHallLevel) + "44" }}>
                    <NumberEffect effectKey={rosterMap[m.tag]?.equipped_number_effect}>{m.townHallLevel}</NumberEffect>
                  </div>
                  <div className="flex-1 min-w-0">
                    <MarqueeText className="text-sm font-semibold text-white">
                      <NameEffect effectKey={rosterMap[m.tag]?.equipped_effect}>{m.name}</NameEffect>
                      {repRankMap[m.tag] && <ReputationBadge rank={repRankMap[m.tag]}/>}
                      {rosterMap[m.tag]?.claimed && (
                        <span title="Đã xác minh danh tính trên web">
                          <ShieldCheck size={12} className="text-green-400 shrink-0" />
                        </span>
                      )}
                    </MarqueeText>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-xs ${roleClass(m.role)}`}>{roleLabel(m.role)}</p>
                      {war?.state === "inWar" && (
                        m.tag in warAttackMap ? (
                          warAttackMap[m.tag] ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">⚔️ Đã đánh</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">⏳ Chưa đánh</span>
                          )
                        ) : null
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-sm font-bold text-yellow-400">🏆 {formatNumber(m.trophies)}</p>
                    <p className="text-xs text-gray-500">Donate {m.donations}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Member log */
        <div className="card">
          <h3 className="font-bold text-white mb-4">Nhật ký vào/rời clan</h3>
          {memberLog.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Chưa có lịch sử</p>
          ) : (
            <div className="space-y-2">
              {memberLog.map((log: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    log.status === "active" ? "bg-green-500/20" : "bg-red-500/20"
                  }`}>
                    {log.status === "active" ? <UserPlus size={16} className="text-green-400" /> : <UserMinus size={16} className="text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <MarqueeText className="text-sm font-medium text-white">{log.name}</MarqueeText>
                    <p className="text-xs text-gray-500">
                      TH{log.th_level} · {log.status === "active" ? "Tham gia" : "Rời clan"}
                      {" · "}{formatDate(log.joined_at || log.left_at)}
                    </p>
                  </div>
                  <span className={log.status === "active" ? "badge-green" : "badge-red"}>
                    {log.status === "active" ? "Tham gia" : "Rời"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Player detail modal */}
      {selected && (
        <Portal>
        <div className="modal-overlay" onClick={() => { setSelected(null); setPlayerDetail(null); setReputation(null); }}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="th-badge w-12 h-12 text-base" style={{ color: thColor(selected.townHallLevel) }}>
                  {selected.townHallLevel}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-1.5">
                    <NameEffect effectKey={rosterMap[selected.tag]?.equipped_effect}>{selected.name}</NameEffect>
                    {repRankMap[selected.tag] && <ReputationBadge rank={repRankMap[selected.tag]} size="md"/>}
                  </h3>
                  <p className={`text-sm ${roleClass(selected.role)}`}>{roleLabel(selected.role)}</p>
                  {rosterMap[selected.tag]?.claimed && (
                    <p className="text-xs text-yellow-400 flex items-center gap-1 mt-0.5">
                      <Coins size={11} /> {(rosterMap[selected.tag]?.coins ?? 0).toLocaleString()} Coins
                    </p>
                  )}
                </div>
                <button onClick={() => { setSelected(null); setPlayerDetail(null); setReputation(null); }}
                  className="ml-auto p-2 rounded-xl hover:bg-gray-800 text-gray-400">✕</button>
              </div>

              {reputation && (
                <div className="mb-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-yellow-500/10 border border-yellow-500/20 p-3 flex items-center gap-3">
                  <span className="text-2xl">🏵️</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{reputation.total} Danh vọng</p>
                    <p className="text-xs text-yellow-400">Tier {reputation.tier.name} (x{reputation.tier.multiplier} Coins thưởng)</p>
                  </div>
                </div>
              )}

              {detailLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-800 rounded-xl animate-pulse" />)}
                </div>
              ) : playerDetail ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Cúp", value: formatNumber(playerDetail.trophies), icon: "🏆" },
                      { label: "Best Cúp", value: formatNumber(playerDetail.bestTrophies), icon: "👑" },
                      { label: "War Stars", value: playerDetail.warStars, icon: "⭐" },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-lg">{icon}</p>
                        <p className="font-bold text-white text-sm">{value}</p>
                        <p className="text-xs text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Donate", value: playerDetail.donations },
                      { label: "Nhận", value: playerDetail.donationsReceived },
                      { label: "Thắng tấn công", value: playerDetail.attackWins ?? "—" },
                      { label: "Thắng phòng thủ", value: playerDetail.defenseWins ?? "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-800 rounded-xl p-3">
                        <p className="text-white font-semibold">{formatNumber(value || 0)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Heroes */}
                  {playerDetail.heroes?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Heroes</p>
                      <div className="flex gap-2 flex-wrap">
                        {playerDetail.heroes.map((h: any) => (
                          <div key={h.name} className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                            <p className="text-xs text-gray-400 truncate max-w-[80px]">{h.name.replace(" King","").replace(" Queen","").replace(" Warden","")}</p>
                            <p className="text-yellow-400 font-bold">Lv {h.level}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Không tải được hồ sơ</p>
              )}
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
