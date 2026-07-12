"use client";
import { useEffect, useState } from "react";
import { api, getAdminToken, getMemberAuth } from "@/lib/api";
import { Award, Lock, CheckCircle2, Sparkles, Medal, Copy, Check } from "lucide-react";
import { useRoleMap } from "@/lib/useRoleMap";
import { roleLabel, roleClass } from "@/lib/utils";
import { MarqueeText } from "@/components/ui/MarqueeText";

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
      setCurrentSeasonNumber(elig.current_season_number ?? null);
      setHistory(hist || []);
      setSuggestions(sug.candidates || []);
      setPerm(permRes);
    } catch (e: any) {
      flashMsg(e.message || "Không tải được dữ liệu — kiểm tra kết nối tới server");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

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
    if (!confirm(`Xác nhận ĐÃ trao huy chương trong game cho ${chosen.length} người đã tích? Họ sẽ bị tạm giới hạn nhận lại trong ${resetCount} mùa CWL kế tiếp.`)) return;
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
    if (!confirm(`Xoá lượt trao thưởng của "${name}"? Người này sẽ được xét nhận lại ngay.`)) return;
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
      <div className="card !p-0">
        <button onClick={() => setShowAwardPanel(s => !s)}
          className="w-full flex items-center justify-between p-4 text-left">
          <span className="font-bold text-white text-sm">Xác nhận trao cho người chưa nhận mùa này ({notAwardedYet.length})</span>
          <span className="text-xs text-gray-500">{showAwardPanel ? "▲" : "▼"}</span>
        </button>
        {showAwardPanel && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-800/60 pt-3">
            {perm.is_admin && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 shrink-0">Khôi phục sau (mùa CWL thật):</label>
                <input type="number" min={1} value={resetCountInput} onChange={e => setResetCountInput(e.target.value)}
                  className="input !py-1 !px-2 w-16 text-sm"/>
                <button onClick={saveResetCount} className="btn-secondary text-xs px-2 py-1">Lưu</button>
              </div>
            )}
            <div className="space-y-1.5">
              {notAwardedYet.map(m => (
                <div key={m.player_tag} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${m.eligible ? "bg-gray-800/50" : "bg-purple-500/5 border border-purple-500/15 opacity-70"}`}>
                  {m.eligible ? (
                    perm.can_award ? (
                      <input type="checkbox" checked={selectedTags.has(m.player_tag)}
                        onChange={() => toggleSelect(m.player_tag)}
                        className="w-4 h-4 rounded accent-yellow-500 shrink-0"/>
                    ) : (
                      <CheckCircle2 size={12} className="text-green-400 shrink-0"/>
                    )
                  ) : (
                    <Lock size={12} className="text-purple-300 shrink-0"/>
                  )}
                  <MarqueeText className="text-sm text-white flex-1">
                    <span>{m.player_name}</span>
                    {roleMap[m.player_tag] && <span className={`text-[9px] shrink-0 ${roleClass(roleMap[m.player_tag])}`}>{roleLabel(roleMap[m.player_tag])}</span>}
                  </MarqueeText>
                  {!m.eligible && <span className="text-[10px] text-purple-300 shrink-0">Còn {m.remaining_seasons} mùa</span>}
                  {m.eligible && perm.can_award && (
                    <input placeholder="Ghi chú" value={noteDraft[m.player_tag] || ""}
                      onChange={e => setNoteDraft(d => ({ ...d, [m.player_tag]: e.target.value }))}
                      className="input !py-1 !px-2 text-xs w-24 shrink-0"/>
                  )}
                </div>
              ))}
            </div>
            {perm.can_award && notAwardedYet.some(m => m.eligible) && (
              <button onClick={handleSaveSelected} disabled={selectedTags.size === 0 || savingSelected}
                className="btn-gold w-full text-sm disabled:opacity-40">
                {savingSelected ? "Đang lưu..." : `Lưu (${selectedTags.size} đã tích)`}
              </button>
            )}
            {!perm.can_award && isLoggedIn && (
              <p className="text-[11px] text-gray-600">Chỉ Đồng thủ lĩnh trở lên mới xác nhận trao thưởng được.</p>
            )}
            {!isLoggedIn && (
              <p className="text-[11px] text-gray-600">Đăng nhập bằng tài khoản Đồng thủ lĩnh trở lên để xác nhận trao thưởng.</p>
            )}
          </div>
        )}
      </div>

      {/* Gợi ý tiềm năng mùa sau */}
      <div className="card">
        <p className="text-xs font-semibold text-white flex items-center gap-1.5 mb-2">
          <Sparkles size={12} className="text-yellow-400"/> Gợi ý tiềm năng mùa sau
        </p>
        <p className="text-[10px] text-gray-600 mb-2">
          Tính từ số lần lọt Top 5 "tốt" ở Báo cáo tuần (War, Donate, Capital, Tấn công/Phòng
          thủ anh dũng, Coins) trong 8 tuần gần nhất, CỘNG THÊM Danh vọng hiện có (Danh vọng càng
          cao càng được ưu tiên) — đã loại người đang bị giới hạn.
        </p>
        {suggestions.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-3">
            Chưa có dữ liệu — Báo cáo tuần cần chạy ít nhất 1 lần (tự động mỗi thứ 2, hoặc admin bấm
            "Tạo lại ngay" ở tab Báo cáo tuần) mới có gợi ý ở đây.
          </p>
        ) : (
          <div className="space-y-1.5">
            {suggestions.slice(0, 6).map((s, i) => (
              <div key={s.player_tag} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 w-4 text-right shrink-0">{i+1}</span>
                <MarqueeText className="text-xs text-gray-200 w-20 shrink-0">{s.player_name}</MarqueeText>
                <div className="flex-1 h-2.5 rounded-full bg-gray-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-400"
                    style={{ width: `${(s.score / maxScore) * 100}%` }}/>
                </div>
                <span className="text-[10px] text-yellow-400 w-24 text-right shrink-0">{s.highlights} nổi bật{s.reputation ? ` · 🏵️${s.reputation}` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lịch sử — chỉ Admin xoá được */}
      <div className="card">
        <button onClick={() => setShowHistory(s => !s)} className="text-xs text-gray-500 hover:text-yellow-400">
          {showHistory ? "Ẩn lịch sử ▲" : `Xem lịch sử tất cả các mùa (${history.length}) ▼`}
        </button>
        {showHistory && (
          <div className="space-y-1.5 mt-3">
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
        )}
      </div>

      {msg && <MiniToast msg={msg.text} type={msg.type} />}
    </div>
  );
}
