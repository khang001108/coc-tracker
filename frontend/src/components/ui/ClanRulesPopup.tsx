"use client";
/**
 * Popup nội quy clan — hiện ở Tổng quan mỗi lần mở web (tải lại trang / mở
 * tab mới), trừ khi người dùng đã tắt ở Cài đặt thường. Không hiện gì cả nếu
 * Admin chưa viết nội quy (rules_text rỗng).
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Portal } from "./Portal";
import { getRulesPopupEnabled } from "@/lib/clanRulesPref";
import { ScrollText, X, ChevronLeft, Star, Crown, AlertTriangle, Loader2 } from "lucide-react";

type Step = "rules" | "elder" | "co_leader" | "violation";
type EvalResult = { elder: any[]; co_leader: any[]; violation: any[] };

const LIST_META: Record<"elder" | "co_leader" | "violation", { title: string; icon: any; color: string; empty: string }> = {
  elder:      { title: "Đủ điều kiện lên Huynh trưởng",   icon: Star,          color: "text-blue-400",   empty: "Chưa có ai đủ điều kiện lên Huynh trưởng." },
  co_leader:  { title: "Đủ điều kiện lên Đồng thủ lĩnh",  icon: Crown,         color: "text-purple-400", empty: "Chưa có ai đủ điều kiện lên Đồng thủ lĩnh." },
  violation:  { title: "Có nguy cơ bị loại khỏi clan",    icon: AlertTriangle, color: "text-red-400",    empty: "Không có ai vi phạm nội quy." },
};

function MemberRow({ m }: { m: any }) {
  return (
    <div className="flex items-center justify-between text-xs p-2 rounded-lg"
      style={{ background: "var(--py-card-bg)", border: "1px solid var(--py-card-border)" }}>
      <span className="font-semibold truncate" style={{ color: "var(--py-card-text)" }}>{m.name}</span>
      <span className="text-gray-500 shrink-0">#{(m.tag || "").replace("#", "")}</span>
    </div>
  );
}

export function ClanRulesPopup() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("rules");
  const [rulesText, setRulesText] = useState("");
  const [hasConfig, setHasConfig] = useState(false);
  const [evaluation, setEvaluation] = useState<EvalResult | null>(null);
  const [loadingEval, setLoadingEval] = useState(false);

  useEffect(() => {
    api.getClanRules().then((data: any) => {
      const text = (data?.rules_text || "").trim();
      setRulesText(text);
      setHasConfig(!!text);
      if (text && getRulesPopupEnabled()) setOpen(true);
    }).catch(() => {});
  }, []);

  async function goToList(target: "elder" | "co_leader" | "violation") {
    setStep(target);
    if (!evaluation) {
      setLoadingEval(true);
      try { setEvaluation(await api.getRuleEvaluation()); }
      catch { setEvaluation({ elder: [], co_leader: [], violation: [] }); }
      finally { setLoadingEval(false); }
    }
  }

  if (!hasConfig || !open) return null;

  return (
    <Portal>
      <div className="modal-overlay" onClick={() => setOpen(false)}>
        <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
          <div className="relative p-5 space-y-4">
            {step !== "rules" && (
              <button onClick={() => setStep("rules")}
                className="absolute left-2 top-2 p-1.5 rounded-xl hover:bg-gray-800 text-gray-500">
                <ChevronLeft size={16} />
              </button>
            )}
            <button onClick={() => setOpen(false)}
              className="absolute right-2 top-2 p-1.5 rounded-xl hover:bg-gray-800 text-gray-500">
              <X size={16} />
            </button>

            {step === "rules" ? (
              <>
                <h3 className="font-bold text-white text-lg flex items-center justify-center gap-1.5 text-center">
                  <ScrollText size={18} className="text-yellow-400" /> Nội quy clan
                </h3>
                <div className="text-sm text-gray-300 whitespace-pre-line max-h-72 overflow-y-auto leading-relaxed">
                  {rulesText}
                </div>
                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  <button onClick={() => goToList("elder")} className="btn-secondary text-xs flex items-center justify-center gap-1.5">
                    <Star size={13} className="text-blue-400" /> Xem ai đủ điều kiện lên Huynh trưởng
                  </button>
                  <button onClick={() => goToList("co_leader")} className="btn-secondary text-xs flex items-center justify-center gap-1.5">
                    <Crown size={13} className="text-purple-400" /> Xem ai đủ điều kiện lên Đồng thủ lĩnh
                  </button>
                  <button onClick={() => goToList("violation")} className="btn-secondary text-xs flex items-center justify-center gap-1.5">
                    <AlertTriangle size={13} className="text-red-400" /> Xem ai có nguy cơ bị loại
                  </button>
                </div>
                <button onClick={() => setOpen(false)} className="btn-gold w-full">Đã hiểu</button>
              </>
            ) : (
              <>
                <h3 className={`font-bold text-lg text-center ${LIST_META[step].color}`}>{LIST_META[step].title}</h3>
                {loadingEval ? (
                  <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-yellow-400" /></div>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {(evaluation?.[step] || []).length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">{LIST_META[step].empty}</p>
                    ) : (
                      evaluation![step].map((m: any) => <MemberRow key={m.tag} m={m} />)
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
