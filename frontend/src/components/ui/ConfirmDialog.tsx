"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { Portal } from "@/components/ui/Portal";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const Ctx = createContext<ConfirmFn>(async () => false);

/** Thay cho `window.confirm` — trả về Promise<boolean>, dùng: `if (!(await confirm("..."))) return;` */
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: true }) | null>(null);
  const resolver = useRef<(v: boolean) => void>();

  const confirm = useCallback<ConfirmFn>((options) => {
    const opts = typeof options === "string" ? { message: options } : options;
    // Nếu có 1 hộp thoại đang mở, huỷ nó (coi như "Huỷ") trước khi mở cái mới.
    resolver.current?.(false);
    setState({ open: true, ...opts });
    return new Promise<boolean>(resolve => { resolver.current = resolve; });
  }, []);

  function close(result: boolean) {
    setState(null);
    resolver.current?.(result);
    resolver.current = undefined;
  }

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {state?.open && (
        <Portal>
          <div className="modal-overlay" onClick={() => close(false)}>
            <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="p-5 space-y-4">
                <div className={`flex items-center gap-2 ${state.danger ? "text-red-400" : "text-yellow-400"}`}>
                  {state.danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
                  <h2 className="font-bold text-white">{state.title || (state.danger ? "Xác nhận xoá" : "Xác nhận")}</h2>
                </div>
                <p className="text-sm text-gray-400 whitespace-pre-line">{state.message}</p>
                <div className="flex gap-2">
                  <button onClick={() => close(false)} className="btn-secondary flex-1">
                    {state.cancelText || "Huỷ"}
                  </button>
                  <button onClick={() => close(true)} autoFocus className={`${state.danger ? "btn-danger" : "btn-gold"} flex-1`}>
                    {state.confirmText || "Xác nhận"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </Ctx.Provider>
  );
}
