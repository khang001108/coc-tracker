"use client";
/**
 * GamePlayButton — chỉ handle click và hiển thị modal xác nhận.
 * Toàn bộ phần visual (circle, animation) được render bởi MobileNav.
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Portal } from "./Portal";
import { Shield, Sparkles, Eye, X, ChevronLeft } from "lucide-react";

const GAME_URL = "https://link.clashofclans.com/";

type Step = "menu" | "confirm" | "pick";

function ClanRow({ clan, onClick }: { clan: any; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors hover:bg-yellow-400/10 text-left"
      style={{ background: "var(--py-card-bg)", border: "1px solid var(--py-card-border)" }}>
      {clan.badge_url ? (
        <img src={clan.badge_url} alt="" className="w-8 h-8 rounded-lg shrink-0 object-contain" style={{ background: "rgba(0,0,0,0.2)" }}/>
      ) : (
        <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-black text-xs"
          style={{ background: "linear-gradient(135deg,#F4A130,#B8731A)", color: "#1A0A00" }}>
          #{clan.id}
        </div>
      )}
      <span className="text-sm font-semibold truncate" style={{ color: "var(--py-card-text)" }}>{clan.clan_name}</span>
    </button>
  );
}

export function GamePlayButton({
  children, className, style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("confirm");
  const [clansWithLink, setClansWithLink] = useState<any[]>([]);

  useEffect(() => {
    api.listClans().then((data: any[]) => setClansWithLink((data || []).filter(c => c.share_link))).catch(() => {});
  }, []);

  function handleOpen() {
    setStep(clansWithLink.length > 0 ? "menu" : "confirm");
    setOpen(true);
  }

  function handleViewClan() {
    if (clansWithLink.length === 1) {
      window.open(clansWithLink[0].share_link, "_blank", "noopener,noreferrer");
      setOpen(false);
    } else {
      setStep("pick");
    }
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className={className} style={style}>
        {children}
      </button>

      {open && (
        <Portal>
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div className="modal-box max-w-xs" onClick={e => e.stopPropagation()}>
              <div className="relative p-5 text-center space-y-4 overflow-hidden">
                <div
                  className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-15 pointer-events-none"
                  style={{ background: "radial-gradient(circle, #F4A130, transparent)" }}
                />
                {step === "pick" && (
                  <button onClick={() => setStep("menu")}
                    className="absolute left-2 top-2 p-1.5 rounded-xl hover:bg-gray-800 text-gray-500">
                    <ChevronLeft size={16} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="absolute right-2 top-2 p-1.5 rounded-xl hover:bg-gray-800 text-gray-500"
                >
                  <X size={16} />
                </button>

                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, #FFE8B8, #F4A130 55%, #B8731A 100%)",
                    border: "2px solid #6B4115",
                    boxShadow: "0 3px 0 #6B4115, 0 6px 14px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.6)",
                  }}
                >
                  <Shield size={28} className="text-gray-900" />
                </div>

                {step === "menu" && (
                  <>
                    <div>
                      <h3 className="font-bold text-white text-lg flex items-center justify-center gap-1.5">
                        CoC Tracker <Sparkles size={16} className="text-yellow-400" />
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">Bạn muốn làm gì?</p>
                    </div>
                    <div className="space-y-2 pt-1">
                      <button onClick={() => setStep("confirm")} className="btn-gold w-full flex items-center justify-center gap-2">
                        <Shield size={15} /> Vào Clash of Clans
                      </button>
                      <button onClick={handleViewClan} className="btn-secondary w-full flex items-center justify-center gap-2">
                        <Eye size={15} /> Xem hội
                      </button>
                    </div>
                  </>
                )}

                {step === "confirm" && (
                  <>
                    <div>
                      <h3 className="font-bold text-white text-lg flex items-center justify-center gap-1.5">
                        Vào Clash of Clans? <Sparkles size={16} className="text-yellow-400" />
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Bạn sẽ rời khỏi CoC Tracker để mở app/game.
                      </p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => clansWithLink.length > 0 ? setStep("menu") : setOpen(false)} className="btn-secondary flex-1">
                        {clansWithLink.length > 0 ? "Quay lại" : "Huỷ"}
                      </button>
                      <button
                        onClick={() => {
                          window.open(GAME_URL, "_blank", "noopener,noreferrer");
                          setOpen(false);
                        }}
                        className="btn-gold flex-1"
                      >
                        Vào ngay
                      </button>
                    </div>
                  </>
                )}

                {step === "pick" && (
                  <>
                    <div>
                      <h3 className="font-bold text-white text-lg">Xem hội nào?</h3>
                      <p className="text-sm text-gray-400 mt-1">Chọn 1 hội để mở link giới thiệu</p>
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {clansWithLink.map(cl => (
                        <ClanRow key={cl.id} clan={cl} onClick={() => {
                          window.open(cl.share_link, "_blank", "noopener,noreferrer");
                          setOpen(false);
                        }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
