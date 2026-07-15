"use client";
import { useEffect, useState } from "react";
import { api, getAdminToken } from "@/lib/api";
import { Portal } from "@/components/ui/Portal";
import { OrnateFrame } from "@/components/ui/OrnateFrame";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { roleLabel, roleClass, thColor } from "@/lib/utils";
import {
  RULE_TARGET_LABELS, RULE_TARGET_IS_AND, conditionSentence, checkCondition, HISTORY_ACTION_LABELS,
  type RuleTarget,
} from "@/lib/ruleConstants";
import { Scale, Star, Crown, TrendingDown, AlertTriangle, Check, X, Search, ChevronRight, Trash2, Loader2 } from "lucide-react";

type ListKey = RuleTarget;
type EvalResult = Record<ListKey, any[]> & { all_members: any[] };
type TopTab = "lookup" | "merit" | "sanction" | "expulsion" | "history";

const LIST_META: Record<ListKey, { label: string; icon: any; color: string; empty: string; historyAction: string }> = {
  elder:             { label: "Đủ điều kiện lên Huynh trưởng",           icon: Star,          color: "text-blue-400",   empty: "Chưa có ai đủ điều kiện.",     historyAction: "promote_elder" },
  co_leader:         { label: "Đủ điều kiện lên Đồng thủ lĩnh",          icon: Crown,         color: "text-purple-400", empty: "Chưa có ai đủ điều kiện.",     historyAction: "promote_co_leader" },
  demote_co_leader:  { label: "Đề xuất hạ Đồng thủ lĩnh → Huynh trưởng", icon: TrendingDown,  color: "text-orange-400", empty: "Không có ai trong diện này.",  historyAction: "demote_co_leader" },
  demote_elder:      { label: "Đề xuất hạ Huynh trưởng → Thành viên",    icon: TrendingDown,  color: "text-orange-400", empty: "Không có ai trong diện này.",  historyAction: "demote_elder" },
  violation:         { label: "Có nguy cơ bị loại khỏi clan",            icon: AlertTriangle, color: "text-red-400",    empty: "Không có ai vi phạm nội quy.", historyAction: "expel" },
};

// 3 pill-tab gộp — mỗi tab gồm 1-2 nhóm điều kiện con để bố cục gọn hơn
// (trước đây mỗi nhóm 1 tab riêng, quá nhiều tab).
const TOP_TAB_META: Record<Exclude<TopTab, "lookup" | "history">, { label: string; keys: ListKey[] }> = {
  merit:     { label: "🏅 Công trạng", keys: ["elder", "co_leader"] },
  sanction:  { label: "⚖️ Chế tài",    keys: ["demote_co_leader", "demote_elder"] },
  expulsion: { label: "🚫 Khai trừ",   keys: ["violation"] },
};

function statLine(m: any): string {
  const parts = [
    `Donate ${m.donate}`,
    `War ${m.war_attendance ?? "—"}%`,
    `Danh vọng ${m.reputation}`,
    `Capital ${m.capital}`,
    `Cúp ${m.cup}`,
  ];
  return parts.join(" · ");
}

