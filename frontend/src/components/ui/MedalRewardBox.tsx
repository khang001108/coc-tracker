"use client";
import { useEffect, useState } from "react";
import { api, getAdminToken, getMemberAuth } from "@/lib/api";
import { Award, Lock, CheckCircle2, Sparkles, Medal, Copy, Check, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useRoleMap } from "@/lib/useRoleMap";
import { roleLabel, roleClass } from "@/lib/utils";
import { MarqueeText } from "@/components/ui/MarqueeText";
import { Portal } from "@/components/ui/Portal";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  war:          { icon: "⚔️", label: "War/CWL giỏi nhất" },
  donate:       { icon: "💎", label: "Donate nhiều nhất" },
  capital:      { icon: "🏰", label: "Kiếm Capital nhiều nhất" },
  best_attack:  { icon: "💥", label: "Tấn công anh dũng nhất" },
  best_defense: { icon: "🛡️", label: "Phòng thủ anh dũng nhất" },
  coins:        { icon: "🪙", label: "Kiếm Coins nhiều nhất" },
};

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
 * Trao thưởng huy chương CWL — tab trong trang Thống kê.
 * Trọng tâm hiển thị: AI ĐÃ ĐƯỢC TRAO THƯỞNG Ở MÙA HIỆN TẠI (theo yêu cầu),
 * phần "xác nhận trao" cho người chưa nhận nằm gọn bên dưới.
 *
 * PHÂN QUYỀN:
 *  - Xác nhận "Đã trao" → CHỈ member đăng nhập với vai trò Đồng thủ lĩnh trở
 *    lên (backend tự kiểm tra qua /api/medals/my-permission, không tin FE).
 *  - Sửa/xoá lịch sử + đổi số mùa khôi phục → CHỈ Admin (mật khẩu web).
 */
