"use client";
import { TrophyArt } from "@/components/ui/HeroArt";
import { useEffect, useRef, useState } from "react";
import { api, getAdminToken, getMemberAuth } from "@/lib/api";
import { AdminGate } from "@/components/ui/AdminGate";
import { Portal } from "@/components/ui/Portal";
import { FireworkField } from "@/components/ui/FireworkField";
import {
  PartyPopper, Plus, Trash2, ExternalLink, RefreshCw, CheckCircle2, Circle, X,
  Gift, Sparkles, Upload, Image as ImageIcon, Trophy, Clock, Phone, ShieldCheck,
  ThumbsUp, ThumbsDown, AlertTriangle, Users, LogIn, LogOut, Lock, Coins,
} from "lucide-react";

/* ─── Constants ───────────────────────────────────────────────────────── */
const EVENT_TYPE_LABEL: Record<string, string> = {
  war: "War thường", cwl: "CWL / War giải", custom: "Tự viết",
};
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:        { label: "⏳ Chờ duyệt",         cls: "badge-purple" },
  active:         { label: "🔥 Đang diễn ra",       cls: "badge-green"  },
  pending_delete: { label: "⚠️ Chờ xác nhận xoá",  cls: "badge-red"    },
  closed:         { label: "Đã đóng",               cls: "badge-red"    },
  rejected:       { label: "Đã từ chối",            cls: "badge-red"    },
};
// Màu viền theo trạng thái
const STATUS_BORDER: Record<string, string> = {
  active:         "from-yellow-500 via-orange-400 to-yellow-600",
  pending:        "from-purple-500 via-purple-400 to-purple-600",
  pending_delete: "from-red-500 via-red-400 to-red-600",
  closed:         "from-gray-600 via-gray-500 to-gray-600",
  rejected:       "from-gray-600 via-gray-500 to-gray-600",
};

function fmtDateTime(s?: string) {
  if (!s) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(s));
  } catch { return s; }
}

