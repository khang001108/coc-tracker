"use client";
import { useEffect, useState } from "react";
import { ChevronDown, Plus, Shield, Check } from "lucide-react";
import { getCurrentClanId, getCurrentClanInfo, setCurrentClan, ClanInfo } from "@/lib/clanContext";
import { api } from "@/lib/api";

export function ClanSwitcher() {
  const [clans, setClans] = useState<ClanInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [currentId, setCurrentId] = useState(1);
  const [currentInfo, setCurrentInfo] = useState<ClanInfo | null>(null);
  const isAdmin = typeof window !== "undefined" && !!localStorage.getItem("admin_token");

  useEffect(() => {
    setCurrentId(getCurrentClanId());
    setCurrentInfo(getCurrentClanInfo());
    if (isAdmin) {
      api.listClans().then(setClans).catch(() => {});
    }
  }, []);

  if (!isAdmin && clans.length <= 1) return null;

  const displayName = currentInfo?.clan_name || `Clan #${currentId}`;
  const displayTag  = currentInfo?.clan_tag  || "";

  return (
    <div className="relative mb-2">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-gray-800/60 border border-transparent hover:border-gray-700"
        style={{ background: "var(--py-pill-bg, rgba(255,255,255,0.05))" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #F4A130, #B8731A)" }}>
          <Shield size={16} className="text-gray-900"/>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold truncate" style={{ color: "var(--py-card-text, #fff)" }}>
            {displayName}
          </p>
          <p className="text-[10px] text-gray-500 truncate">{displayTag}</p>
        </div>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-xl"
          style={{ background: "var(--py-card-bg, #1E1138)", border: "1px solid var(--py-card-border, #3D2A66)" }}>
          {clans.map(clan => (
            <button key={clan.id} onClick={() => { setCurrentClan(clan); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-800/40 transition-colors">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #F4A130, #B8731A)" }}>
                <Shield size={12} className="text-gray-900"/>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--py-card-text, #fff)" }}>
                  {clan.clan_name}
                </p>
                <p className="text-[10px] text-gray-600 truncate">{clan.clan_tag}</p>
              </div>
              {clan.id === currentId && <Check size={14} className="text-yellow-400 shrink-0"/>}
            </button>
          ))}

          {isAdmin && (
            <div className="border-t border-gray-800">
              <a href="/settings?tab=clans"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-500 hover:text-yellow-400 transition-colors">
                <Plus size={14}/> Thêm clan mới
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