export function MedalRewardBox() {
  const confirm = useConfirm();
  const [members, setMembers] = useState<any[]>([]);
  const roleMap = useRoleMap();
  const [resetCount, setResetCount] = useState(3);
  const [resetCountInput, setResetCountInput] = useState("3");
  const [currentSeasonNumber, setCurrentSeasonNumber] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [perm, setPerm] = useState({ is_admin: false, can_award: false });
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [showAwardPanel, setShowAwardPanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [awardedCopied, setAwardedCopied] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [savingSelected, setSavingSelected] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  const isLoggedIn = !!getAdminToken() || !!getMemberAuth();

  function flashMsg(text: string, type: "error" | "success" = "error") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      const [elig, hist, permRes] = await Promise.all([
        api.getMedalEligibility(),
        api.getMedalHistory(50).catch(() => []),
        api.getMedalPermission().catch(() => ({ is_admin: false, can_award: false })),
      ]);
      setMembers(elig.members || []);
      setResetCount(elig.reset_cwl_count || 3);
      setResetCountInput(String(elig.reset_cwl_count || 3));
      setCurrentSeasonNumber(elig.current_season_number ?? null);
      setHistory(hist || []);
      setPerm(permRes);
    } catch (e: any) {
      flashMsg(e.message || "Không tải được dữ liệu — kiểm tra kết nối tới server");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const WEEKS_PRESETS = [4, 8, 12, 16, 24];
  const [weeksIdx, setWeeksIdx] = useState(1); // mặc định 8 tuần
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  useEffect(() => {
    setSuggestionsLoading(true);
    api.getMedalSuggestions(WEEKS_PRESETS[weeksIdx]).then((sug: any) => setSuggestions(sug.candidates || []))
      .catch(() => {}).finally(() => setSuggestionsLoading(false));
  }, [weeksIdx]);

  async function saveResetCount() {
    const n = parseInt(resetCountInput, 10);
    if (!n || n < 1) { flashMsg("Số lần WCL phải ≥ 1"); return; }
    try {
      await api.saveSetting("medal_reward_reset_cwl_count", String(n));
      flashMsg("Đã lưu thời gian khôi phục", "success");
      load();
    } catch (e: any) { flashMsg(e.message || "Lỗi lưu (cần đăng nhập Admin)"); }
  }

  function toggleSelect(tag: string) {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  async function handleSaveSelected() {
    if (selectedTags.size === 0) return;
    const chosen = notAwardedYet.filter(m => m.eligible && selectedTags.has(m.player_tag));
    if (!(await confirm(`Xác nhận ĐÃ trao huy chương trong game cho ${chosen.length} người đã tích? Họ sẽ bị tạm giới hạn nhận lại trong ${resetCount} mùa CWL kế tiếp.\n\n🔒 Sau khi xác nhận, CHỈ ADMIN mới sửa/xoá lại được — bạn (Đồng thủ lĩnh) sẽ không tự sửa lại được nữa.`))) return;
    setSavingSelected(true);
    let okCount = 0;
    for (const m of chosen) {
      try {
        await api.awardMedal(m.player_tag, m.player_name, noteDraft[m.player_tag] || undefined);
        okCount++;
      } catch (e: any) {
        flashMsg(e.message || `Lỗi ghi nhận cho ${m.player_name}`);
        break; // dừng lại nếu có lỗi (vd hết quyền giữa chừng) để tránh spam lỗi
      }
    }
    if (okCount > 0) {
      flashMsg(`Đã lưu trao thưởng cho ${okCount} người`, "success");
      setSelectedTags(new Set());
      setNoteDraft({});
    }
    setSavingSelected(false);
    await load();
  }

  function copyAwardedList() {
    const lines = [
      `🎖️ Đã trao thưởng huy chương CWL${currentSeasonNumber != null ? ` — Mùa ${currentSeasonNumber}` : ""}`,
      `${awardedThisSeason.length}/${members.length} thành viên`,
      ...awardedThisSeason.map(m => `- ${m.player_name} (bởi ${m.last_award?.awarded_by || "?"})`),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setAwardedCopied(true);
    setTimeout(() => setAwardedCopied(false), 1500);
  }

  async function handleDeleteHistory(id: number, name: string) {
    if (!(await confirm({ message: `Xoá lượt trao thưởng của "${name}"? Người này sẽ được xét nhận lại ngay.`, danger: true }))) return;
    try { await api.deleteMedalHistory(id); await load(); }
    catch (e: any) { flashMsg(e.message || "Lỗi xoá (cần đăng nhập Admin)"); }
  }

  const awardedThisSeason = members.filter(m => m.awarded_this_season);
  const notAwardedYet = members.filter(m => !m.awarded_this_season);
  const limitedCount = members.filter(m => !m.eligible).length;
  const maxScore = Math.max(1, ...suggestions.map(s => s.score));

  if (loading) {
    return (
      <div className="space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse"/>)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        CoC không cho biết ai đã được trao huy chương trong game — Đồng thủ lĩnh trở lên tự đánh
        dấu sau khi trao thật trong game, hệ thống tự xoay vòng công bằng cho mùa kế tiếp.
      </p>

      {/* Gợi ý tiềm năng mùa tiếp theo — đưa lên đầu cho dễ nhìn */}
      <div className="card">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <p className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sparkles size={12} className="text-yellow-400"/> Gợi ý tiềm năng mùa tiếp theo
            {currentSeasonNumber != null && <span className="badge-gold text-[9px]">Mùa {currentSeasonNumber + 1}</span>}
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setWeeksIdx(i => Math.max(0, i - 1))} disabled={weeksIdx <= 0}
              title="Xem khung thời gian ngắn hơn" className="p-1 rounded-lg border border-gray-700 text-gray-400 hover:text-yellow-400 disabled:opacity-30">
              <ChevronLeft size={14}/>
            </button>
            <span className="text-[10px] text-gray-500 w-16 text-center shrink-0">{WEEKS_PRESETS[weeksIdx]} tuần</span>
            <button onClick={() => setWeeksIdx(i => Math.min(WEEKS_PRESETS.length - 1, i + 1))} disabled={weeksIdx >= WEEKS_PRESETS.length - 1}
              title="Xem khung thời gian dài hơn" className="p-1 rounded-lg border border-gray-700 text-gray-400 hover:text-yellow-400 disabled:opacity-30">
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
        <p className="text-[10px] text-gray-600 mb-2">
          Xếp hạng CHÍNH theo <strong className="text-cyan-300">Danh vọng hiện có</strong> (thước đo toàn diện, tích luỹ
          nhiều tháng từ War/CWL/Donate/Raid/Clan Games...), cộng thêm điểm phụ từ số lần lọt Top 5 "tốt" ở Báo cáo
          tuần (War, Donate, Capital, Tấn công/Phòng thủ anh dũng, Coins) trong khung thời gian đã chọn để ưu tiên
          thêm cho ai đang lên phong độ gần đây — tính lại mới mỗi lần mở, đã loại người đang bị giới hạn và người đã rời clan.
          Bấm vào 1 người để xem vì sao được xếp hạng đó.
        </p>
        {suggestionsLoading ? (
          <div className="h-32 bg-gray-800 rounded-xl animate-pulse"/>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-3">
            Chưa có dữ liệu — Báo cáo tuần cần chạy ít nhất 1 lần (tự động mỗi thứ 2, hoặc admin bấm
            "Tạo lại ngay" ở tab Báo cáo tuần) mới có gợi ý ở đây.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              {(showAllSuggestions ? suggestions : suggestions.slice(0, 5)).map((s, i) => (
                <button key={s.player_tag} onClick={() => setSelectedCandidate(s)}
                  className="w-full flex items-center gap-2 text-left hover:brightness-110 rounded-lg px-1 py-0.5 -mx-1">
                  <span className={`text-[10px] w-4 text-right shrink-0 ${i < 5 ? "text-yellow-500 font-bold" : "text-gray-500"}`}>{i+1}</span>
                  <MarqueeText className="text-xs text-gray-200 w-20 shrink-0">{s.player_name}</MarqueeText>
                  <div className="flex-1 h-2.5 rounded-full bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-400"
                      style={{ width: `${(s.score / maxScore) * 100}%` }}/>
                  </div>
                  <span className="text-[10px] text-cyan-300 w-28 text-right shrink-0">🏵️{s.reputation || 0}{s.highlights ? ` · ${s.highlights} nổi bật` : ""}</span>
                </button>
              ))}
            </div>
            {suggestions.length > 5 && (
              <button onClick={() => setShowAllSuggestions(s => !s)} className="text-[11px] text-yellow-500 hover:underline mt-2">
                {showAllSuggestions ? "Thu gọn ▲" : `Xem tất cả ${suggestions.length} người ▼`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Ai đã được trao thưởng mùa này — trọng tâm hiển thị */}
      <div className="card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Award size={18} className="text-yellow-400"/> Đã trao thưởng mùa này
            {currentSeasonNumber != null && <span className="badge-gold text-[10px]">Mùa {currentSeasonNumber}</span>}
          </h3>
          <span className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500">{awardedThisSeason.length}/{members.length} thành viên</span>
            {awardedThisSeason.length > 0 && (
              <button onClick={copyAwardedList} title="Copy danh sách đã trao thưởng mùa này"
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-yellow-400 transition-colors">
                {awardedCopied ? <Check size={14} className="text-green-400"/> : <Copy size={14}/>}
              </button>
            )}
          </span>
        </div>
        {awardedThisSeason.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">Chưa có ai được trao huy chương ở mùa này.</p>
        ) : (
          <div className="space-y-1.5">
            {awardedThisSeason.map(m => (
              <div key={m.player_tag} className="flex items-center gap-2 bg-green-500/5 border border-green-500/15 rounded-xl px-3 py-2">
                <Medal size={14} className="text-yellow-400 shrink-0"/>
                <MarqueeText className="text-sm text-white flex-1">
                  <span>{m.player_name}</span>
                  {roleMap[m.player_tag] && <span className={`text-[9px] shrink-0 ${roleClass(roleMap[m.player_tag])}`}>{roleLabel(roleMap[m.player_tag])}</span>}
                </MarqueeText>
                <span className="text-[10px] text-gray-500 shrink-0">bởi {m.last_award?.awarded_by || "?"}</span>
              </div>
            ))}
          </div>
        )}
        {limitedCount > 0 && (
          <p className="text-[11px] text-purple-300 mt-2 flex items-center gap-1"><Lock size={10}/> {limitedCount} người đang trong thời gian giới hạn (kể cả từ các mùa trước).</p>
        )}
      </div>

      {/* Xác nhận trao cho người chưa nhận — gọn lại, mở khi cần */}
      <button onClick={() => setShowAwardPanel(true)}
        className="w-full card !p-4 flex items-center justify-between text-left hover:brightness-110">
        <span className="font-bold text-white text-sm flex items-center gap-2">
          <Medal size={16} className="text-yellow-400"/> Xác nhận trao cho người chưa nhận mùa này
        </span>
        <span className="text-xs text-gray-400 shrink-0">{awardedThisSeason.length}/{members.length} đã trao</span>
      </button>

      {showAwardPanel && (
        <Portal>
          <div className="modal-overlay" onClick={() => setShowAwardPanel(false)}>
            <div className="relative w-full max-w-lg mx-4 my-4 overflow-y-auto rounded-2xl p-4 space-y-3"
              style={{ background: "var(--py-card-bg, linear-gradient(180deg,#241640,#1A0F2E))", maxHeight: "calc(100dvh - 120px)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">Xác nhận trao cho người chưa nhận mùa này ({notAwardedYet.length})</h3>
                <button onClick={() => setShowAwardPanel(false)} className="text-gray-400 text-sm">✕</button>
              </div>
              <div className="space-y-3">
                {perm.is_admin && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 shrink-0">Khôi phục sau (mùa CWL thật):</label>
                    <input type="number" min={1} value={resetCountInput} onChange={e => setResetCountInput(e.target.value)}
                      className="input !py-1 !px-2 w-16 text-sm"/>
                    <button onClick={saveResetCount} className="btn-secondary text-xs px-2 py-1">Lưu</button>
                  </div>
                )}
                {!perm.is_admin && perm.can_award && awardedThisSeason.length > 0 && (
                  <p className="text-[11px] text-purple-300 bg-purple-500/5 border border-purple-500/15 rounded-lg px-2.5 py-1.5">
                    🔒 Mùa này đã có người được xác nhận trao — để tránh trùng/nhầm, danh sách bên dưới giờ chỉ xem được. Cần Admin để trao thêm.
                  </p>
                )}
                <div className="space-y-1.5">
                  {notAwardedYet.map(m => {
                    const canCheckThis = perm.is_admin || (perm.can_award && awardedThisSeason.length === 0);
                    return (
                    <div key={m.player_tag} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${m.eligible ? "bg-gray-800/50" : "bg-purple-500/5 border border-purple-500/15 opacity-70"}`}>
                      {m.eligible ? (
                        canCheckThis ? (
                          <input type="checkbox" checked={selectedTags.has(m.player_tag)}
                            onChange={() => toggleSelect(m.player_tag)}
                            className="w-4 h-4 rounded accent-yellow-500 shrink-0"/>
                        ) : (
                          <CheckCircle2 size={12} className="text-gray-600 shrink-0"/>
                        )
                      ) : (
                        <Lock size={12} className="text-purple-300 shrink-0"/>
                      )}
                      <MarqueeText className="text-sm text-white flex-1">
                        <span>{m.player_name}</span>
                        {roleMap[m.player_tag] && <span className={`text-[9px] shrink-0 ${roleClass(roleMap[m.player_tag])}`}>{roleLabel(roleMap[m.player_tag])}</span>}
                      </MarqueeText>
                      {!m.eligible && <span className="text-[10px] text-purple-300 shrink-0">Còn {m.remaining_seasons} mùa</span>}
                      {m.eligible && canCheckThis && (
                        <input placeholder="Ghi chú" value={noteDraft[m.player_tag] || ""}
                          onChange={e => setNoteDraft(d => ({ ...d, [m.player_tag]: e.target.value }))}
                          className="input !py-1 !px-2 text-xs w-24 shrink-0"/>
                      )}
                    </div>
                  );})}
                </div>
                {(perm.is_admin || (perm.can_award && awardedThisSeason.length === 0)) && notAwardedYet.some(m => m.eligible) && (
                  <>
                    <p className="text-[11px] text-purple-300">🔒 Sau khi bấm Lưu, chỉ Admin mới sửa/xoá lại được — kiểm tra kỹ danh sách đã tích trước khi xác nhận.</p>
                    <button onClick={handleSaveSelected} disabled={selectedTags.size === 0 || savingSelected}
                      className="btn-gold w-full text-sm disabled:opacity-40">
                      {savingSelected ? "Đang lưu..." : `Lưu (${selectedTags.size} đã tích)`}
                    </button>
                  </>
                )}
                {!perm.is_admin && perm.can_award && awardedThisSeason.length > 0 && (
                  <p className="text-[11px] text-gray-600">Cần Admin đăng nhập để trao thêm cho mùa này.</p>
                )}
                {!perm.can_award && isLoggedIn && (
                  <p className="text-[11px] text-gray-600">Chỉ Đồng thủ lĩnh trở lên mới xác nhận trao thưởng được.</p>
                )}
                {!isLoggedIn && (
                  <p className="text-[11px] text-gray-600">Đăng nhập bằng tài khoản Đồng thủ lĩnh trở lên để xác nhận trao thưởng.</p>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {selectedCandidate && (
        <Portal>
          <div className="modal-overlay" onClick={() => setSelectedCandidate(null)}>
            <div className="relative w-full max-w-md mx-4 my-4 overflow-y-auto rounded-2xl p-4 space-y-3"
              style={{ background: "var(--py-card-bg, linear-gradient(180deg,#241640,#1A0F2E))", maxHeight: "calc(100dvh - 120px)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Sparkles size={14} className="text-yellow-400"/> {selectedCandidate.player_name}
                </h3>
                <button onClick={() => setSelectedCandidate(null)} className="text-gray-400 text-sm">✕</button>
              </div>
              <div className="flex items-center gap-3 bg-gray-800/50 rounded-xl px-3 py-2 flex-wrap">
                <span className="text-sm text-white">🏵️ Danh vọng: <strong className="text-cyan-300">{selectedCandidate.reputation ?? 0}</strong> <span className="text-[10px] text-gray-500">(căn cứ chính)</span></span>
                <span className="text-sm text-gray-400">+{selectedCandidate.weekly_score ?? 0} <span className="text-[10px]">điểm phụ từ Báo cáo tuần</span></span>
                <span className="text-xs text-gray-600">= <strong className="text-yellow-400">{selectedCandidate.score}</strong> điểm gợi ý</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1.5">Vì sao được xếp hạng này</p>
                {Object.keys(selectedCandidate.category_counts || {}).length === 0 ? (
                  <p className="text-xs text-gray-600">Chưa từng lọt Top 5 tuần nào — điểm đến từ Danh vọng hiện có.</p>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(selectedCandidate.category_counts || {}).map(([cat, count]: [string, any]) => (
                      <div key={cat} className="flex items-center justify-between text-xs bg-gray-800/40 rounded-lg px-2.5 py-1.5">
                        <span className="text-gray-300">{CATEGORY_META[cat]?.icon || "📊"} {CATEGORY_META[cat]?.label || cat}</span>
                        <span className="text-yellow-400 font-semibold shrink-0">{count} lần</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedCandidate.weeks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5 mt-2">Chi tiết từng tuần</p>
                  <div className="space-y-1">
                    {selectedCandidate.weeks.slice(0, 10).map((w: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-gray-800/30 rounded-lg px-2.5 py-1.5">
                        <span className="text-gray-400">{CATEGORY_META[w.category]?.icon} {CATEGORY_META[w.category]?.label || w.category} — hạng {w.rank}</span>
                        <span className="text-gray-500 shrink-0">{w.value || ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}

      {/* Lịch sử — chỉ Admin xoá được */}
      <button onClick={() => setShowHistory(true)}
        className="w-full card !p-4 flex items-center justify-between text-left hover:brightness-110">
        <span className="font-bold text-white text-sm flex items-center gap-2">
          <Clock size={16} className="text-gray-400"/> Lịch sử trao thưởng
        </span>
        <span className="text-xs text-gray-400 shrink-0">{history.length} lượt</span>
      </button>

      {showHistory && (
        <Portal>
          <div className="modal-overlay" onClick={() => setShowHistory(false)}>
            <div className="relative w-full max-w-lg mx-4 my-4 overflow-y-auto rounded-2xl p-4 space-y-3"
              style={{ background: "var(--py-card-bg, linear-gradient(180deg,#241640,#1A0F2E))", maxHeight: "calc(100dvh - 120px)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2"><Clock size={15} className="text-gray-400"/> Lịch sử trao thưởng tất cả các mùa</h3>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 text-sm">✕</button>
              </div>
              <div className="space-y-1.5">
                {history.length === 0 && <p className="text-xs text-gray-600">Chưa có lượt trao thưởng nào.</p>}
                {history.map(h => (
                  <div key={h.id} className="flex items-center gap-2 bg-gray-800/40 rounded-xl px-3 py-1.5 text-xs">
                    <MarqueeText className="text-white flex-1">{h.player_name}</MarqueeText>
                    <span className="text-gray-500 shrink-0">Mùa {h.season_number ?? "?"}</span>
                    <span className="text-gray-600 shrink-0">{new Date(h.created_at).toLocaleDateString("vi-VN")}</span>
                    {perm.is_admin && (
                      <button onClick={() => handleDeleteHistory(h.id, h.player_name)} className="text-red-400 hover:underline shrink-0">Xoá</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {msg && <MiniToast msg={msg.text} type={msg.type} />}
    </div>
  );
}