function toDatetimeLocal(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ─── Corner diamond ornament ─────────────────────────────────────────── */
function DiamondCorner({ pos }: { pos: "tl"|"tr"|"bl"|"br" }) {
  const cls = {
    tl: "top-[-4px] left-[-4px]",
    tr: "top-[-4px] right-[-4px]",
    bl: "bottom-[-4px] left-[-4px]",
    br: "bottom-[-4px] right-[-4px]",
  }[pos];
  return (
    <svg className={`absolute ${cls} w-3 h-3 pointer-events-none`} viewBox="0 0 12 12">
      <polygon points="6,0 12,6 6,12 0,6"
        fill="rgba(244,161,48,0.85)" stroke="rgba(244,161,48,0.4)" strokeWidth="0.5" />
    </svg>
  );
}

/* ─── Event card với viền hoa văn ─────────────────────────────────────── */
function EventCard({ event, myTag, onOpen }: { event: any; myTag?: string; onOpen: () => void }) {
  const badge    = STATUS_BADGE[event.status] || STATUS_BADGE.active;
  const gradient = STATUS_BORDER[event.status] || STATUS_BORDER.active;
  const iJoined  = event._iJoined;
  const isActive = event.status === "active";

  return (
    <div className="relative cursor-pointer group" onClick={onOpen}>
      {/* Gradient border wrapper */}
      <div className={`rounded-2xl p-[2px] bg-gradient-to-br ${gradient} shadow-lg group-hover:shadow-yellow-500/20 transition-shadow`}>
        {/* Inner card */}
        <div className="relative rounded-[14px] px-4 py-3.5 overflow-hidden transition-all group-hover:-translate-y-0.5"
          style={{ background: "var(--py-card-bg, linear-gradient(180deg,#241640,#1A0F2E))" }}>

          {/* Hoa văn nền (chỉ active) */}
          {isActive && (
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{ backgroundImage: "repeating-linear-gradient(45deg,#F4A130 0,#F4A130 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px" }} />
          )}

          {/* Ánh sáng góc */}
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
            style={{ background: "radial-gradient(circle, #F4A130, transparent)" }} />

          {/* Nội dung */}
          <div className="relative flex items-start gap-3">
            {event.reward_image_url ? (
              <img src={event.reward_image_url} alt="reward"
                className="w-14 h-14 rounded-xl object-cover shrink-0 ring-2 ring-yellow-500/30" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(244,161,48,0.2), rgba(236,72,153,0.15))" }}>
                <Gift size={22} className="text-yellow-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm">{event.title}</h3>
                <span className={`badge text-[10px] ${badge.cls}`}>{badge.label}</span>
                {iJoined && (
                  <span className="badge text-[10px] badge-green flex items-center gap-0.5">
                    <CheckCircle2 size={9}/> Đã tham gia
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {EVENT_TYPE_LABEL[event.event_type] || event.event_type}
                {event.creator_name && <> · {event.creator_name}</>}
              </p>
              {(event.start_time || event.end_time) && (
                <p className="text-[11px] text-gray-600 mt-0.5 flex items-center gap-1">
                  <Clock size={9}/> {fmtDateTime(event.start_time)}{event.end_time && ` → ${fmtDateTime(event.end_time)}`}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {event.reward_name && (
                  <span className="text-xs text-yellow-400 font-medium flex items-center gap-1">
                    <Gift size={11}/> {event.reward_name}
                  </span>
                )}
                {event.reward_coins > 0 && (
                  <span className="text-xs text-orange-400 font-medium flex items-center gap-1">
                    <Coins size={11}/> {event.reward_coins} coins/người
                  </span>
                )}
                {event.participant_count > 0 && (
                  <span className="text-[11px] text-gray-600 flex items-center gap-1">
                    <Users size={9}/> {event.participant_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diamond corners - chỉ hiện khi active */}
      {isActive && (
        <>
          <DiamondCorner pos="tl"/>
          <DiamondCorner pos="tr"/>
          <DiamondCorner pos="bl"/>
          <DiamondCorner pos="br"/>
        </>
      )}
    </div>
  );
}

/* ─── Join Button ─────────────────────────────────────────────────────── */
function JoinButton({ event, participants, onChanged }: { event: any; participants: any[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const member = getMemberAuth();

  if (!member) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-gray-500"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Lock size={14} className="shrink-0"/>
        <span>
          <a href="/login" className="text-yellow-400 hover:underline font-medium">Đăng nhập thành viên</a>{" "}
          để tham gia sự kiện và được xét thưởng.
        </span>
      </div>
    );
  }

  const joined = participants.some(p => p.player_tag === member.player_tag);
  if (event.status !== "active") return null;

  async function handleJoin() {
    setBusy(true);
    try { await api.joinEvent(event.id); onChanged(); }
    catch (e: any) { alert(e.message || "Lỗi tham gia"); }
    finally { setBusy(false); }
  }
  async function handleLeave() {
    if (!confirm("Rút khỏi sự kiện? Bạn sẽ không được xét thưởng nữa.")) return;
    setBusy(true);
    try { await api.leaveEvent(event.id); onChanged(); }
    catch (e: any) { alert(e.message || "Lỗi"); }
    finally { setBusy(false); }
  }

  if (joined) return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-sm font-medium text-green-400">
        <CheckCircle2 size={16}/> Bạn đã tham gia sự kiện này
      </div>
      <button onClick={handleLeave} disabled={busy}
        className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors ml-auto">
        <LogOut size={12}/> Rút
      </button>
    </div>
  );

  return (
    <button onClick={handleJoin} disabled={busy}
      className="btn-gold w-full flex items-center justify-center gap-2 text-sm">
      <LogIn size={16}/> {busy ? "Đang đăng ký..." : "Tham gia sự kiện"}
    </button>
  );
}

/* ─── Participant List ────────────────────────────────────────────────── */
function ParticipantList({ participants }: { participants: any[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!participants.length) return null;
  const show = expanded ? participants : participants.slice(0, 5);
  return (
    <div>
      <button onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1.5 text-sm font-bold text-white mb-2 w-full text-left">
        <Users size={14} className="text-blue-400"/>
        Người tham gia ({participants.length})
        <span className="text-gray-600 text-xs ml-auto">{expanded ? "Thu gọn ▲" : "Xem tất cả ▼"}</span>
      </button>
      <div className="space-y-1">
        {show.map((p: any, i: number) => (
          <div key={p.player_tag} className="flex items-center gap-2 bg-gray-800/40 rounded-xl px-3 py-1.5">
            <span className="text-xs text-gray-600 w-4 text-right">{i+1}</span>
            <span className="text-sm text-gray-200 flex-1 truncate">{p.player_name}</span>
            <span className="text-[10px] text-gray-600">{fmtDateTime(p.joined_at)}</span>
          </div>
        ))}
        {!expanded && participants.length > 5 && (
          <p className="text-xs text-gray-600 text-center py-1">...và {participants.length - 5} người khác</p>
        )}
      </div>
    </div>
  );
}

/* ─── Event Detail Modal ──────────────────────────────────────────────── */
function EventDetailModal({ event, isAdmin, isCreator, onClose, onChanged }: any) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [claims, setClaims]           = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [lbNote, setLbNote]           = useState("");
  const [loading, setLoading]         = useState(true);
  const [busy, setBusy]               = useState(false);
  const member = getMemberAuth();
  const gradient = STATUS_BORDER[event.status] || STATUS_BORDER.active;

  async function load() {
    setLoading(true);
    try {
      const [lb, cl, pt] = await Promise.all([
        api.getLeaderboard(event.id).catch(() => ({ leaderboard: [], note: "" })),
        api.getClaims(event.id).catch(() => []),
        api.getParticipants(event.id).catch(() => []),
      ]);
      setLeaderboard(lb.leaderboard || []);
      setLbNote(lb.note || "");
      setClaims(cl || []);
      setParticipants(pt || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [event.id]);

  async function handleApprove() {
    setBusy(true);
    try { await api.approveEvent(event.id); onChanged?.(); onClose(); }
    catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }
  async function handleReject() {
    if (!confirm("Từ chối và xoá sự kiện này?")) return;
    setBusy(true);
    try { await api.rejectEvent(event.id); onChanged?.(); onClose(); }
    catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }
  async function handleConfirmDelete() {
    setBusy(true);
    try { await api.confirmDeleteEvent(event.id); onChanged?.(); onClose(); }
    catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }
  async function handleCancelDelete() {
    setBusy(true);
    try { await api.cancelDeleteEvent(event.id); onChanged?.(); }
    catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }
  async function handleDeleteRequest() {
    if (!confirm(isAdmin ? `Xoá sự kiện "${event.title}"?` : `Gửi yêu cầu xoá?`)) return;
    setBusy(true);
    try { await api.deleteEvent(event.id); onChanged?.(); onClose(); }
    catch (e: any) { alert(e.message || "Lỗi"); } finally { setBusy(false); }
  }
  async function saveLeaderboardAsClaims() {
    if (!leaderboard.length) return;
    await api.saveClaims(event.id, leaderboard);
    await load(); onChanged?.();
  }
  async function toggleClaim(claim: any) {
    await api.markClaimed(event.id, claim.id, !claim.claimed);
    await load(); onChanged?.();
  }

  const badge = STATUS_BADGE[event.status] || STATUS_BADGE.active;

  return (
    <Portal>
    <div className="modal-overlay" onClick={onClose}>
      {/* Gradient border modal */}
      <div className={`relative w-full max-w-lg mx-4 rounded-2xl p-[2px] bg-gradient-to-br ${gradient}`}
        onClick={e => e.stopPropagation()}>
        {/* Corner diamonds */}
        <DiamondCorner pos="tl"/> <DiamondCorner pos="tr"/>
        <DiamondCorner pos="bl"/> <DiamondCorner pos="br"/>

        <div className="rounded-[14px] max-h-[88vh] overflow-y-auto"
          style={{ background: "var(--py-card-bg, linear-gradient(180deg,#241640,#1A0F2E))" }}>
          {/* Hoa văn nền */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-[14px]"
            style={{ backgroundImage: "repeating-linear-gradient(45deg,#F4A130 0,#F4A130 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px" }} />

          <div className="relative p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <PartyPopper size={18} className="text-pink-400"/> {event.title}
                </h3>
                <p className="text-xs text-gray-500">{EVENT_TYPE_LABEL[event.event_type]}</p>
                <span className={`badge text-[10px] mt-1 ${badge.cls}`}>{badge.label}</span>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 shrink-0">
                <X size={18}/>
              </button>
            </div>

            {/* Admin workflow */}
            {isAdmin && event.status === "pending" && (
              <div className="card !p-3 border-purple-500/30 bg-purple-500/5 space-y-2">
                <p className="text-sm text-purple-300 flex items-center gap-1.5"><ShieldCheck size={14}/> Sự kiện đang chờ duyệt.</p>
                <div className="flex gap-2">
                  <button onClick={handleReject} disabled={busy} className="btn-danger flex-1 text-sm flex items-center justify-center gap-1.5"><ThumbsDown size={14}/> Từ chối</button>
                  <button onClick={handleApprove} disabled={busy} className="btn-gold flex-1 text-sm flex items-center justify-center gap-1.5"><ThumbsUp size={14}/> Duyệt</button>
                </div>
              </div>
            )}
            {isAdmin && event.status === "pending_delete" && (
              <div className="card !p-3 border-red-500/30 bg-red-500/5 space-y-2">
                <p className="text-sm text-red-300 flex items-center gap-1.5"><AlertTriangle size={14}/> {event.creator_name} yêu cầu xoá.</p>
                <div className="flex gap-2">
                  <button onClick={handleCancelDelete} disabled={busy} className="btn-secondary flex-1 text-sm">Giữ lại</button>
                  <button onClick={handleConfirmDelete} disabled={busy} className="btn-danger flex-1 text-sm">Xác nhận xoá</button>
                </div>
              </div>
            )}

            {/* Info */}
            {event.creator_name && (
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <span>👤 <span className="text-gray-300 font-medium">{event.creator_name}</span></span>
                {event.creator_zalo && (
                  <a href={`https://zalo.me/${event.creator_zalo.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:underline">
                    <Phone size={11}/> Zalo: {event.creator_zalo}
                  </a>
                )}
              </div>
            )}
            {(event.start_time || event.end_time) && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <Clock size={12}/> {fmtDateTime(event.start_time) || "?"} → {fmtDateTime(event.end_time) || "?"}
              </p>
            )}
            {event.description && <p className="text-sm text-gray-300">{event.description}</p>}

            {/* Reward box */}
            {(event.reward_name || event.reward_coins > 0) && (
              <div className="relative rounded-2xl p-4 overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(244,161,48,0.12), rgba(236,72,153,0.08))", border: "1px solid rgba(244,161,48,0.25)" }}>
                <div className="flex items-center gap-3">
                  {event.reward_image_url ? (
                    <img src={event.reward_image_url} className="w-16 h-16 rounded-xl object-cover ring-2 ring-yellow-500/30" alt=""/>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <Gift size={26} className="text-yellow-400"/>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-yellow-500/70 font-medium uppercase tracking-wide">Phần quà</p>
                    {event.reward_name && <p className="text-sm font-bold text-yellow-400">{event.reward_name}</p>}
                    {event.reward_coins > 0 && (
                      <p className="text-sm font-bold text-orange-400 flex items-center gap-1 mt-0.5">
                        <Coins size={14}/> {event.reward_coins} Coins mỗi người thắng
                      </p>
                    )}
                    {event.reward_shop_link && (
                      <a href={event.reward_shop_link} target="_blank" rel="noreferrer"
                        className="text-xs text-orange-400 hover:underline flex items-center gap-1 mt-1.5 font-medium">
                        🎁 Xem link quà <ExternalLink size={11}/>
                      </a>
                    )}
                  </div>
                </div>

                {/* Hướng dẫn nhận thưởng khi sự kiện kết thúc */}
                {event.status !== "active" && event.creator_zalo && (
                  <div className="mt-3 pt-3 border-t border-yellow-500/20">
                    <p className="text-xs text-yellow-600 font-semibold mb-1">📦 Cách nhận quà:</p>
                    <ol className="text-xs text-gray-400 space-y-0.5 list-decimal list-inside">
                      <li>Nhắn Zalo cho người tổ chức: <span className="text-blue-400">{event.creator_zalo}</span></li>
                      <li>Gửi: Tên · Số điện thoại · Địa chỉ nhận hàng</li>
                      <li>Người tổ chức đặt hàng Shopee & gửi mã vận đơn</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* Join button */}
            <div className="pt-1 border-t border-gray-800/60">
              <JoinButton event={event} participants={participants} onChanged={load}/>
            </div>

            {/* Participants */}
            {loading ? (
              <div className="h-16 bg-gray-800 rounded-xl animate-pulse"/>
            ) : (
              <ParticipantList participants={participants}/>
            )}

            {/* Leaderboard */}
            <div>
              <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                <Trophy size={14} className="text-yellow-400"/> Bảng xếp hạng (Top {event.top_n})
              </h4>
              <p className="text-[11px] text-blue-400/70 bg-blue-500/5 border border-blue-500/15 rounded-lg px-2.5 py-1.5 mb-2 flex items-center gap-1.5">
                <Users size={11}/> Chỉ người đã <strong>tham gia sự kiện</strong> mới được xét điều kiện nhận thưởng.
              </p>
              {loading ? (
                <div className="h-20 bg-gray-800 rounded-xl animate-pulse"/>
              ) : lbNote ? (
                <p className="text-sm text-gray-500">{lbNote}</p>
              ) : leaderboard.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có dữ liệu — cần có người tham gia và war đang/vừa diễn ra.</p>
              ) : (
                <div className="space-y-1.5">
                  {leaderboard.map((m: any) => (
                    <div key={m.player_tag} className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2">
                      <span className={`text-xs w-5 text-right font-bold ${m.rank===1?"text-yellow-400":m.rank===2?"text-gray-300":m.rank===3?"text-amber-600":"text-gray-500"}`}>
                        {m.rank<=3?["🥇","🥈","🥉"][m.rank-1]:m.rank}
                      </span>
                      <span className="text-sm text-white flex-1 truncate">{m.player_name}</span>
                      <span className="text-xs text-yellow-400 font-semibold">{m.metric_value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && leaderboard.length > 0 && (
              <button onClick={saveLeaderboardAsClaims} className="btn-secondary w-full text-sm">
                Lưu danh sách top vào trao thưởng
              </button>
            )}

            {/* Claims */}
            {claims.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-white mb-2">Trạng thái trao thưởng</h4>
                <div className="space-y-1.5">
                  {claims.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-500 w-5 text-right">{c.rank}</span>
                      <span className="text-sm text-white flex-1 truncate">{c.player_name}</span>
                      <span className="text-xs text-gray-500">{c.metric_value}</span>
                      {isAdmin ? (
                        <button onClick={() => toggleClaim(c)} className="shrink-0">
                          {c.claimed ? <CheckCircle2 size={18} className="text-green-400"/> : <Circle size={18} className="text-gray-600"/>}
                        </button>
                      ) : (
                        c.claimed && <CheckCircle2 size={16} className="text-green-400 shrink-0"/>
                      )}
                    </div>
                  ))}
                </div>
                {/* Hướng dẫn nhận thưởng */}
                {event.creator_zalo && (
                  <div className="mt-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
                    <p className="text-xs text-yellow-600 font-semibold mb-1">📦 Người thắng: cách nhận quà</p>
                    <ol className="text-xs text-gray-400 space-y-0.5 list-decimal list-inside">
                      <li>Nhắn Zalo: <a href={`https://zalo.me/${event.creator_zalo.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" className="text-blue-400 underline">{event.creator_zalo}</a></li>
                      <li>Gửi tên · số điện thoại · địa chỉ nhận</li>
                      <li>Chờ nhận mã đơn Shopee</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {(isAdmin || isCreator) && event.status !== "pending_delete" && (
              <button onClick={handleDeleteRequest} disabled={busy}
                className="text-xs text-red-400 hover:underline flex items-center gap-1">
                <Trash2 size={12}/> {isAdmin ? "Xoá sự kiện" : "Yêu cầu xoá"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ─── Image Upload ────────────────────────────────────────────────────── */
function ImageUploadField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try { onChange((await api.uploadEventImage(file)).url); }
    catch (err: any) { setError(err.message || "Lỗi tải ảnh"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-500 block">Ảnh quà</label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} className="w-16 h-16 rounded-xl object-cover ring-2 ring-yellow-500/20" alt=""/>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center">
            <ImageIcon size={20} className="text-gray-600"/>
          </div>
        )}
        <div className="flex-1 space-y-1.5">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="btn-secondary text-xs flex items-center gap-1.5 w-fit">
            <Upload size={13}/> {uploading ? "Đang tải..." : "Tải từ thiết bị"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
          <input className="input text-xs" placeholder="...hoặc dán link ảnh URL"
            value={value} onChange={e => onChange(e.target.value)}/>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}

/* ─── Create Form ─────────────────────────────────────────────────────── */
function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const [conditions, setConditions] = useState<any[]>([]);
  const [open, setOpen]             = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [loadingWarTime, setLoadingWarTime] = useState(false);
  const isAdmin = !!getAdminToken();

  const [form, setForm] = useState({
    title: "", description: "", event_type: "war", condition_type: "total_stars",
    top_n: 3, reward_name: "", reward_image_url: "", reward_shop_link: "",
    reward_coins: 0,
    start_time: "", end_time: "", creator_zalo: "",
  });

  useEffect(() => { api.getConditions().then(setConditions).catch(() => {}); }, []);

  async function useCurrentWarTime() {
    setLoadingWarTime(true);
    try {
      const war = await api.getCurrentWar();
      setForm(f => ({
        ...f,
        start_time: toDatetimeLocal(war.startTime) || f.start_time,
        end_time:   toDatetimeLocal(war.endTime)   || f.end_time,
      }));
    } catch { alert("Không lấy được thời gian war"); }
    finally { setLoadingWarTime(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true); setError("");
    try {
      await api.createEvent(form);
      setForm({ title:"", description:"", event_type:"war", condition_type:"total_stars",
        top_n:3, reward_name:"", reward_image_url:"", reward_shop_link:"",
        reward_coins:0, start_time:"", end_time:"", creator_zalo:"" });
      setOpen(false); onCreated();
    } catch (e: any) { setError(e.message || "Lỗi tạo sự kiện"); }
    finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-gold flex items-center gap-2 text-sm shadow-lg shadow-yellow-500/10">
        <Plus size={16}/> Tạo sự kiện mới
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="relative card space-y-3 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "repeating-linear-gradient(45deg,#F4A130 0,#F4A130 1px,transparent 0,transparent 50%)", backgroundSize:"8px 8px" }}/>
      <div className="relative flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2"><Sparkles size={16} className="text-yellow-400"/> Tạo sự kiện mới</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-500"><X size={18}/></button>
      </div>

      {!isAdmin && (
        <p className="text-[11px] text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2.5 py-1.5">
          ⏳ Sự kiện sẽ cần admin duyệt trước khi hiện công khai.
        </p>
      )}

      <input className="input" placeholder="Tên sự kiện"
        value={form.title} onChange={e => setForm({...form,title:e.target.value})}/>
      <textarea className="input" placeholder="Mô tả (tuỳ chọn)" rows={2}
        value={form.description} onChange={e => setForm({...form,description:e.target.value})}/>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Loại sự kiện</label>
          <select className="input" value={form.event_type} onChange={e => setForm({...form,event_type:e.target.value})}>
            <option value="war">War thường</option>
            <option value="cwl">CWL / War giải</option>
            <option value="custom">Tự viết</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Top bao nhiêu người</label>
          <input type="number" min={1} max={50} className="input" value={form.top_n}
            onChange={e => setForm({...form,top_n:Number(e.target.value)})}/>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Điều kiện xếp hạng</label>
        <select className="input" value={form.condition_type} onChange={e => setForm({...form,condition_type:e.target.value})}>
          {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="pt-2 border-t border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5"><Clock size={13}/> Thời gian</p>
          <button type="button" onClick={useCurrentWarTime} disabled={loadingWarTime} className="text-[11px] text-yellow-500 hover:underline">
            {loadingWarTime?"Đang lấy...":"Dùng thời gian war hiện tại"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="datetime-local" className="input text-xs" value={form.start_time} onChange={e => setForm({...form,start_time:e.target.value})}/>
          <input type="datetime-local" className="input text-xs" value={form.end_time}   onChange={e => setForm({...form,end_time:e.target.value})}/>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-800 space-y-3">
        <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5"><Gift size={13}/> Phần quà</p>
        <input className="input" placeholder="Tên quà (vd: Móc khoá con mực)"
          value={form.reward_name} onChange={e => setForm({...form,reward_name:e.target.value})}/>
        <ImageUploadField value={form.reward_image_url} onChange={url => setForm({...form,reward_image_url:url})}/>
        <input className="input" placeholder="Link quà Shopee / Lazada (tuỳ chọn)"
          value={form.reward_shop_link} onChange={e => setForm({...form,reward_shop_link:e.target.value})}/>

        {/* Coin reward */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
            <Coins size={12}/> Thưởng Coins mỗi người thắng (từ coins của bạn)
          </label>
          <input type="number" min={0} step={50} className="input" placeholder="0 = không thưởng coins"
            value={form.reward_coins || ""} onChange={e => setForm({...form,reward_coins:Number(e.target.value)||0})}/>
          <p className="text-[11px] text-gray-600 mt-1">
            Coins sẽ tự động trừ của bạn và cộng cho người thắng khi admin xác nhận trao thưởng.
          </p>
        </div>

        <input className="input" placeholder="Số Zalo của bạn để người thắng liên hệ nhận quà"
          value={form.creator_zalo} onChange={e => setForm({...form,creator_zalo:e.target.value})}/>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving?"Đang tạo...":"Tạo sự kiện"}
      </button>
    </form>
  );
}

/* ─── Gate: chỉ Co/Leader mới tạo được ───────────────────────────────── */
function CreateEventGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const isAdmin = !!getAdminToken();

  useEffect(() => {
    if (isAdmin) { setAllowed(true); return; }
    const member = getMemberAuth();
    if (!member) { setAllowed(false); return; }
    api.getRoster().then((roster: any[]) => {
      const me = roster.find(m => m.tag === member.player_tag);
      setAllowed(!!me && (me.role === "leader" || me.role === "coLeader"));
    }).catch(() => setAllowed(false));
  }, [isAdmin]);

  if (allowed === null) return null;
  if (!allowed) return (
    <p className="text-xs text-gray-600">
      Chỉ <span className="text-gray-400">Đồng thủ lĩnh+</span> mới tạo được sự kiện.
    </p>
  );
  return <>{children}</>;
}

/* ─── Main Page ───────────────────────────────────────────────────────── */
export default function EventsPage() {
  const [events, setEvents]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<any>(null);
  const [myJoinedIds, setMyJoinedIds] = useState<Set<number>>(new Set());
  const isAdmin = !!getAdminToken();
  const member  = getMemberAuth();

  async function load() {
    setLoading(true);
    try {
      const evs = await api.getEvents();
      setEvents(evs);
      if (member) {
        const joined = new Set<number>();
        await Promise.all(
          evs.filter((e: any) => e.status === "active").map(async (e: any) => {
            try {
              const pts = await api.getParticipants(e.id);
              if (pts.some((p: any) => p.player_tag === member.player_tag)) joined.add(e.id);
            } catch {}
          })
        );
        setMyJoinedIds(joined);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const visible = events.filter(ev => {
    if (["active","pending_delete","closed"].includes(ev.status)) return true;
    if (ev.status === "pending") return isAdmin || ev.creator_tag === member?.player_tag;
    return false;
  }).map(ev => ({ ...ev, _iJoined: myJoinedIds.has(ev.id) }));

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden p-6"
        style={{ background:"linear-gradient(135deg,rgba(244,161,48,0.18),rgba(236,72,153,0.12),rgba(139,69,19,0.15))" }}>
        <FireworkField bursts={4}/>
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 animate-gold-pulse"
            style={{ background:"linear-gradient(135deg,#F4A130,#ec4899)" }}>
            <Trophy size={26} className="text-white"/>
          </div>
          <div className="flex-1">
            <h1 className="page-title flex items-center gap-2">
              Sự kiện & Trao thưởng <Sparkles size={18} className="text-yellow-400"/>
            </h1>
            <p className="page-subtitle">War giải, thử thách, quà từ cửa hàng của clan</p>
          </div>
          <div className="shrink-0 hidden sm:block">
            <TrophyArt size={95} opacity={0.22} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <CreateEventGate>
          <CreateEventForm onCreated={load}/>
        </CreateEventGate>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm ml-auto">
          <RefreshCw size={14}/> Làm mới
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4">{[1,2].map(i=><div key={i} className="h-24 rounded-2xl animate-pulse bg-gray-800"/>)}</div>
      ) : visible.length === 0 ? (
        <div className="card text-center py-12">
          <PartyPopper size={40} className="mx-auto mb-3 text-yellow-500/50"/>
          <p className="text-gray-300 font-medium">Chưa có sự kiện nào</p>
          <p className="text-sm text-gray-600 mt-1">Tạo sự kiện để trao quà cho thành viên xuất sắc!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map(ev => (
            <EventCard key={ev.id} event={ev} myTag={member?.player_tag} onOpen={()=>setSelected(ev)}/>
          ))}
        </div>
      )}

      {selected && (
        <EventDetailModal
          event={selected}
          isAdmin={isAdmin}
          isCreator={selected.creator_tag === member?.player_tag}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
