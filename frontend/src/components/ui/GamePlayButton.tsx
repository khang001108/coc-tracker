"use client";
import { useState } from "react";
import { Portal } from "./Portal";
import { Shield, Sparkles, X } from "lucide-react";

const GAME_URL = "https://link.clashofclans.com/";

export function GamePlayButton({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);

  function confirm() {
    window.open(GAME_URL, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} style={style}>
        {children}
      </button>

      {open && (
        <Portal>
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div className="modal-box max-w-xs" onClick={e => e.stopPropagation()}>
              <div className="relative p-5 text-center space-y-4 overflow-hidden">
                <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-15 pointer-events-none"
                  style={{ background: "radial-gradient(circle, #F4A130, transparent)" }} />
                <button onClick={() => setOpen(false)}
                  className="absolute right-2 top-2 p-1.5 rounded-xl hover:bg-gray-800 text-gray-500">
                  <X size={16} />
                </button>

                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, #FFE8B8, #F4A130 55%, #B8731A 100%)",
                    border: "2px solid #6B4115",
                    boxShadow: "0 3px 0 #6B4115, 0 6px 14px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.6)",
                  }}>
                  <Shield size={28} className="text-gray-900" />
                </div>

                <div>
                  <h3 className="font-bold text-white text-lg flex items-center justify-center gap-1.5">
                    Vào Clash of Clans? <Sparkles size={16} className="text-yellow-400" />
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Bạn sẽ rời khỏi CoC Tracker để mở app/game.</p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Huỷ</button>
                  <button onClick={confirm} className="btn-gold flex-1">Vào ngay</button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
