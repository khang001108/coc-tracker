"use client";
import { useEffect, useState } from "react";
import { api, getAdminToken } from "@/lib/api";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  RULE_METRIC_LABELS, RULE_TARGET_LABELS, RULE_TARGET_IS_AND, conditionSentence, HISTORY_ACTION_LABELS,
  type RuleTarget,
} from "@/lib/ruleConstants";
import { Scale, Star, Crown, TrendingDown, AlertTriangle, History as HistoryIcon, Check, Trash2, Loader2 } from "lucide-react";

type ListKey = RuleTarget;
type EvalResult = Record<ListKey, any[]>;

const LIST_META: Record<ListKey, { label: string; tabLabel: string; icon: any; color: string; empty: string; historyAction: string }> = {
  elder:             { label: "Đủ điều kiện lên Huynh trưởng",              tabLabel: "Huynh trưởng",   icon: Star,          color: "text-blue-400",   empty: "Chưa có ai đủ điều kiện.",     historyAction: "promote_elder" },
  co_leader:         { label: "Đủ điều kiện lên Đồng thủ lĩnh",             tabLabel: "Đồng thủ lĩnh",  icon: Crown,         color: "text-purple-400", empty: "Chưa có ai đủ điều kiện.",     historyAction: "promote_co_leader" },
  demote_co_leader:  { label: "Đề xuất hạ Đồng thủ lĩnh → Huynh trưởng",    tabLabel: "Hạ ĐTL",         icon: TrendingDown,  color: "text-orange-400", empty: "Không có ai trong diện này.",  historyAction: "demote_co_leader" },
  demote_elder:      { label: "Đề xuất hạ Huynh trưởng → Thành viên",       tabLabel: "Hạ Huynh trưởng", icon: TrendingDown,  color: "text-orange-400", empty: "Không có ai trong diện này.",  historyAction: "demote_elder" },
  violation:         { label: "Có nguy cơ bị loại khỏi clan",               tabLabel: "Vi phạm",        icon: AlertTriangle, color: "text-red-400",    empty: "Không có ai vi phạm nội quy.", historyAction: "expel" },
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

function RuleArticles({ conditions }: { conditions: any[] }) {
  const byTarget: Record<string, any[]> = {};
  conditions.forEach(c => { (byTarget[c.target] ||= []).push(c); });
  const targets = Object.keys(RULE_TARGET_LABELS) as RuleTarget[];

  if (conditions.length === 0) return null;

  return (
    <div className="card space-y-3">
      <h2 className="font-bold text-white flex items-center gap-2"><Scale size={16} className="text-yellow-400" /> Điều kiện chi tiết</h2>
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

export default function RulesPage() {
  const isAdmin = !!getAdminToken();
  const [rulesText, setRulesText] = useState("");
  const [conditions, setConditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ListKey | "history">("elder");
  const [evaluation, setEvaluation] = useState<EvalResult | null>(null);
  const [loadingEval, setLoadingEval] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

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
    catch { setEvaluation({ elder: [], co_leader: [], demote_co_leader: [], demote_elder: [], violation: [] }); }
    finally { setLoadingEval(false); }
  }
  useEffect(() => { loadEval(); }, []);

  function loadHistory() {
    api.getRuleHistory().then(setHistory).catch(() => {});
  }
  useEffect(() => { loadHistory(); }, []);

  const listTabs = (Object.keys(LIST_META) as ListKey[]).map(k => ({ id: k, label: LIST_META[k].tabLabel }));

  return (
    <div className="space-y-6 max-w-3xl animate-fade-up">
      <div>
        <h1 className="page-title flex items-center gap-2"><Scale size={22} className="text-yellow-400" /> Pháp Điển</h1>
        <p className="page-subtitle">Nội quy clan — luật chơi, điều kiện thăng/hạ cấp và loại khỏi clan</p>
      </div>

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

          <RuleArticles conditions={conditions} />

          <div className="space-y-3">
            <div className="overflow-x-auto -mx-1 px-1 pb-1">
              <SlidingTabs
                tabs={[...listTabs, { id: "history", label: "Lịch sử" }]}
                active={tab} onChange={(id) => setTab(id as any)} className="w-max" />
            </div>

            {tab !== "history" ? (
              loadingEval ? (
                <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-yellow-400" /></div>
              ) : (
                <div className="space-y-1.5">
                  {(evaluation?.[tab] || []).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">{LIST_META[tab].empty}</p>
                  ) : (
                    evaluation![tab].map((m: any) => (
                      <MemberActionRow key={m.tag} m={m} isAdmin={isAdmin} historyAction={LIST_META[tab].historyAction} onLogged={loadHistory} />
                    ))
                  )}
                </div>
              )
            ) : (
              <HistorySection history={history} isAdmin={isAdmin} onChanged={loadHistory} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
