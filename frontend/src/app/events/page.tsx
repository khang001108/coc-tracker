"use client";
import { ArtBanner } from "@/components/ui/ArtBanner";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { usePageBanner } from "@/lib/usePageBanner";
import { useEffect, useRef, useState } from "react";
import { api, getAdminToken, getMemberAuth } from "@/lib/api";
import { AdminGate } from "@/components/ui/AdminGate";
import { Portal } from "@/components/ui/Portal";
import { FireworkField } from "@/components/ui/FireworkField";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import {
  PartyPopper, Plus, Trash2, ExternalLink, RefreshCw, CheckCircle2, Circle, X,
  Gift, Sparkles, Upload, Image as ImageIcon, Trophy, Clock, Phone, ShieldCheck,
  ThumbsUp, ThumbsDown, AlertTriangle, Users, LogIn, LogOut, Lock, Coins, Edit3, Flag, Loader2,
  Copy, Send, Check,
} from "lucide-react";

/* ─── Constants ───────────────────────────────────────────────────────── */
const CONDITION_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  total_stars:           { label: "Tổng sao war",          icon: "⭐", desc: "Ai đạt nhiều sao nhất trong war" },
  best_destruction:      { label: "Phá hủy cao nhất",       icon: "💥", desc: "% phá hủy cao nhất trong 1 đòn đánh" },
  perfect_war:           { label: "War hoàn hảo",           icon: "🏆", desc: "Toàn bộ lượt đánh đều đạt 3 sao" },
  most_attacks_used:     { label: "Dùng hết lượt",          icon: "⚔️", desc: "Dùng đủ toàn bộ lượt tấn công" },
  fewest_stars_conceded: { label: "Phòng thủ tốt nhất",     icon: "🛡️", desc: "Bị đánh mất ít sao nhất" },
  top_donations:         { label: "Donate cao nhất",        icon: "💎", desc: "Donate nhiều nhất hiện tại" },
  top_reputation:        { label: "Danh vọng cao nhất",     icon: "🏵️", desc: "Ai có tổng Danh vọng cao nhất" },
  manual:                { label: "Admin tự chọn",          icon: "👑", desc: "Người tổ chức tự quyết định người thắng" },
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  war: "War thường", cwl: "CWL / War giải", capital: "Clan Capital", donate: "Donate", custom: "Tự viết",
};
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:        { label: "⏳ Chờ duyệt",         cls: "badge-purple" },
  active:         { label: "🔥 Đang diễn ra",       cls: "badge-green"  },
  ended:          { label: "🏁 Đã kết thúc",        cls: "badge-red"    },
  pending_delete: { label: "⚠️ Chờ xác nhận xoá",  cls: "badge-red"    },
  closed:         { label: "Đã đóng",               cls: "badge-red"    },
  rejected:       { label: "Đã từ chối",            cls: "badge-red"    },
};
// Màu viền theo trạng thái
const STATUS_BORDER: Record<string, string> = {
  active:         "from-yellow-500 via-orange-400 to-yellow-600",
  ended:          "from-gray-600 via-gray-500 to-gray-600",
  pending:        "from-purple-500 via-purple-400 to-purple-600",
  pending_delete: "from-red-500 via-red-400 to-red-600",
  closed:         "from-gray-600 via-gray-500 to-gray-600",
  rejected:       "from-gray-600 via-gray-500 to-gray-600",
};

/** DB không tự chuyển status khi hết giờ (chỉ đổi khi admin bấm) — nên phải
 * tự kiểm tra thêm end_time, nếu không sự kiện hết hạn vẫn hiện "đang diễn
 * ra" mãi mãi (đây là lỗi đã gặp). */
