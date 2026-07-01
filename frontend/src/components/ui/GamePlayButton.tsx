"use client";
import { useState } from "react";
import { Portal } from "./Portal";
import { Shield, Sparkles, X } from "lucide-react";

const GAME_URL = "https://link.clashofclans.com/";

/* Inject keyframes once */
const BTN_CSS = `
@keyframes play-ring-pulse {
  0%   { transform: scale(1);    opacity: 0.7; }
  70%  { transform: scale(1.45); opacity: 0;   }
  100% { transform: scale(1.45); opacity: 0;   }
}
@keyframes play-border-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes play-shield-bob {
  0%,100% { transform: translateY(0); }
  50%      { transform: translateY(-2px); }
}
`;
let injected = false;
function ensureStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style"); s.textContent = BTN_CSS;
  document.head.appendChild(s);
}

export function GamePlayButton({
  children, className, style,
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  ensureStyles();
  const [open, setOpen] = useState(false);
  const [pressing, setPressing] = useState(false);

  function handlePress() {
    setPressing(true);
    setTimeout(() => { setPressing(false); setOpen(true); }, 120);
  }

  return (
    <>
      <button type="button"
        onMouseDown={() => setPressing(true)}
        onMouseUp={() => { setPressing(false); setOpen(true); }}
        onMouseLeave={() => setPressing(false)}
        onTouchStart={() => setPressing(true)}
        onTouchEnd={() => { setPressing(false); setOpen(true); }}
        className={className} style={style}>

        {/* Outer pulse rings */}
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", position: "absolute", width: 60, height: 60 }}>
          <span className="absolute w-full h-full rounded-full border-2 border-yellow-400/60"
            style={{ animation: "play-ring-pulse 2s ease-out infinite" }}/>
          <span className="absolute w-full h-full rounded-full border-2 border-yellow-400/40"
            style={{ animation: "play-ring-pulse 2s ease-out infinite 0.6s" }}/>
        </span>

        {/* Spinning gradient border ring */}
        <span className="absolute shrink-0"
          style={{
            position: "relative",
            top: "-24px",
            width: 52, height: 52,
          }}>
          {/* Outer spin ring */}
          <span className="absolute inset-[-3px] rounded-full pointer-events-none"
            style={{
              background: "conic-gradient(from 0deg, #FFE8B8, #F4A130, #B8731A, #F4A130, #FFE8B8)",
              animation: "play-border-spin 4s linear infinite",
              borderRadius: "50%",
              padding: 2,
            }}/>

          {/* Main button body */}
          <span className={`relative flex items-center justify-center w-[52px] h-[52px] rounded-full transition-all duration-100 ${pressing ? "scale-90" : "scale-100"}`}
            style={{
              background: "conic-gradient(from 200deg, #FFE8B8, #F4A130, #B8731A, #F4A130, #FFE8B8)",
              padding: 3,
              boxShadow: pressing
                ? "0 1px 0 #6B4115, 0 3px 10px rgba(0,0,0,0.55)"
                : "0 4px 0 #6B4115, 0 10px 20px rgba(0,0,0,0.55)",
            }}>
            <span className="flex items-center justify-center w-full h-full rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 30%, #FFE8B8, #F4A130 55%, #B8731A 100%)",
                border: "2px solid #160d24",
              }}>
              <Shield size={20} className="text-gray-900 drop-shadow"
                style={{ animation: "play-shield-bob 2s ease-in-out infinite" }}/>
            </span>
          </span>
        </span>

        {/* Label */}
        <span className="text-[9px] font-extrabold tracking-wide mt-1 px-1.5 py-0.5 rounded-full"
          style={{ color: "#1A0F05", background: "linear-gradient(180deg, #FFE8B8, #F4A130)" }}>
          CHƠI
        </span>
      </button>

      {open && (
        <Portal>
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div className="modal-box max-w-xs" onClick={e => e.stopPropagation()}>
              <div className="relative p-5 text-center space-y-4 overflow-hidden">
                <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-15 pointer-events-none"
                  style={{ background: "radial-gradient(circle, #F4A130, transparent)" }}/>
                <button onClick={() => setOpen(false)}
                  className="absolute right-2 top-2 p-1.5 rounded-xl hover:bg-gray-800 text-gray-500">
                  <X size={16}/>
                </button>
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, #FFE8B8, #F4A130 55%, #B8731A 100%)",
                    border: "2px solid #6B4115",
                    boxShadow: "0 3px 0 #6B4115, 0 6px 14px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.6)",
                  }}>
                  <Shield size={28} className="text-gray-900"/>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center justify-center gap-1.5">
                    Vào Clash of Clans? <Sparkles size={16} className="text-yellow-400"/>
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Bạn sẽ rời khỏi CoC Tracker để mở app/game.</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Huỷ</button>
                  <button onClick={() => { window.open(GAME_URL, "_blank", "noopener,noreferrer"); setOpen(false); }}
                    className="btn-gold flex-1">Vào ngay</button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
