"use client";
import { useMusic } from "./MusicContext";
import { Music2, Play, Pause, SkipForward, Volume2 } from "lucide-react";

export function MusicControls() {
  const { config, playing, needsUnlock, currentTrack, playlist, togglePlay, skip, volume, setVolume } = useMusic();

  if (!config.enabled || playlist.length === 0) return null;

  return (
    <div className="rounded-2xl px-3 py-3 space-y-2"
      style={{ background: "var(--player-bg)", border: "1px solid var(--player-border)" }}>
      <div className="flex items-center gap-2">
        <Music2 size={14} className="text-yellow-400 shrink-0" />
        <span className="text-xs truncate flex-1 font-medium" style={{ color: "#fff" }}>{currentTrack?.title || "Nhạc nền"}</span>
      </div>

      {needsUnlock ? (
        <button onClick={togglePlay} className="btn-gold w-full text-sm">Bật nhạc nền</button>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={togglePlay} className="icon-btn-game w-9 h-9 text-gray-900 shrink-0">
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          {playlist.length > 1 && (
            <button onClick={skip} className="p-2 rounded-full hover:bg-black/20 shrink-0" style={{ color: "#fff" }}>
              <SkipForward size={15} />
            </button>
          )}
          <Volume2 size={14} className="text-gray-400 shrink-0" />
          <input type="range" min={0} max={1} step={0.05} value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="flex-1 accent-yellow-400" />
        </div>
      )}
    </div>
  );
}
