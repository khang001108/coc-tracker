"use client";
import { useEffect, useState } from "react";
import { api, getAdminToken } from "@/lib/api";
import { Portal } from "@/components/ui/Portal";
import { OrnateFrame } from "@/components/ui/OrnateFrame";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { roleLabel, roleClass, thColor } from "@/lib/utils";
import {
  RULE_TARGET_LABELS, RULE_TARGET_IS_AND, conditionSentence, checkCondition,
  HISTORY_ACTION_LABELS, isSystemHistoryAction, type RuleTarget,
} from "@/lib/ruleConstants";
import { Scale, Star, Crown, TrendingDown, AlertTriangle, Check, X, Search, ChevronRight, ChevronLeft, Trash2, Loader2, ScrollText } from "lucide-react";
import { ScrollIcon, ScaleIcon, MedalIcon, GateIcon, BrokenColumnIcon, TabletIcon } from "@/components/ui/GrecoIcons";

type ListKey = RuleTarget;
type EvalResult = Record<ListKey, any[]> & { all_members: any[] };
type TopTab = "info" | "review" | "history";
type ReviewTab = "merit" | "sanction" | "expulsion";

const LIST_META: Record<ListKey, { label: string; icon: any; color: string; empty: string; historyAction: string }> = {
  elder:             { label: "Đủ điều kiện lên Huynh trưởng",           icon: Star,          color: "text-blue-400",   empty: "Chưa có ai đủ điều kiện.",     historyAction: "promote_elder" },
  co_leader:         { label: "Đủ điều kiện lên Đồng thủ lĩnh",          icon: Crown,         color: "text-purple-400", empty: "Chưa có ai đủ điều kiện.",     historyAction: "promote_co_leader" },
  demote_co_leader:  { label: "Đề xuất hạ Đồng thủ lĩnh → Huynh trưởng", icon: TrendingDown,  color: "text-orange-400", empty: "Không có ai trong diện này.",  historyAction: "demote_co_leader" },
  demote_elder:      { label: "Đề xuất hạ Huynh trưởng → Thành viên",    icon: TrendingDown,  color: "text-orange-400", empty: "Không có ai trong diện này.",  historyAction: "demote_elder" },
  violation:         { label: "Có nguy cơ bị loại khỏi clan",            icon: AlertTriangle, color: "text-red-400",    empty: "Không có ai vi phạm nội quy.", historyAction: "expel" },
};