function isEventActive(event: any): boolean {
  if (event.status !== "active") return false;
  if (event.end_time && new Date(event.end_time) <= new Date()) return false;
  return true;
}

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
  const isActive = isEventActive(event);
  const displayStatus = event.status === "active" && !isActive ? "ended" : event.status;
  const badge    = STATUS_BADGE[displayStatus] || STATUS_BADGE.active;
  const gradient = STATUS_BORDER[displayStatus] || STATUS_BORDER.active;
  const iJoined  = event._iJoined;

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
                {event.visibility === "public" ? (
                  <span className="badge text-[10px] flex items-center gap-0.5" style={{ color: "#38bdf8", background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.3)" }}>
                    🌐 Liên clan
                  </span>
                ) : (
                  <span className="badge text-[10px] flex items-center gap-0.5" style={{ color: "#9ca3af", background: "rgba(156,163,175,0.1)", border: "1px solid rgba(156,163,175,0.25)" }}>
                    <Lock size={9}/> Riêng clan
                  </span>
                )}
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
              {/* Điều kiện xếp hạng — hiển thị rõ để người chơi hiểu */}
              {event.condition_type && CONDITION_LABELS[event.condition_type] && (
                <div className="mt-1.5 flex items-start gap-1.5 rounded-lg px-2 py-1.5"
                  style={{ background: "rgba(244,161,48,0.08)", border: "1px solid rgba(244,161,48,0.2)" }}>
                  <span className="text-[13px] leading-none shrink-0 mt-0.5">
                    {CONDITION_LABELS[event.condition_type].icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-yellow-500 leading-tight">
                      {CONDITION_LABELS[event.condition_type].label}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      {CONDITION_LABELS[event.condition_type].desc}
                    </p>
                  </div>
                </div>
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
  if (!isEventActive(event)) return null;

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
const PARTICIPANT_COLLAPSED_COUNT = 3;

function ParticipantList({ participants }: { participants: any[] }) {
  // Mặc định LUÔN thu gọn — chỉ hiện đủ khi người dùng bấm "Xem tất cả".
  const [expanded, setExpanded] = useState(false);
  if (!participants.length) return null;
  const show = expanded ? participants : participants.slice(0, PARTICIPANT_COLLAPSED_COUNT);
  const hiddenCount = participants.length - PARTICIPANT_COLLAPSED_COUNT;
  return (
    <div>
      <button onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1.5 text-sm font-bold text-white mb-2 w-full text-left">
        <Users size={14} className="text-blue-400"/>
        Người tham gia ({participants.length})
        {hiddenCount > 0 && (
          <span className="text-gray-600 text-xs ml-auto">{expanded ? "Thu gọn ▲" : "Xem tất cả ▼"}</span>
        )}
      </button>
      <div className="space-y-1">
        {show.map((p: any, i: number) => (
          <div key={p.player_tag} className="flex items-center gap-2 bg-gray-800/40 rounded-xl px-3 py-1.5">
            <span className="text-xs text-gray-600 w-4 text-right">{i+1}</span>
            <span className="text-sm text-gray-200 flex-1 truncate">{p.player_name}</span>
            <span className="text-[10px] text-gray-600">{fmtDateTime(p.joined_at)}</span>
          </div>
        ))}
        {!expanded && hiddenCount > 0 && (
          <p className="text-xs text-gray-600 text-center py-1">...và {hiddenCount} người khác</p>
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
  const [myClaim, setMyClaim]         = useState<any>(null);
  const [showMyCode, setShowMyCode]   = useState(false);
  const [codeCopied, setCodeCopied]   = useState(false);
  const member = getMemberAuth();
  const eventReallyActive = isEventActive(event);
  const displayStatus2 = event.status === "active" && !eventReallyActive ? "ended" : event.status;
  const gradient = STATUS_BORDER[displayStatus2] || STATUS_BORDER.active;
  const [showEdit, setShowEdit] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: event.title || "", description: event.description || "",
    reward_name: event.reward_name || "", reward_coins: event.reward_coins || 0,
    creator_zalo: event.creator_zalo || "", start_time: toDatetimeLocal(event.start_time),
    end_time: toDatetimeLocal(event.end_time),
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function submitReport() {
    if (!reportReason.trim()) return;
    try {
      await api.reportEvent(event.id, reportReason.trim());
      setReportSent(true);
    } catch (e: any) { alert(e.message || "Lỗi gửi báo cáo"); }
  }

  async function saveEdit() {
    setEditSaving(true); setEditError("");
    try {
      await api.updateEvent(event.id, editForm);
      onChanged?.();
      setShowEdit(false);
    } catch (e: any) { setEditError(e.message || "Lỗi lưu sự kiện"); }
    finally { setEditSaving(false); }
  }

  async function load() {
    setLoading(true);
    try {
      const [lb, cl, pt, mc] = await Promise.all([
        api.getLeaderboard(event.id).catch(() => ({ leaderboard: [], note: "" })),
        api.getClaims(event.id).catch(() => []),
        api.getParticipants(event.id).catch(() => []),
        member ? api.getMyClaim(event.id).catch(() => null) : Promise.resolve(null),
      ]);
      setLeaderboard(lb.leaderboard || []);
      setLbNote(lb.note || "");
      setClaims(cl || []);
      setParticipants(pt || []);
      setMyClaim(mc || null);
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
  async function copyMyCode() {
    if (!myClaim?.redeem_code) return;
    try {
      await navigator.clipboard.writeText(myClaim.redeem_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch { /* clipboard không khả dụng — bỏ qua */ }
  }
  async function toggleClaim(claim: any) {
    let code: string | undefined;
    if (!claim.claimed) {
      const entered = window.prompt(`Nhập mã nhận thưởng mà ${claim.player_name} cung cấp để xác nhận trao thưởng:`);
      if (entered === null) return; // Admin đã huỷ
      code = entered.trim();
    }
    try {
      await api.markClaimed(event.id, claim.id, !claim.claimed, code);
    } catch (e: any) { alert(e.message || "Mã nhận thưởng không khớp"); return; }
    await load(); onChanged?.();
  }

  const badge = STATUS_BADGE[displayStatus2] || STATUS_BADGE.active;

  return (
    <Portal>
    <div className="modal-overlay" onClick={onClose}>
      {/* Gradient border modal */}
      <div className={`relative w-full max-w-lg mx-4 rounded-2xl p-[2px] bg-gradient-to-br ${gradient} animate-scale-in`}
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
              <div className="flex items-center gap-1 shrink-0">
                {(isAdmin || isCreator) && (
                  <button onClick={() => setShowEdit(true)} title="Sửa sự kiện"
                    className="p-2 rounded-xl hover:bg-gray-800 text-blue-400">
                    <Edit3 size={16}/>
                  </button>
                )}
                {member && !isCreator && (
                  <button onClick={() => setShowReport(true)} title="Báo cáo sự kiện sai trái"
                    className="p-2 rounded-xl hover:bg-gray-800 text-red-400">
                    <Flag size={16}/>
                  </button>
                )}
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400">
                  <X size={18}/>
                </button>
              </div>
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
                    <img src={event.reward_image_url} onClick={() => setZoomImage(event.reward_image_url)}
                      className="w-16 h-16 rounded-xl object-cover ring-2 ring-yellow-500/30 cursor-zoom-in" alt=""/>
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

                {/* Nút nhận thưởng khi sự kiện kết thúc (đã trúng top) — hiện
                    mã nhận thưởng riêng của người thắng, KHÔNG lộ Zalo công khai.
                    Khi người tổ chức đã tích xanh (claimed) thì ẩn nút/mã đi,
                    chỉ còn dòng xác nhận đã nhận. */}
                {!eventReallyActive && myClaim && (
                  <div className="mt-3 pt-3 border-t border-yellow-500/20 space-y-2">
                    {myClaim.claimed ? (
                      <p className="text-sm font-bold text-green-400 flex items-center gap-1.5">
                        <CheckCircle2 size={16}/> Bạn đã nhận thưởng Top {myClaim.rank} — cảm ơn bạn!
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-yellow-400">
                          🎉 Chúc mừng bạn đã xếp Top {myClaim.rank}! Ấn để nhận phần thưởng.
                        </p>
                        {showMyCode ? (
                          <div className="rounded-xl bg-black/30 border border-yellow-500/30 px-4 py-3 text-center space-y-2">
                            <p className="text-[11px] text-gray-400">Mã nhận thưởng của bạn — chỉ bạn và người tổ chức biết mã này</p>
                            <div className="flex items-center justify-center gap-2">
                              <p className="text-2xl font-mono font-bold tracking-[0.3em] text-yellow-400">{myClaim.redeem_code}</p>
                              <button onClick={copyMyCode} title="Copy mã"
                                className="p-1.5 rounded-lg hover:bg-white/10 shrink-0 text-gray-400 hover:text-yellow-400 transition-colors">
                                {codeCopied ? <CheckCircle2 size={16} className="text-green-400"/> : <Copy size={16}/>}
                              </button>
                            </div>
                            <p className="text-[11px] text-gray-500">Gửi mã này cho người tổ chức để đổi thưởng</p>
                            {event.creator_zalo && (
                              <a href={`https://zalo.me/${event.creator_zalo.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                                className="btn-gold w-full text-xs flex items-center justify-center gap-1.5 mt-1">
                                <Send size={13}/> Gửi mã qua Zalo
                              </a>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => setShowMyCode(true)}
                            className="btn-gold w-full flex items-center justify-center gap-2 text-sm animate-gold-pulse">
                            <Gift size={16}/> Nhận thưởng ngay
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Join button */}
            <div className="pt-1 border-t border-gray-800/60">
              {loading ? (
                <div className="h-11 rounded-xl overflow-hidden relative"
                  style={{ background: "linear-gradient(90deg, rgba(244,161,48,0.06), rgba(244,161,48,0.16), rgba(244,161,48,0.06))", backgroundSize: "200% 100%", animation: "shimmer 1.3s ease-in-out infinite" }}>
                  <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-yellow-500/70">
                    <Loader2 size={14} className="animate-spin" /> Đang tải trạng thái tham gia...
                  </div>
                </div>
              ) : (
                <div className="animate-fade-up">
                  <JoinButton event={event} participants={participants} onChanged={load}/>
                </div>
              )}
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
                <div className="space-y-1.5">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-9 rounded-xl overflow-hidden"
                      style={{ background: "linear-gradient(90deg, rgba(120,120,140,0.08), rgba(120,120,140,0.18), rgba(120,120,140,0.08))", backgroundSize: "200% 100%", animation: `shimmer 1.3s ease-in-out infinite ${i * 0.15}s` }} />
                  ))}
                </div>
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

            {isAdmin && leaderboard.length > 0 && claims.length === 0 && (
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
                      {isAdmin && c.redeem_code && (
                        <span className="text-[10px] font-mono text-yellow-500/80 bg-black/30 rounded px-1.5 py-0.5">{c.redeem_code}</span>
                      )}
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
                {/* Hướng dẫn nhận thưởng — dùng mã nhận thưởng riêng, không lộ Zalo công khai */}
                <div className="mt-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
                  <p className="text-xs text-yellow-600 font-semibold mb-1">📦 Người thắng: cách nhận quà</p>
                  <p className="text-xs text-gray-400">
                    Lấy mã nhận thưởng ở trên và ấn nút nhận thưởng, dùng mã nhận thưởng để đổi thưởng.
                  </p>
                </div>
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

    {/* Xem ảnh to */}
    {zoomImage && (
      <div className="modal-overlay !bg-black/90" style={{ zIndex: 60 }} onClick={() => setZoomImage(null)}>
        <img src={zoomImage} alt="" className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        <button onClick={() => setZoomImage(null)} className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white"><X size={20}/></button>
      </div>
    )}

    {/* Báo cáo sự kiện */}
    {showReport && (
      <div className="modal-overlay" style={{ zIndex: 60 }} onClick={() => setShowReport(false)}>
        <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="p-5 space-y-3">
            <h3 className="font-bold text-white flex items-center gap-2"><Flag size={16} className="text-red-400"/> Báo cáo sự kiện</h3>
            {reportSent ? (
              <>
                <p className="text-sm text-green-400">✓ Đã gửi báo cáo cho admin, cảm ơn bạn!</p>
                <button onClick={() => { setShowReport(false); setReportSent(false); setReportReason(""); }} className="btn-secondary w-full text-sm">Đóng</button>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500">Cho admin biết vì sao sự kiện này sai trái (lừa đảo, quà giả, Zalo giả...).</p>
                <textarea className="input" rows={3} placeholder="Lý do báo cáo..." value={reportReason} onChange={e => setReportReason(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => setShowReport(false)} className="btn-secondary flex-1 text-sm">Huỷ</button>
                  <button onClick={submitReport} disabled={!reportReason.trim()} className="btn-danger flex-1 text-sm">Gửi báo cáo</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Sửa sự kiện */}
    {showEdit && (
      <div className="modal-overlay" style={{ zIndex: 60 }} onClick={() => setShowEdit(false)}>
        <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
          <div className="p-5 space-y-3">
            <h3 className="font-bold text-white flex items-center gap-2"><Edit3 size={16} className="text-blue-400"/> Sửa sự kiện</h3>
            <input className="input" placeholder="Tên sự kiện" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}/>
            <textarea className="input" rows={2} placeholder="Mô tả" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}/>
            <input className="input" placeholder="Tên quà" value={editForm.reward_name} onChange={e => setEditForm({...editForm, reward_name: e.target.value})}/>
            <div>
              <label className="text-xs text-gray-500">Thưởng Coins</label>
              <input type="number" min={0} className="input" value={editForm.reward_coins} onChange={e => setEditForm({...editForm, reward_coins: Number(e.target.value) || 0})}/>
            </div>
            <input className="input" placeholder="Số Zalo/nhóm liên hệ" value={editForm.creator_zalo} onChange={e => setEditForm({...editForm, creator_zalo: e.target.value})}/>
            <div className="grid grid-cols-2 gap-2">
              <input type="datetime-local" className="input text-xs" value={editForm.start_time} onChange={e => setEditForm({...editForm, start_time: e.target.value})}/>
              <input type="datetime-local" className="input text-xs" value={editForm.end_time} onChange={e => setEditForm({...editForm, end_time: e.target.value})}/>
            </div>
            {editError && <p className="text-xs text-red-400">{editError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowEdit(false)} className="btn-secondary flex-1 text-sm">Huỷ</button>
              <button onClick={saveEdit} disabled={editSaving} className="btn-gold flex-1 text-sm">{editSaving ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </div>
        </div>
      </div>
    )}
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loadingWarTime, setLoadingWarTime] = useState(false);
  const isAdmin = !!getAdminToken();

  const [form, setForm] = useState({
    title: "", description: "", event_type: "war", condition_type: "total_stars",
    top_n: 3, reward_name: "", reward_image_url: "", reward_shop_link: "",
    reward_coins: 0,
    start_time: "", end_time: "", creator_zalo: "",
    visibility: "private" as "private" | "public",
    allowed_clan_ids: [] as number[],
  });
  const [allClans, setAllClans] = useState<any[]>([]);
  const [myCoins, setMyCoins] = useState<number | null>(null);

  useEffect(() => {
    api.getMyMemberInfo().then((me: any) => { if (me) setMyCoins(me.coins ?? 0); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAdmin) api.listClans().then(setAllClans).catch(() => {});
  }, [isAdmin]);

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
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Cần nhập tên sự kiện";
    if (!form.description.trim()) errs.description = "Cần nhập mô tả để người tham gia hiểu rõ luật chơi";
    if (!form.reward_name.trim() && form.reward_coins <= 0) errs.reward_name = "Cần có phần quà (vật phẩm) hoặc thưởng Coins";
    if (!form.start_time) errs.start_time = "Cần chọn thời gian bắt đầu";
    if (!form.end_time) errs.end_time = "Cần chọn thời gian kết thúc";
    if (form.start_time && form.end_time && new Date(form.end_time) <= new Date(form.start_time)) errs.end_time = "Thời gian kết thúc phải sau thời gian bắt đầu";
    if (!form.creator_zalo.trim()) errs.creator_zalo = "Cần có số Zalo/nhóm liên hệ để người thắng nhận thưởng";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError("Vui lòng điền đầy đủ các mục được đánh dấu đỏ bên dưới");
      return;
    }
    setSaving(true); setError("");
    try {
      await api.createEvent(form);
      setForm({ title:"", description:"", event_type:"war", condition_type:"total_stars",
        top_n:3, reward_name:"", reward_image_url:"", reward_shop_link:"",
        reward_coins:0, start_time:"", end_time:"", creator_zalo:"",
        visibility:"private", allowed_clan_ids:[] });
      setFieldErrors({});
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

      <p className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
        ⚠️ Cam kết thông tin quà thưởng và số Zalo/nhóm liên hệ là <b>thật</b>. Nghiêm cấm tạo sự kiện lừa đảo,
        để số điện thoại/nhóm giả mạo nhằm câu kéo hoặc lừa gạt thành viên khác — sự kiện vi phạm sẽ bị xoá và
        tài khoản có thể bị khoá vĩnh viễn.
      </p>

      <div>
        <input className={`input ${fieldErrors.title ? "!border-red-500" : ""}`} placeholder="Tên sự kiện"
          value={form.title} onChange={e => setForm({...form,title:e.target.value})}/>
        {fieldErrors.title && <p className="text-[11px] text-red-400 mt-1">↑ {fieldErrors.title}</p>}
      </div>
      <div>
        <textarea className={`input ${fieldErrors.description ? "!border-red-500" : ""}`} placeholder="Mô tả (thể lệ, cách tính điểm...)" rows={2}
          value={form.description} onChange={e => setForm({...form,description:e.target.value})}/>
        {fieldErrors.description && <p className="text-[11px] text-red-400 mt-1">↑ {fieldErrors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Loại sự kiện</label>
          <select className="input" value={form.event_type} onChange={e => setForm({...form,event_type:e.target.value})}>
            <option value="war">War thường</option>
            <option value="cwl">CWL / War giải</option>
            <option value="capital">Clan Capital</option>
            <option value="donate">Donate</option>
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
        <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5"><Users size={13}/> Phạm vi tham gia</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button"
            onClick={() => setForm({...form, visibility: "private", allowed_clan_ids: []})}
            className={`rounded-xl py-2 text-xs font-semibold border transition-colors ${
              form.visibility === "private" ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-400" : "border-gray-800 text-gray-400"}`}>
            🔒 Riêng clan này
          </button>
          <button type="button"
            onClick={() => setForm({...form, visibility: "public"})}
            className={`rounded-xl py-2 text-xs font-semibold border transition-colors ${
              form.visibility === "public" ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-400" : "border-gray-800 text-gray-400"}`}>
            🌐 Liên clan (Public)
          </button>
        </div>
        {form.visibility === "public" && (
          <div className="text-[11px] text-gray-500 space-y-2">
            <p>Thành viên các clan được chọn đều tham gia & nhận thưởng chung 1 bảng xếp hạng. Không chọn clan nào = mở cho <b>tất cả</b> clan.</p>
            {isAdmin && allClans.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {allClans.map(c => {
                  const checked = form.allowed_clan_ids.includes(c.id);
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setForm(f => ({...f, allowed_clan_ids:
                        checked ? f.allowed_clan_ids.filter(id => id !== c.id) : [...f.allowed_clan_ids, c.id]}))}
                      className={`px-2.5 py-1 rounded-full border text-[11px] ${
                        checked ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400" : "border-gray-800 text-gray-500"}`}>
                      {checked ? "✓ " : ""}{c.clan_name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="italic">Sẽ mở cho tất cả clan (chỉ admin mới chọn được từng clan cụ thể).</p>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5"><Clock size={13}/> Thời gian</p>
          <button type="button" onClick={useCurrentWarTime} disabled={loadingWarTime} className="text-[11px] text-yellow-500 hover:underline">
            {loadingWarTime?"Đang lấy...":"Dùng thời gian war hiện tại"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="datetime-local" className={`input text-xs ${fieldErrors.start_time ? "!border-red-500" : ""}`} value={form.start_time} onChange={e => setForm({...form,start_time:e.target.value})}/>
          <input type="datetime-local" className={`input text-xs ${fieldErrors.end_time ? "!border-red-500" : ""}`} value={form.end_time}   onChange={e => setForm({...form,end_time:e.target.value})}/>
        </div>
        {(fieldErrors.start_time || fieldErrors.end_time) && (
          <p className="text-[11px] text-red-400">↑ {fieldErrors.start_time || fieldErrors.end_time}</p>
        )}
      </div>

      <div className="pt-2 border-t border-gray-800 space-y-3">
        <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5"><Gift size={13}/> Phần quà</p>
        <input className={`input ${fieldErrors.reward_name ? "!border-red-500" : ""}`} placeholder="Tên quà (vd: Móc khoá con mực)"
          value={form.reward_name} onChange={e => setForm({...form,reward_name:e.target.value})}/>
        {fieldErrors.reward_name && <p className="text-[11px] text-red-400 -mt-2">↑ {fieldErrors.reward_name}</p>}
        <ImageUploadField value={form.reward_image_url} onChange={url => setForm({...form,reward_image_url:url})}/>
        <input className="input" placeholder="Link quà Shopee / Lazada (tuỳ chọn)"
          value={form.reward_shop_link} onChange={e => setForm({...form,reward_shop_link:e.target.value})}/>

        {/* Coin reward — kéo thanh trượt hoặc gõ số, giới hạn theo Coins đang có */}
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1"><Coins size={12}/> Thưởng Coins mỗi người thắng</span>
            {myCoins !== null && (
              <span className="text-yellow-500 font-semibold flex items-center gap-1">Bạn đang có: {myCoins.toLocaleString()} <CoinIcon size={14}/></span>
            )}
          </label>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={Math.max(myCoins ?? 1000, form.reward_coins, 100)} step={10}
              className="flex-1 accent-yellow-500"
              value={form.reward_coins}
              onChange={e => setForm({...form, reward_coins: Number(e.target.value)})} />
            <input type="number" min={0} step={10} className="input !w-24 text-center"
              value={form.reward_coins || ""} placeholder="0"
              onChange={e => setForm({...form, reward_coins: Math.max(0, Number(e.target.value) || 0)})}/>
          </div>
          {myCoins !== null && form.reward_coins > myCoins && (
            <p className="text-[11px] text-red-400 mt-1">⚠️ Bạn đang đặt thưởng ({form.reward_coins}) nhiều hơn số Coins bạn có ({myCoins}) — hãy kiếm thêm Coins trước khi trao thưởng.</p>
          )}
          <p className="text-[11px] text-gray-600 mt-1">
            Coins sẽ tự động trừ của bạn và cộng cho người thắng khi admin xác nhận trao thưởng. Đặt 0 = không thưởng Coins.
          </p>
        </div>

        <input className={`input ${fieldErrors.creator_zalo ? "!border-red-500" : ""}`} placeholder="Số Zalo/nhóm của bạn để người thắng liên hệ nhận quà"
          value={form.creator_zalo} onChange={e => setForm({...form,creator_zalo:e.target.value})}/>
        {fieldErrors.creator_zalo && <p className="text-[11px] text-red-400">↑ {fieldErrors.creator_zalo}</p>}
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
/* Lịch sử trao thưởng — sự kiện/CWL đã đóng, xem lại ai từng thắng ────── */
function CopyWinnersButton({ ev }: { ev: any }) {
  const [copied, setCopied] = useState(false);
  function copyText() {
    const lines = [`🏆 ${ev.title}`, ev.reward_name ? `🎁 ${ev.reward_name}` : null,
      ...(ev.claims || []).map((c: any) => `#${c.rank} ${c.player_name} — ${c.claimed ? "Đã nhận" : "Chưa nhận"}`)]
      .filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copyText} title="Copy danh sách top được nhận thưởng"
      className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-yellow-400 transition-colors px-2 py-1 rounded-lg hover:bg-yellow-500/10 shrink-0">
      {copied ? <><Check size={11}/> Đã copy</> : <><Copy size={11}/> Copy</>}
    </button>
  );
}

function RewardHistorySection() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRewardHistory().then(setHistory).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse bg-gray-800"/>)}</div>;
  if (history.length === 0) return (
    <div className="card text-center py-12">
      <Trophy size={40} className="mx-auto mb-3 text-yellow-500/50"/>
      <p className="text-gray-300 font-medium">Chưa có sự kiện nào đã kết thúc</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {history.map(ev => (
        <div key={ev.id} className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-white text-sm">{ev.title}</p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-gray-500">{fmtDateTime(ev.end_time)}</span>
              {ev.claims?.length > 0 && <CopyWinnersButton ev={ev}/>}
            </div>
          </div>
          {ev.reward_name && <p className="text-xs text-yellow-500 mt-0.5">🎁 {ev.reward_name}</p>}
          {ev.claims?.length > 0 ? (
            <div className="mt-2 space-y-1">
              {ev.claims.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">#{c.rank} {c.player_name}</span>
                  <span className={c.claimed ? "text-green-400" : "text-gray-500"}>
                    {c.claimed ? "✓ Đã nhận" : "Chưa nhận"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600 mt-1">Không có người thắng được ghi nhận.</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function EventsPage() {
  const [evTab, setEvTab] = useState<"active" | "history">("active");
  const [events, setEvents]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<any>(null);
  const [myJoinedIds, setMyJoinedIds] = useState<Set<number>>(new Set());
  const isAdmin = !!getAdminToken();
  const member  = getMemberAuth();
  const bannerSrc = usePageBanner("events", "/art/prince-celebration.jpg");

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
      <div className="relative rounded-2xl overflow-hidden p-7 md:p-11"
        style={{ background:"linear-gradient(135deg,rgba(244,161,48,0.18),rgba(236,72,153,0.12),rgba(139,69,19,0.15))" }}>
        <ArtBanner src={bannerSrc} opacity={0.85} objectPosition="center 30%" />
        <FireworkField bursts={4}/>
        <div className="relative flex items-center gap-4 banner-content">
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
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <CreateEventGate>
          <CreateEventForm onCreated={load}/>
        </CreateEventGate>
      </div>

      <SlidingTabs
        tabs={[{id:"active",label:"Sự kiện"},{id:"history",label:"Lịch sử"}]}
        active={evTab} onChange={(id) => setEvTab(id as any)} />

      {evTab === "history" ? (
        <RewardHistorySection/>
      ) : loading ? (
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
