"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type MusicCtx = {
  tracks: any[];
  config: { enabled: boolean; mode: string; selected_id: string };
  playing: boolean;
  needsUnlock: boolean;
  volume: number;
  currentTrack: any;
  playlist: any[];
  togglePlay: () => void;
  skip: () => void;
  setVolume: (v: number) => void;
};

const Ctx = createContext<MusicCtx | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [config, setConfig] = useState<{ enabled: boolean; mode: string; selected_id: string }>({
    enabled: false, mode: "all", selected_id: "",
  });
  const [playing, setPlaying] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [trackIndex, setTrackIndex] = useState(0);

  useEffect(() => {
    Promise.all([api.getTracks().catch(() => []), api.getMusicConfig().catch(() => null)])
      .then(([t, c]) => {
        setTracks(t || []);
        if (c) setConfig(c);
      });
  }, []);

  const playlist = config.mode === "single"
    ? tracks.filter(t => String(t.id) === String(config.selected_id))
    : tracks;
  const currentTrack = playlist[trackIndex % Math.max(playlist.length, 1)];

  useEffect(() => {
    if (!config.enabled || !currentTrack || !audioRef.current) return;
    audioRef.current.src = currentTrack.file_url;
    audioRef.current.volume = volume;
    audioRef.current.play()
      .then(() => { setPlaying(true); setNeedsUnlock(false); })
      .catch(() => { setNeedsUnlock(true); setPlaying(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, config.enabled]);

  function handleEnded() {
    if (playlist.length > 1) {
      setTrackIndex(i => (i + 1) % playlist.length);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => { setPlaying(true); setNeedsUnlock(false); })
        .catch(() => setNeedsUnlock(true));
    }
  }

  function skip() {
    if (playlist.length > 1) setTrackIndex(i => (i + 1) % playlist.length);
  }

  function setVolume(v: number) {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }

  return (
    <Ctx.Provider value={{ tracks, config, playing, needsUnlock, volume, currentTrack, playlist, togglePlay, skip, setVolume }}>
      <audio ref={audioRef} onEnded={handleEnded} />
      {children}
    </Ctx.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMusic phải dùng bên trong MusicProvider");
  return ctx;
}
