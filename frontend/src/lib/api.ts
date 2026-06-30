const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "coc_admin_token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setAdminToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}
export function clearAdminToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path: string, opts?: RequestInit, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    try {
      const token = getAdminToken();
      const res = await fetch(`${API}${path}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-Admin-Token": token } : {}),
          ...opts?.headers,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || err.message || `Lỗi ${res.status}`);
      }
      return res.json();
    } catch (e: any) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
}

export const api = {
  // Clan
  getClan:        () => apiFetch("/api/clan/"),
  refreshClan:    () => apiFetch("/api/clan/refresh"),

  // War
  getCurrentWar:  () => apiFetch("/api/war/current"),
  getWarLog:      () => apiFetch("/api/war/log"),
  getCWL:         () => apiFetch("/api/war/cwl"),

  // Capital
  getRaidSeasons: () => apiFetch("/api/capital/raids"),

  // Games / Donate
  getClanGames:   () => apiFetch("/api/games/"),

  // Members
  getMembers:     () => apiFetch("/api/members/"),
  getMemberLog:   () => apiFetch("/api/members/log"),
  getPlayer:      (tag: string) => apiFetch(`/api/members/${encodeURIComponent(tag)}`),

  // Auth
  login: (password: string) =>
    apiFetch("/api/settings/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  // Settings
  getSettings:    () => apiFetch("/api/settings/"),
  saveSetting:    (key: string, value: string) =>
    apiFetch("/api/settings/", {
      method: "POST",
      body: JSON.stringify({ key, value }),
    }),
  testClan: (api_key: string, clan_tag: string) =>
    apiFetch("/api/settings/test-clan", {
      method: "POST",
      body: JSON.stringify({ api_key, clan_tag }),
    }),
  testDiscord: (webhook_url: string) =>
    apiFetch("/api/settings/test-discord", {
      method: "POST",
      body: JSON.stringify({ webhook_url }),
    }),
  testTelegram: (bot_token: string, chat_id: string) =>
    apiFetch("/api/settings/test-telegram", {
      method: "POST",
      body: JSON.stringify({ bot_token, chat_id }),
    }),

  // Notify
  sendNotify: (message: string, title?: string) =>
    apiFetch("/api/notify/send", {
      method: "POST",
      body: JSON.stringify({ message, title }),
    }),

  // Health check
  health: () => apiFetch("/health"),

  // Events
  getEvents:        () => apiFetch("/api/events/"),
  getConditions:    () => apiFetch("/api/events/conditions"),
  createEvent:      (data: any) => apiFetch("/api/events/", { method: "POST", body: JSON.stringify(data) }),
  updateEvent:      (id: number, data: any) => apiFetch(`/api/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEvent:      (id: number) => apiFetch(`/api/events/${id}`, { method: "DELETE" }),
  getLeaderboard:   (id: number) => apiFetch(`/api/events/${id}/leaderboard`),
  saveClaims:       (id: number, entries: any[]) => apiFetch(`/api/events/${id}/claim`, { method: "POST", body: JSON.stringify({ entries }) }),
  getClaims:        (id: number) => apiFetch(`/api/events/${id}/claims`),
  markClaimed:      (eventId: number, claimId: number, claimed: boolean) =>
    apiFetch(`/api/events/${eventId}/claims/${claimId}/mark`, { method: "POST", body: JSON.stringify({ claimed }) }),
  uploadEventImage: async (file: File) => {
    const token = getAdminToken();
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API}/api/events/upload-image`, {
      method: "POST",
      headers: token ? { "X-Admin-Token": token } : {},
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Lỗi tải ảnh" }));
      throw new Error(err.detail || "Lỗi tải ảnh");
    }
    return res.json();
  },

  // Music
  getTracks:    () => apiFetch("/api/music/tracks"),
  getMusicConfig: () => apiFetch("/api/music/config"),
  updateMusicConfig: (data: any) => apiFetch("/api/music/config", { method: "POST", body: JSON.stringify(data) }),
  deleteTrack:  (id: number) => apiFetch(`/api/music/tracks/${id}`, { method: "DELETE" }),
  uploadTrack: async (file: File, title?: string) => {
    const token = getAdminToken();
    const fd = new FormData();
    fd.append("file", file);
    if (title) fd.append("title", title);
    const res = await fetch(`${API}/api/music/tracks${title ? `?title=${encodeURIComponent(title)}` : ""}`, {
      method: "POST",
      headers: token ? { "X-Admin-Token": token } : {},
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Lỗi tải nhạc" }));
      throw new Error(err.detail || "Lỗi tải nhạc");
    }
    return res.json();
  },
};
