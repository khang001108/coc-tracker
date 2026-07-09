"use client";
import { useEffect, useState } from "react";
import { api, getAdminToken, getMemberAuth } from "@/lib/api";
import { Award, Lock, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";

function MiniToast({ msg, type = "error" }: { msg: string; type?: "error" | "success" }) {
  if (!msg) return null;
  return (
    <p className={`text-xs px-2.5 py-1.5 rounded-lg border ${
      type === "error"
        ? "text-red-400 bg-red-500/10 border-red-500/20"
        : "text-green-400 bg-green-500/10 border-green-500/20"}`}>
      {msg}
    </p>
  );
}

/**
 * Trao thưởng huy chương CWL — box ở trang Tổng quan (chuyển từ Cài đặt sang
 * theo yêu cầu, để ai cũng thấy trạng thái mùa này ngay khi mở web).
 *
 * PHÂN QUYỀN:
 *  - Xác nhận "Đã trao" → CHỈ member đăng nhập với vai trò Đồng thủ lĩnh trở
 *    lên (backend tự kiểm tra qua /api/medals/my-permission, không tin FE).
 *  - Sửa/xoá lịch sử + đổi số mùa khôi phục → CHỈ Admin (mật khẩu web).
 */
export function MedalRewardBox() {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [resetCount, setResetCount] = useState(3);
  const [resetCountInput, setResetCountInput] = useState("3");
  const [currentSeason, setCurrentSeason] = useState<string | null>(null);
  const [awardedThisSeason, setAwardedThisSeason] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [perm, setPerm] = useState({ is_admin: false, can_award: false });
  const [busyTag, setBusyTag] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const isLoggedIn = !!getAdminToken() || !!getMemberAuth();

  function flashMsg(text: string, type: "error" | "success" = "error") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      const [elig, hist, sug, permRes] = await Promise.all([
        api.getMedalEligibility(),
        api.getMedalHistory(50).catch(() => []),
        api.getMedalSuggestions(8).catch(() => ({ candidates: [] })),
        api.getMedalPermission().catch(() => ({ is_admin: false, can_award: false })),
      ]);
      setMembers(elig.members || []);
      setResetCount(elig.reset_cwl_count || 3);
      setResetCountInput(String(elig.reset_cwl_count || 3));
      setCurrentSeason(elig.current_season || null);
      setAwardedThisSeason(elig.awarded_this_season || 0);
      setHistory(hist || []);
      setSuggestions(sug.candidates || []);
      setPerm(permRes);
    } catch {} finally { setLoading(false); }
  }
  useEffect(() => { if (open) load(); }, [open]);

  async function saveResetCount() {
    const n = parseInt(resetCountInput, 10);
    if (!n || n < 1) { flashMsg("Số lần WCL phải ≥ 1"); return; }
    try {
      await api.saveSetting("medal_reward_reset_cwl_count", String(n));
      flashMsg("Đã lưu thời gian khôi phục", "success");
      load();
    } catch (e: any) { flashMsg(e.message || "Lỗi lưu (cần đăng nhập Admin)"); }
  }

  async function handleAward(m: any) {
    if (!confirm(`Xác nhận ĐÃ trao huy chương trong game cho "${m.player_name}"? Người này sẽ bị tạm giới hạn nhận lại trong ${resetCount} mùa CWL kế tiếp.`)) return;
    setBusyTag(m.player_tag);
    try {
      await api.awardMedal(m.player_tag, m.player_name, noteDraft[m.player_tag] || undefined);
      flashMsg(`Đã ghi nhận trao huy chương cho ${m.player_name}`, "success");
      setNoteDraft(d => ({ ...d, [m.player_tag]: "" }));
      await load();
    } catch (e: any) { flashMsg(e.message || "Lỗi ghi nhận (cần đăng nhập Đồng thủ lĩnh trở lên)"); }
    finally { setBusyTag(null); }
  }

  async function handleDeleteHistory(id: number, name: string) {
    if (!confirm(`Xoá lượt trao thưởng của "${name}"? Người này sẽ được xét nhận lại ngay.`)) return;
    try { await api.deleteMedalHistory(id); await load(); }
    catch (e: any) { flashMsg(e.message || "Lỗi xoá (cần đăng nhập Admin)"); }
  }

  const limited = members.filter(m => !m.eligible);
  const eligible = members.filter(m => m.eligible);
  const maxScore = Math.max(1, ...suggestions.map(s => s.score));

  return (
    <div className="card !p-0 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
        <span className="font-bold text-white flex items-center gap-2">
          <Award size={18} className="text-yellow-400" /> Trao thưởng huy chương CWL
          {currentSeason && <span className="badge-gold text-[10px]">Mùa {currentSeason}</span>}
          {limited.length > 0 && <span className="badge-purple text-[10px]">{limited.length} đang giới hạn</span>}
        </span>
        <span className="text-xs text-gray-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-800/60 pt-4">
          <p className="text-xs text-gray-500">
            CoC không cho biết ai đã được trao huy chương trong game — Đồng thủ lĩnh trở lên tự đánh
            dấu sau khi trao thật trong game, hệ thống tự xoay vòng công bằng cho mùa kế tiếp.
          </p>

          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse"/>)}
            </div>
          ) : (
            <>
              {/* Thống kê nhanh */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-green-500/5 border border-green-500/15 text-center py-2.5">
                  <p className="text-xl font-bold text-green-400">{awardedThisSeason}</p>
                  <p className="text-[10px] text-gray-400">Đã thưởng mùa này</p>
                </div>
                <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 text-center py-2.5">
                  <p className="text-xl font-bold text-blue-400">{eligible.length}</p>
                  <p className="text-[10px] text-gray-400">Đủ điều kiện</p>
                </div>
                <div className="rounded-xl bg-purple-500/5 border border-purple-500/15 text-center py-2.5">
                  <p className="text-xl font-bold text-purple-400">{limited.length}</p>
                  <p className="text-[10px] text-gray-400">Đang giới hạn</p>
                </div>
              </div>

              {/* Chỉ Admin mới sửa được số mùa khôi phục */}
              {perm.is_admin && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 shrink-0">Khôi phục sau (mùa CWL thật):</label>
                  <input type="number" min={1} value={resetCountInput} onChange={e => setResetCountInput(e.target.value)}
                    className="input !py-1 !px-2 w-16 text-sm"/>
                  <button onClick={saveResetCount} className="btn-secondary text-xs px-2 py-1">Lưu</button>
                </div>
              )}

              {/* Danh sách trạng thái từng người */}
              <div className="space-y-1.5">
                {limited.map(m => (
                  <div key={m.player_tag} className="flex items-center gap-2 bg-purple-500/5 border border-purple-500/15 rounded-xl px-3 py-2 opacity-70">
                    <Lock size={12} className="text-purple-300 shrink-0"/>
                    <span className="text-sm text-white flex-1 truncate">{m.player_name}</span>
                    {m.awarded_this_season && <span className="text-[10px] text-green-400 shrink-0">✓ Mùa này</span>}
                    <span className="text-[10px] text-purple-300 shrink-0">Còn {m.remaining_seasons} mùa</span>
                  </div>
                ))}
                {eligible.map(m => (
                  <div key={m.player_tag} className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2">
                    <CheckCircle2 size={12} className="text-green-400 shrink-0"/>
                    <span className="text-sm text-white flex-1 truncate">{m.player_name}</span>
                    {perm.can_award && (
                      <>
                        <input placeholder="Ghi chú" value={noteDraft[m.player_tag] || ""}
                          onChange={e => setNoteDraft(d => ({ ...d, [m.player_tag]: e.target.value }))}
                          className="input !py-1 !px-2 text-xs w-24 shrink-0"/>
                        <button onClick={() => handleAward(m)} disabled={busyTag === m.player_tag}
                          className="btn-gold text-[11px] px-2 py-1 shrink-0">
                          {busyTag === m.player_tag ? "..." : "Đã trao"}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {!perm.can_award && isLoggedIn && (
                <p className="text-[11px] text-gray-600">Chỉ Đồng thủ lĩnh trở lên mới xác nhận trao thưởng được.</p>
              )}
              {!isLoggedIn && (
                <p className="text-[11px] text-gray-600">Đăng nhập bằng tài khoản Đồng thủ lĩnh trở lên để xác nhận trao thưởng.</p>
              )}

              {/* Gợi ý tiềm năng mùa sau */}
              {suggestions.length > 0 && (
                <div className="pt-2 border-t border-gray-800/60">
                  <p className="text-xs font-semibold text-white flex items-center gap-1.5 mb-2">
                    <Sparkles size={12} className="text-yellow-400"/> Gợi ý tiềm năng mùa sau
                  </p>
                  <p className="text-[10px] text-gray-600 mb-2">
                    Tính từ số lần lọt Top 5 "tốt" ở Báo cáo tuần (War, Donate, Capital, Tấn công/Phòng
                    thủ anh dũng, Coins) trong 8 tuần gần nhất — đã loại người đang bị giới hạn.
                  </p>
                  <div className="space-y-1.5">
                    {suggestions.slice(0, 6).map((s, i) => (
                      <div key={s.player_tag} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-4 text-right shrink-0">{i+1}</span>
                        <span className="text-xs text-gray-200 w-20 truncate shrink-0">{s.player_name}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-gray-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-400"
                            style={{ width: `${(s.score / maxScore) * 100}%` }}/>
                        </div>
                        <span className="text-[10px] text-yellow-400 w-16 text-right shrink-0">{s.highlights} lần nổi bật</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lịch sử — chỉ Admin xoá được */}
              <button onClick={() => setShowHistory(s => !s)} className="text-xs text-gray-500 hover:text-yellow-400">
                {showHistory ? "Ẩn lịch sử ▲" : `Xem lịch sử (${history.length}) ▼`}
              </button>
              {showHistory && (
                <div className="space-y-1.5">
                  {history.length === 0 && <p className="text-xs text-gray-600">Chưa có lượt trao thưởng nào.</p>}
                  {history.map(h => (
                    <div key={h.id} className="flex items-center gap-2 bg-gray-800/40 rounded-xl px-3 py-1.5 text-xs">
                      <span className="text-white flex-1 truncate">{h.player_name}</span>
                      <span className="text-gray-500 shrink-0">Mùa {h.season}</span>
                      <span className="text-gray-600 shrink-0">{new Date(h.created_at).toLocaleDateString("vi-VN")}</span>
                      {perm.is_admin && (
                        <button onClick={() => handleDeleteHistory(h.id, h.player_name)} className="text-red-400 hover:underline shrink-0">Xoá</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {msg && <div className="px-4 pb-3"><MiniToast msg={msg.text} type={msg.type} /></div>}
    </div>
  );
}