// 3 pill-tab con trong "Xét duyệt" — mỗi tab gồm 1-2 nhóm điều kiện.
const REVIEW_TAB_META: Record<ReviewTab, { label: string; icon: JSX.Element; keys: ListKey[] }> = {
  merit:     { label: "Công trạng", icon: <MedalIcon/>,        keys: ["elder", "co_leader"] },
  sanction:  { label: "Chế tài",    icon: <BrokenColumnIcon/>, keys: ["demote_co_leader", "demote_elder"] },
  expulsion: { label: "Khai trừ",   icon: <GateIcon/>,         keys: ["violation"] },
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

/** Nội dung đối chiếu điều kiện của 1 thành viên — dùng chung giữa popup Tra
 * cứu (chọn từ danh sách) và có thể tái dùng nếu cần nơi khác sau này. */
function MemberConditionCheck({ member, conditions }: { member: any; conditions: any[] }) {
  const byTarget: Record<string, any[]> = {};
  conditions.forEach(c => { (byTarget[c.target] ||= []).push(c); });
  const targets = Object.keys(RULE_TARGET_LABELS) as RuleTarget[];

  return (
    <div className="space-y-3">
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
  );
}

/** Popup Tra cứu — danh sách thành viên (kiểu giống trang Thành viên) + tìm
 * kiếm; bấm 1 người chuyển sang xem đối chiếu điều kiện của người đó, có nút
 * quay lại danh sách. */
function LookupModal({ members, conditions, scopeLabel, onClose }: { members: any[]; conditions: any[]; scopeLabel: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const q = query.trim().toLowerCase();
  const filtered = (q ? members.filter(m => m.name.toLowerCase().includes(q) || m.tag.toLowerCase().includes(q)) : members)
    .slice().sort((a, b) => (b.cup || 0) - (a.cup || 0));

  return (
    <Portal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                {selected && (
                  <button onClick={() => setSelected(null)} className="p-1 -ml-1 rounded-lg hover:bg-gray-800 text-gray-400">
                    <ChevronLeft size={18} />
                  </button>
                )}
                <Search size={16} className="text-yellow-400" /> Tra cứu <span className="text-gray-500 font-normal text-sm">— {scopeLabel}</span>
              </h3>
              <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>

            {!selected ? (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input className="input !pl-9 text-sm" placeholder="Tìm theo tên hoặc tag..."
                    value={query} onChange={e => setQuery(e.target.value)} autoFocus />
                </div>
                <div className="divide-y divide-gray-800 max-h-[26rem] overflow-y-auto rounded-xl"
                  style={{ border: "1px solid var(--py-card-border)" }}>
                  {filtered.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">Không tìm thấy thành viên nào.</p>
                  ) : filtered.map((m, i) => (
                    <button key={m.tag} onClick={() => setSelected(m)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800/50 transition-colors text-left">
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
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="th-badge" style={{ color: thColor(selected.townHallLevel), background: thColor(selected.townHallLevel) + "22", borderColor: thColor(selected.townHallLevel) + "44" }}>
                    {selected.townHallLevel ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{selected.name}</p>
                    <p className={`text-xs ${roleClass(selected.role)}`}>{roleLabel(selected.role)} · #{selected.tag.replace("#", "")}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{statLine(selected)}</p>
                <div className="max-h-[24rem] overflow-y-auto pr-1">
                  <MemberConditionCheck member={selected} conditions={conditions} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

function MemberActionRow({ m, isAdmin, historyAction, onLogged, conditions }: { m: any; isAdmin: boolean; historyAction: string; onLogged: () => void; conditions: any[] }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  async function markProcessed() {
    setBusy(true);
    try {
      await api.addRuleHistory({ action: historyAction, player_tag: m.tag, player_name: m.name });
      setDone(true);
      onLogged();
    } catch {} finally { setBusy(false); }
  }

  return (
    <>
    <div className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-lg"
      style={{ background: "var(--py-card-bg)", border: "1px solid var(--py-card-border)" }}>
      <button onClick={() => setShowDetail(true)} className="min-w-0 text-left flex-1 hover:brightness-110">
        <p className="font-semibold truncate" style={{ color: "var(--py-card-text)" }}>
          {m.name} <span className="text-gray-500 font-normal">#{(m.tag || "").replace("#", "")}</span>
        </p>
        <p className="text-gray-500 mt-0.5">{statLine(m)}</p>
      </button>
      {isAdmin && (
        <button onClick={markProcessed} disabled={busy || done}
          className="btn-secondary !py-1 !px-2 text-[11px] shrink-0 flex items-center gap-1 disabled:opacity-60">
          {done ? <><Check size={11} /> Đã ghi</> : busy ? "Đang lưu..." : "Đánh dấu đã xử lý"}
        </button>
      )}
    </div>

    {showDetail && (
      <Portal>
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="relative w-full max-w-md mx-4 my-4 overflow-y-auto rounded-2xl p-4 space-y-3"
            style={{ background: "var(--py-card-bg, linear-gradient(180deg,#241640,#1A0F2E))", maxHeight: "calc(100dvh - 120px)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm" style={{ color: "var(--py-card-text)" }}>
                {m.name} <span className="text-gray-500 font-normal">#{(m.tag || "").replace("#", "")}</span>
              </h3>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 text-sm">✕</button>
            </div>
            <p className="text-xs text-gray-500">{statLine(m)}</p>
            <MemberConditionCheck member={m} conditions={conditions} />
          </div>
        </div>
      </Portal>
    )}
    </>
  );
}

function ListGroup({ listKey, members, isAdmin, onLogged, conditions }: { listKey: ListKey; members: any[]; isAdmin: boolean; onLogged: () => void; conditions: any[] }) {
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
            <MemberActionRow key={m.tag} m={m} isAdmin={isAdmin} historyAction={meta.historyAction} onLogged={onLogged} conditions={conditions} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Điều kiện chi tiết — popup nổi (bấm mở mới hiện). */
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
  const [query, setQuery] = useState("");

  async function del(id: number) {
    if (!(await confirm({ message: "Xoá dòng lịch sử này?", danger: true }))) return;
    await api.deleteRuleHistory(id);
    onChanged();
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? history.filter(h => {
        const meta = HISTORY_ACTION_LABELS[h.action] || { label: h.action };
        return (h.player_name || "").toLowerCase().includes(q)
          || (h.player_tag || "").toLowerCase().includes(q)
          || (h.detail || "").toLowerCase().includes(q)
          || meta.label.toLowerCase().includes(q);
      })
    : history;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input className="input !pl-9 text-sm" placeholder="Tra cứu lịch sử theo tên, tag hoặc nội dung..."
          value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          {history.length === 0 ? "Chưa có lịch sử nào." : "Không tìm thấy dòng lịch sử phù hợp."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(h => {
            const meta = HISTORY_ACTION_LABELS[h.action] || { label: h.action, color: "text-gray-400" };
            const isSystem = isSystemHistoryAction(h.action);
            return (
              <div key={h.id} className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-lg"
                style={{ background: "var(--py-card-bg)", border: "1px solid var(--py-card-border)" }}>
                <div className="min-w-0">
                  {!isSystem && (
                    <p className="font-semibold truncate" style={{ color: "var(--py-card-text)" }}>
                      {h.player_name} <span className="text-gray-500 font-normal">#{(h.player_tag || "").replace("#", "")}</span>
                    </p>
                  )}
                  <p className={`mt-0.5 font-medium ${meta.color}`}>
                    {meta.label} · {new Date(h.created_at).toLocaleDateString("vi-VN")}
                    {h.detail && <span className="text-gray-500 font-normal"> — {h.detail}</span>}
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
      )}
    </div>
  );
}

export default function RulesPage() {
  const isAdmin = !!getAdminToken();
  const [clanDescription, setClanDescription] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [conditions, setConditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [topTab, setTopTab] = useState<TopTab>("info");
  const [reviewTab, setReviewTab] = useState<ReviewTab>("merit");
  const [evaluation, setEvaluation] = useState<EvalResult | null>(null);
  const [loadingEval, setLoadingEval] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [lookupTab, setLookupTab] = useState<ReviewTab | null>(null);

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

  const hasAnything = rulesText || conditions.length > 0;

  return (
    <div className="space-y-6 max-w-3xl animate-fade-up">
      <div>
        <h1 className="page-title flex items-center gap-2"><Scale size={22} className="text-yellow-400" /> Pháp Điển</h1>
        <p className="page-subtitle">Nội quy clan — luật chơi, điều kiện thăng/hạ cấp và loại khỏi clan</p>
      </div>

      {loading ? (
        <div className="card flex justify-center py-8"><Loader2 size={20} className="animate-spin text-yellow-400" /></div>
      ) : !hasAnything ? (
        <div className="card text-center py-10">
          <Scale size={32} className="mx-auto mb-2 text-gray-700" />
          <p className="text-gray-400">Clan chưa cấu hình nội quy.</p>
          {isAdmin && <p className="text-sm text-gray-600 mt-1">Vào Cài đặt → Quản trị viên → tab Nội quy để viết.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <SlidingTabs
              tabs={[
                { id: "info", label: "Nội quy", icon: <TabletIcon/> },
                { id: "review", label: "Xét duyệt", icon: <ScaleIcon/> },
                { id: "history", label: "Lịch sử", icon: <ScrollIcon/> },
              ]}
              active={topTab} onChange={(id) => setTopTab(id as TopTab)} className="w-max" />
          </div>

          {topTab === "info" && (
            <div className="space-y-3">
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
              {rulesText && (
                <div className="card space-y-2">
                  <h2 className="font-bold text-white flex items-center gap-2"><ScrollText size={16} className="text-yellow-400" /> Nội quy</h2>
                  <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: "var(--py-card-text)" }}>{rulesText}</p>
                </div>
              )}
              <RuleArticlesButton conditions={conditions} />
            </div>
          )}

          {topTab === "review" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="overflow-x-auto -mx-1 px-1">
                  <SlidingTabs
                    tabs={(Object.keys(REVIEW_TAB_META) as ReviewTab[]).map(k => ({ id: k, label: REVIEW_TAB_META[k].label, icon: REVIEW_TAB_META[k].icon }))}
                    active={reviewTab} onChange={(id) => setReviewTab(id as ReviewTab)} className="w-max" />
                </div>
                <button onClick={() => setLookupTab(reviewTab)} title="Tra cứu"
                  className="btn-secondary !p-2 shrink-0">
                  <Search size={15} />
                </button>
              </div>

              {loadingEval ? (
                <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-yellow-400" /></div>
              ) : (
                <div className="space-y-4">
                  {REVIEW_TAB_META[reviewTab].keys.map(k => (
                    <ListGroup key={k} listKey={k} members={evaluation?.[k] || []} isAdmin={isAdmin} onLogged={loadHistory} conditions={conditions} />
                  ))}
                </div>
              )}
            </div>
          )}

          {topTab === "history" && (
            <HistorySection history={history} isAdmin={isAdmin} onChanged={loadHistory} />
          )}
        </div>
      )}

      {lookupTab && (
        <LookupModal
          members={evaluation?.all_members || []}
          conditions={conditions.filter(c => REVIEW_TAB_META[lookupTab].keys.includes(c.target))}
          scopeLabel={REVIEW_TAB_META[lookupTab].label}
          onClose={() => setLookupTab(null)}
        />
      )}
    </div>
  );
}
