const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "coc_admin_token";
const MEMBER_TOKEN_KEY = "coc_member_token";
const GUEST_NAME_KEY = "coc_guest_name";

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

export function getMemberAuth(): { token: string; player_tag: string; player_name: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(MEMBER_TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setMemberAuth(data: { token: string; player_tag: string; player_name: string }) {
  if (typeof window !== "undefined") localStorage.setItem(MEMBER_TOKEN_KEY, JSON.stringify(data));
}
export function clearMemberAuth() {
  if (typeof window !== "undefined") localStorage.removeItem(MEMBER_TOKEN_KEY);
}
export function getGuestName(): string {
  if (typeof window === "undefined") return "Khách";
  return localStorage.getItem(GUEST_NAME_KEY) || "";
}
export function setGuestName(name: string) {
  if (typeof window !== "undefined") localStorage.setItem(GUEST_NAME_KEY, name);
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
  createEvent:      async (data: any) => {
    const member = getMemberAuth();
    const res = await fetch(`${API}/api/events/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getAdminToken() ? { "X-Admin-Token": getAdminToken()! } : {}),
        ...(member ? { "X-Member-Token": member.token } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Lỗi tạo sự kiện" }));
      throw new Error(err.detail || "Lỗi tạo sự kiện");
    }
    return res.json();
  },
  updateEvent:      (id: number, data: any) => apiFetch(`/api/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEvent:      async (id: number) => {
    const member = getMemberAuth();
    const res = await fetch(`${API}/api/events/${id}`, {
      method: "DELETE",
      headers: {
        ...(getAdminToken() ? { "X-Admin-Token": getAdminToken()! } : {}),
        ...(member ? { "X-Member-Token": member.token } : {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Lỗi xoá sự kiện" }));
      throw new Error(err.detail || "Lỗi xoá sự kiện");
    }
    return res.json();
  },
  approveEvent:     (id: number) => apiFetch(`/api/events/${id}/approve`, { method: "POST" }),
  rejectEvent:      (id: number) => apiFetch(`/api/events/${id}/reject`, { method: "POST" }),
  confirmDeleteEvent: (id: number) => apiFetch(`/api/events/${id}/confirm-delete`, { method: "POST" }),
  cancelDeleteEvent: (id: number) => apiFetch(`/api/events/${id}/cancel-delete`, { method: "POST" }),
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

  // Member identity (claim/login)
  getRoster:    () => apiFetch("/api/member/roster"),
  claimMember:  (player_tag: string, player_name: string, pin: string) =>
    apiFetch("/api/member/claim", { method: "POST", body: JSON.stringify({ player_tag, player_name, pin }) }),
  loginMember:  (player_tag: string, pin: string) =>
    apiFetch("/api/member/login", { method: "POST", body: JSON.stringify({ player_tag, pin }) }),
  releaseMember: (player_tag: string) =>
    apiFetch("/api/member/release", { method: "POST", body: JSON.stringify({ player_tag }) }),
  getMyMemberInfo: async () => {
    const member = getMemberAuth();
    if (!member) return null;
    const res = await fetch(`${API}/api/member/me`, { headers: { "X-Member-Token": member.token } });
    if (!res.ok) return null;
    return res.json();
  },

  // Chat
  getMessages: (room: "clan" | "global", afterId = 0) =>
    apiFetch(`/api/chat/messages?room=${room}&after_id=${afterId}&limit=50`),
  sendMessage: async (room: "clan" | "global", message: string, image_url?: string, sender_name?: string) => {
    const member = getMemberAuth();
    const res = await fetch(`${API}/api/chat/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(room === "clan" && member ? { "X-Member-Token": member.token } : {}),
      },
      body: JSON.stringify({ room, message, image_url, sender_name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Lỗi gửi tin nhắn" }));
      throw new Error(err.detail || "Lỗi gửi tin nhắn");
    }
    return res.json();
  },
  uploadChatImage: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API}/api/chat/upload-image`, { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Lỗi tải ảnh" }));
      throw new Error(err.detail || "Lỗi tải ảnh");
    }
    return res.json();
  },
};
