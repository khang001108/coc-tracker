"use client";
import { CocLoader } from "@/components/ui/CocLoader";
import { ArtBanner } from "@/components/ui/ArtBanner";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Castle, TrendingUp, Users, Coins, AlertCircle, Copy, Check, UserX } from "lucide-react";
import { NameEffect } from "@/components/ui/NameEffect";

function CopyLogButton({ getText, label = "Copy log" }: { getText: () => string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(getText()); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-yellow-400 transition-colors px-2 py-1 rounded-lg hover:bg-yellow-500/10 shrink-0">
      {copied ? <><Check size={11}/> Đã copy</> : <><Copy size={11}/> {label}</>}
    </button>
  );
}

export default function CapitalPage() {
  const [raid, setRaid] = useState<any>(null);
  const [clan, setClan] = useState<any>(null);
  const [rosterMap, setRosterMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([api.getRaidSeasons(), api.getRoster(), api.getClan()]).then(([r, roster, c]) => {
      if (r.status === "fulfilled") setRaid(r.value);
      if (c.status === "fulfilled") setClan(c.value);
      if (roster.status === "fulfilled") {
        const map: Record<string, any> = {};
        (roster.value as any[]).forEach(x => { map[x.tag] = x; });
        setRosterMap(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  const allMembers: any[] = clan?.memberList || [];
  const members: any[] = raid?.members || [];
  const raidTags = new Set(members.map(m => m.tag));
  const notRaided = members.filter(m => m.capitalResourcesLooted === 0);
  const joinedNoAttack = members.filter(m => (m.attacks || 0) === 0);
  const notJoined = allMembers.filter(m => !raidTags.has(m.tag) && (m.townHallLevel || 0) >= 6);
  const belowTH6 = allMembers.filter(m => (m.townHallLevel || 0) < 6);
  const sorted = [...members].sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted);
  const totalLooted = members.reduce((s, m) => s + (m.capitalResourcesLooted || 0), 0);
  const totalAttacks = members.reduce((s, m) => s + (m.attacks || 0), 0);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="relative rounded-2xl overflow-hidden p-7 md:p-11"
        style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(100,50,150,0.08))" }}>
        <ArtBanner src="/art/capital-sky-islands.jpg" opacity={0.85} objectPosition="center 40%" />
        <div className="relative flex items-center gap-4 banner-content">
          <div className="flex-1">
            <h1 className="page-title flex items-center gap-2">
              <Castle size={22} className="text-purple-400" /> Clan Capital
            </h1>
            <p className="page-subtitle">Raid Weekend — theo dõi đột kích</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          <CocLoader text="Đang tải Clan Capital..." minHeight={180} />
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
                { label: "Tham gia",      value: `${members.length}/${clan?.members || 50}`, icon: Users, color: "text-blue-400" },
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

          {/* Chưa tham gia raid (không xuất hiện trong danh sách raid) */}
          {notJoined.length > 0 && (
            <div className="card border-red-500/30 bg-red-500/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-400 font-semibold text-sm flex items-center gap-2">
                  <UserX size={15}/> {notJoined.length} thành viên chưa tham gia Raid
                </p>
                <CopyLogButton getText={() =>
                  `🏰 CHƯA THAM GIA RAID (${raid.state === "ongoing" ? "tuần này" : "mùa vừa qua"}):\n` +
                  notJoined.map((m: any, i: number) => `${i + 1}. ${m.name} (TH${m.townHallLevel})`).join("\n")
                } />
              </div>
              <div className="flex flex-wrap gap-2">
                {notJoined.map((m: any) => (
                  <span key={m.tag} className="badge-red"><NameEffect effectKey={rosterMap[m.tag]?.equipped_effect}>{m.name}</NameEffect></span>
                ))}
              </div>
            </div>
          )}

          {/* Tham gia nhưng chưa đánh lượt nào */}
          {joinedNoAttack.length > 0 && (
            <div className="card border-orange-500/30 bg-orange-500/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-orange-400 font-semibold text-sm flex items-center gap-2">
                  ⚔️ {joinedNoAttack.length} thành viên tham gia nhưng chưa đánh
                </p>
                <CopyLogButton getText={() =>
                  `⚔️ ĐÃ THAM GIA NHƯNG CHƯA ĐÁNH LƯỢT NÀO:\n` +
                  joinedNoAttack.map((m: any, i: number) => `${i + 1}. ${m.name}`).join("\n")
                } />
              </div>
              <div className="flex flex-wrap gap-2">
                {joinedNoAttack.map((m: any) => (
                  <span key={m.tag} className="badge" style={{ color: "#fb923c", background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.3)" }}>
                    <NameEffect effectKey={rosterMap[m.tag]?.equipped_effect}>{m.name}</NameEffect>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TH dưới 6 — chưa đủ điều kiện tham gia Capital */}
          {belowTH6.length > 0 && (
            <div className="card border-gray-600/30 bg-gray-800/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 font-semibold text-sm flex items-center gap-2">
                  🔒 {belowTH6.length} thành viên chưa đủ điều kiện (TH dưới 6)
                </p>
                <CopyLogButton getText={() =>
                  `🔒 CHƯA ĐỦ ĐIỀU KIỆN THAM GIA CAPITAL (TH<6):\n` +
                  belowTH6.map((m: any, i: number) => `${i + 1}. ${m.name} (TH${m.townHallLevel})`).join("\n")
                } />
              </div>
              <div className="flex flex-wrap gap-2">
                {belowTH6.map((m: any) => (
                  <span key={m.tag} className="badge" style={{ color: "#9ca3af", background: "rgba(156,163,175,0.1)", border: "1px solid rgba(156,163,175,0.25)" }}>
                    {m.name} (TH{m.townHallLevel})
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-2">Lưu ý: TH tối thiểu để tham gia Clan Capital có thể thay đổi theo cập nhật của game — điều chỉnh nếu Supercell đổi mốc này.</p>
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
                      <p className="text-sm font-medium text-white truncate">
                        <NameEffect effectKey={rosterMap[m.tag]?.equipped_effect}>{m.name}</NameEffect>
                      </p>
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