function MemberActionRow({ m, isAdmin, historyAction, onLogged }: { m: any; isAdmin: boolean; historyAction: string; onLogged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function markProcessed() {
    setBusy(true);
    try {
      await api.addRuleHistory({ action: historyAction, player_tag: m.tag, player_name: m.name });
      setDone(true);
      onLogged();
    } catch {} finally { setBusy(false); }
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-lg"
      style={{ background: "var(--py-card-bg)", border: "1px solid var(--py-card-border)" }}>
      <div className="min-w-0">
        <p className="font-semibold truncate" style={{ color: "var(--py-card-text)" }}>
          {m.name} <span className="text-gray-500 font-normal">#{(m.tag || "").replace("#", "")}</span>
        </p>
        <p className="text-gray-500 mt-0.5">{statLine(m)}</p>
      </div>
      {isAdmin && (
        <button onClick={markProcessed} disabled={busy || done}
          className="btn-secondary !py-1 !px-2 text-[11px] shrink-0 flex items-center gap-1 disabled:opacity-60">
          {done ? <><Check size={11} /> Đã ghi</> : busy ? "Đang lưu..." : "Đánh dấu đã xử lý"}
        </button>
      )}
    </div>
  );
}

/** Danh sách thành viên cho 1 nhóm điều kiện (elder/co_leader/...) — dùng lại
 * trong cả tab "Công trạng"/"Chế tài"/"Khai trừ" (mỗi tab có 1-2 nhóm con). */
function ListGroup({ listKey, members, isAdmin, onLogged }: { listKey: ListKey; members: any[]; isAdmin: boolean; onLogged: () => void }) {
  const meta = LIST_META[listKey];
  const Icon = meta.icon;
  return (
    <div className="space-y-1.5">
      <p className={`text-xs font-semibold flex items-center gap-1.5 ${meta.color}`}><Icon size={13} /> {meta.label}</p>
      {members.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">{meta.empty}</p>
      ) : (
        <div className="space-y-1.5">
          {members.map(m => (
            <MemberActionRow key={m.tag} m={m} isAdmin={isAdmin} historyAction={meta.historyAction} onLogged={onLogged} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Điều kiện chi tiết — nút mở popup nổi thay vì chiếm chỗ ngay trên trang. */
function RuleArticlesButton({ conditions }: { conditions: any[] }) {
  const [open, setOpen] = useState(false);
  const byTarget: Record<string, any[]> = {};
  conditions.forEach(c => { (byTarget[c.target] ||= []).push(c); });
  const targets = Object.keys(RULE_TARGET_LABELS) as RuleTarget[];

  if (conditions.length === 0) return null;

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="card w-full flex items-center justify-between !py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
        <span className="font-bold text-white flex items-center gap-2">
          <Scale size={16} className="text-yellow-400" /> Điều kiện chi tiết
        </span>
        <ChevronRight size={16} className="text-gray-500" />
      </button>

      {open && (
        <Portal>
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Scale size={16} className="text-yellow-400" /> Điều kiện chi tiết
                  </h3>
                  <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {targets.map(t => {
                    const list = byTarget[t];
                    if (!list?.length) return null;
                    return (
                      <div key={t} className="space-y-1.5">
                        <p className="text-xs font-semibold text-gray-400">
                          {RULE_TARGET_LABELS[t]} — {RULE_TARGET_IS_AND[t] ? "phải đạt HẾT các điều kiện sau" : "chỉ cần dính 1 điều kiện sau"}
                        </p>
                        <ul className="space-y-1 pl-1">
                          {list.map(c => (
                            <li key={c.id} className="text-sm flex gap-2" style={{ color: "var(--py-card-text)" }}>
                              <span className="text-yellow-500">–</span>
                              <span>{conditionSentence(c)}{c.note && <span className="text-gray-500"> — {c.note}</span>}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

function HistorySection({ history, isAdmin, onChanged }: { history: any[]; isAdmin: boolean; onChanged: () => void }) {
  const confirm = useConfirm();

  async function del(id: number) {
    if (!(await confirm({ message: "Xoá dòng lịch sử này?", danger: true }))) return;
    await api.deleteRuleHistory(id);
    onChanged();
  }

  if (history.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-6">Chưa có lịch sử xử lý nào.</p>;
  }

  return (
    <div className="space-y-1.5">
      {history.map(h => {
        const meta = HISTORY_ACTION_LABELS[h.action] || { label: h.action, color: "text-gray-400" };
        return (
          <div key={h.id} className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-lg"
            style={{ background: "var(--py-card-bg)", border: "1px solid var(--py-card-border)" }}>
            <div className="min-w-0">
              <p className="font-semibold truncate" style={{ color: "var(--py-card-text)" }}>
                {h.player_name} <span className="text-gray-500 font-normal">#{(h.player_tag || "").replace("#", "")}</span>
              </p>
              <p className={`mt-0.5 font-medium ${meta.color}`}>
                {meta.label} · {new Date(h.created_at).toLocaleDateString("vi-VN")}
                {h.note && <span className="text-gray-500 font-normal"> — {h.note}</span>}
              </p>
            </div>
            {isAdmin && (
              <button onClick={() => del(h.id)} className="text-gray-500 hover:text-red-400 shrink-0"><Trash2 size={13} /></button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Popup nổi khi bấm 1 thành viên trong Tra cứu — đối chiếu ngay với TẤT CẢ
 * điều kiện đã cấu hình (kể cả nhóm không áp dụng vai trò hiện tại của họ,
 * để tiện xem trước cần đạt gì nếu muốn lên/giữ chức). */
function MemberRuleModal({ member, conditions, onClose }: { member: any; conditions: any[]; onClose: () => void }) {
  const byTarget: Record<string, any[]> = {};
  conditions.forEach(c => { (byTarget[c.target] ||= []).push(c); });
  const targets = Object.keys(RULE_TARGET_LABELS) as RuleTarget[];

  return (
    <Portal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="th-badge" style={{ color: thColor(member.townHallLevel), background: thColor(member.townHallLevel) + "22", borderColor: thColor(member.townHallLevel) + "44" }}>
                {member.townHallLevel ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate">{member.name}</h3>
                <p className={`text-xs ${roleClass(member.role)}`}>{roleLabel(member.role)} · #{(member.tag || "").replace("#", "")}</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white shrink-0"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500">{statLine(member)}</p>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pt-1">
              {targets.every(t => !byTarget[t]?.length) && (
                <p className="text-sm text-gray-500">Chưa cấu hình điều kiện nào để đối chiếu.</p>
              )}
              {targets.map(t => {
                const list = byTarget[t];
                if (!list?.length) return null;
                const results = list.map(c => ({ cond: c, pass: checkCondition(c, member) }));
                const overall = RULE_TARGET_IS_AND[t] ? results.every(r => r.pass) : results.some(r => r.pass);
                return (
                  <div key={t} className="space-y-1.5 pt-2 border-t border-gray-800">
                    <p className={`text-xs font-semibold flex items-center gap-1.5 ${overall ? "text-green-400" : "text-gray-500"}`}>
                      {overall ? <Check size={13} /> : <X size={13} />} {RULE_TARGET_LABELS[t]}
                    </p>
                    <ul className="space-y-1 pl-1">
                      {results.map(({ cond, pass }) => (
                        <li key={cond.id} className="text-sm flex items-center gap-2">
                          {pass ? <Check size={13} className="text-green-400 shrink-0" /> : <X size={13} className="text-red-400 shrink-0" />}
                          <span style={{ color: "var(--py-card-text)" }}>
                            {conditionSentence(cond)}
                            <span className="text-gray-500"> — hiện tại: {member[cond.metric] ?? "—"}{cond.metric === "war_attendance" ? "%" : ""}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/** Tra cứu — danh sách thành viên kiểu giống trang Thành viên (Danh sách):
 * xếp theo Cúp, có ô tìm kiếm lọc ngay trong danh sách. Bấm 1 người mở popup
 * nổi đối chiếu điều kiện. */
function LookupSection({ members, onSelect }: { members: any[]; onSelect: (m: any) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = (q ? members.filter(m => m.name.toLowerCase().includes(q) || m.tag.toLowerCase().includes(q)) : members)
    .slice().sort((a, b) => (b.cup || 0) - (a.cup || 0));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input className="input !pl-9 text-sm" placeholder="Tìm theo tên hoặc tag..."
          value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="divide-y divide-gray-800 max-h-[28rem] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Không tìm thấy thành viên nào.</p>
          ) : filtered.map((m, i) => (
            <button key={m.tag} onClick={() => onSelect(m)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors text-left">
              <span className="text-gray-600 text-xs w-5 shrink-0 text-right">{i + 1}</span>
              <div className="th-badge" style={{ color: thColor(m.townHallLevel), background: thColor(m.townHallLevel) + "22", borderColor: thColor(m.townHallLevel) + "44" }}>
                {m.townHallLevel ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                <p className={`text-xs ${roleClass(m.role)}`}>{roleLabel(m.role)}</p>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <p className="text-sm font-bold text-yellow-400">🏆 {m.cup}</p>
                <p className="text-xs text-gray-500">Donate {m.donate}</p>
              </div>
              <ChevronRight size={16} className="text-gray-600 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RulesPage() {
  const isAdmin = !!getAdminToken();
  const [clanDescription, setClanDescription] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [conditions, setConditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TopTab>("lookup");
  const [evaluation, setEvaluation] = useState<EvalResult | null>(null);
  const [loadingEval, setLoadingEval] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  useEffect(() => {
    api.getClan().then((c: any) => setClanDescription(c?.description || "")).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getClanRules();
      setRulesText(data?.rules_text || "");
      setConditions(data?.conditions || []);
    } catch {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function loadEval() {
    setLoadingEval(true);
    try { setEvaluation(await api.getRuleEvaluation()); }
    catch { setEvaluation({ elder: [], co_leader: [], demote_co_leader: [], demote_elder: [], violation: [], all_members: [] }); }
    finally { setLoadingEval(false); }
  }
  useEffect(() => { loadEval(); }, []);

  function loadHistory() {
    api.getRuleHistory().then(setHistory).catch(() => {});
  }
  useEffect(() => { loadHistory(); }, []);

  return (
    <div className="space-y-6 max-w-3xl animate-fade-up">
      <div>
        <h1 className="page-title flex items-center gap-2"><Scale size={22} className="text-yellow-400" /> Pháp Điển</h1>
        <p className="page-subtitle">Nội quy clan — luật chơi, điều kiện thăng/hạ cấp và loại khỏi clan</p>
      </div>

      {clanDescription && (
        <OrnateFrame>
          <div className="relative rounded-2xl overflow-hidden"
            style={{ padding: "2px", background: "linear-gradient(135deg, #F4A130 0%, #B87320 40%, #FFD700 60%, #B87320 80%, #F4A130 100%)" }}>
            <div className="relative rounded-[14px] px-5 py-3.5"
              style={{ background: "var(--py-card-bg, linear-gradient(180deg,#241640,#1A0F2E))" }}>
              <div className="absolute inset-0 rounded-[14px] pointer-events-none"
                style={{ backgroundImage: "repeating-linear-gradient(135deg,rgba(244,161,48,0.04) 0,rgba(244,161,48,0.04) 1px,transparent 0,transparent 50%)", backgroundSize: "10px 10px" }} />
              <span className="absolute left-2 top-1 text-2xl leading-none font-serif opacity-20 select-none" style={{ color: "#F4A130" }}>"</span>
              <span className="absolute right-2 bottom-1 text-2xl leading-none font-serif opacity-20 select-none" style={{ color: "#F4A130" }}>"</span>
              <p className="relative text-sm font-medium italic leading-relaxed px-3" style={{ color: "var(--py-card-text, #e5e7eb)" }}>"{clanDescription}"</p>
            </div>
          </div>
        </OrnateFrame>
      )}

      {loading ? (
        <div className="card flex justify-center py-8"><Loader2 size={20} className="animate-spin text-yellow-400" /></div>
      ) : !rulesText && conditions.length === 0 ? (
        <div className="card text-center py-10">
          <Scale size={32} className="mx-auto mb-2 text-gray-700" />
          <p className="text-gray-400">Clan chưa cấu hình nội quy.</p>
          {isAdmin && <p className="text-sm text-gray-600 mt-1">Vào Cài đặt → Quản trị viên → tab Nội quy để viết.</p>}
        </div>
      ) : (
        <>
          {rulesText && (
            <div className="card space-y-2">
              <h2 className="font-bold text-white flex items-center gap-2">📜 Nội quy</h2>
              <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: "var(--py-card-text)" }}>{rulesText}</p>
            </div>
          )}

          <RuleArticlesButton conditions={conditions} />

          <div className="space-y-3">
            <div className="overflow-x-auto -mx-1 px-1 pb-1">
              <SlidingTabs
                tabs={[
                  { id: "lookup", label: "🔍 Tra cứu" },
                  { id: "merit", label: TOP_TAB_META.merit.label },
                  { id: "sanction", label: TOP_TAB_META.sanction.label },
                  { id: "expulsion", label: TOP_TAB_META.expulsion.label },
                  { id: "history", label: "Lịch sử" },
                ]}
                active={tab} onChange={(id) => setTab(id as TopTab)} className="w-max" />
            </div>

            {tab === "lookup" ? (
              loadingEval ? (
                <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-yellow-400" /></div>
              ) : (
                <LookupSection members={evaluation?.all_members || []} onSelect={setSelectedMember} />
              )
            ) : tab === "history" ? (
              <HistorySection history={history} isAdmin={isAdmin} onChanged={loadHistory} />
            ) : (
              loadingEval ? (
                <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-yellow-400" /></div>
              ) : (
                <div className="space-y-4">
                  {TOP_TAB_META[tab].keys.map(k => (
                    <ListGroup key={k} listKey={k} members={evaluation?.[k] || []} isAdmin={isAdmin} onLogged={loadHistory} />
                  ))}
                </div>
              )
            )}
          </div>
        </>
      )}

      {selectedMember && (
        <MemberRuleModal member={selectedMember} conditions={conditions} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
}
