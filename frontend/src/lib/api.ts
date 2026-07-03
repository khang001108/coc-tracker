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
      // Auto-inject clan ID cho multi-clan
      const clanId = typeof window !== "undefined"
        ? parseInt(localStorage.getItem("current_clan_id") || "1", 10)
        : 1;
      const clanHeader = (!isNaN(clanId) && clanId !== 1) ? { "X-Clan-ID": String(clanId) } : {};

      const res = await fetch(`${API}${path}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-Admin-Token": token } : {}),
          ...clanHeader,
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
  getWarActivity: (period: "week" | "month" | "all" = "all") => apiFetch(`/api/insights/war-activity?period=${period}`),
  getDonationTrend: (period: "week" | "month" | "all" = "all") => apiFetch(`/api/insights/donation-trend?period=${period}`),
  cleanupStatsNow: () => apiFetch("/api/settings/cleanup-stats-now", { method: "POST" }),
  getCWLCurrentWar: () => apiFetch("/api/war/cwl/current"),

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
  verifyAdminToken: () => apiFetch("/api/settings/verify-token"),

  // Settings
  getSettings:    () => apiFetch("/api/settings/"),
  getPublicSettings: () => apiFetch("/api/settings/public"),
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
  getParticipants:  (id: number) => apiFetch(`/api/events/${id}/participants`),
  joinEvent: async (id: number) => {
    const member = getMemberAuth();
    if (!member) throw new Error("Cần đăng nhập thành viên");
    const res = await fetch(`${API}/api/events/${id}/join`, {
      method: "POST",
      headers: { "X-Member-Token": member.token },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Lỗi tham gia" }));
      throw new Error(err.detail || "Lỗi tham gia");
    }
    return res.json();
  },
  leaveEvent: async (id: number) => {
    const member = getMemberAuth();
    if (!member) throw new Error("Cần đăng nhập thành viên");
    const res = await fetch(`${API}/api/events/${id}/leave`, {
      method: "DELETE",
      headers: { "X-Member-Token": member.token },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Lỗi rời sự kiện" }));
      throw new Error(err.detail || "Lỗi rời sự kiện");
    }
    return res.json();
  },
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
  reorderTracks: (order: number[]) => apiFetch("/api/music/tracks/reorder", { method: "PUT", body: JSON.stringify({ order }) }),
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
  claimMember:  (player_tag: string, player_name: string, pin: string, setup_code: string) =>
    apiFetch("/api/member/claim", { method: "POST", body: JSON.stringify({ player_tag, player_name, pin, setup_code }) }),
  isSetupCodeRequired: () => apiFetch("/api/member/setup-code-required"),
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

  // Clans (multi-clan management)
  listClans:   () => apiFetch("/api/clans/"),
  getClanById: (id: number) => apiFetch(`/api/clans/${id}`),  // multi-clan specific
  createClan:  (data: any) => apiFetch("/api/clans/", { method: "POST", body: JSON.stringify(data) }),
  updateClan:  (id: number, data: any) => apiFetch(`/api/clans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteClan:  (id: number) => apiFetch(`/api/clans/${id}`, { method: "DELETE" }),
  regenToken:  (id: number) => apiFetch(`/api/clans/${id}/regen-token`, { method: "POST" }),

  // Push notifications (thông báo ngoài app)
  getVapidKey:  () => apiFetch("/api/push/vapid-public-key"),
  pushSubscribe: (subscription: any, opts?: { notify_chat?: boolean; notify_event?: boolean }) =>
    apiFetch("/api/push/subscribe", {
      method: "POST",
      headers: (() => {
        const member = getMemberAuth();
        return member ? { "X-Member-Token": member.token } : {};
      })(),
      body: JSON.stringify({ subscription, ...opts }),
    }),
  pushUnsubscribe: (endpoint: string) =>
    apiFetch("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) }),
  pushPreferences: (endpoint: string, prefs: { notify_chat?: boolean; notify_event?: boolean }) =>
    apiFetch("/api/push/preferences", { method: "PUT", body: JSON.stringify({ endpoint, ...prefs }) }),

  // Chat
  getMessages: (room: "clan" | "global", afterId = 0) =>
    apiFetch(`/api/chat/messages?room=${room}&after_id=${afterId}&limit=50`),
  sendMessage: async (room: "clan" | "global", message: string, image_url?: string, sender_name?: string) => {
    const member = getMemberAuth();
    const res = await fetch(`${API}/api/chat/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(member ? { "X-Member-Token": member.token } : {}),
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

  // Shop (lâu đài / pháo)
  getShopItems: () => apiFetch("/api/shop/items"),
  getMyInventory: async () => {
    const member = getMemberAuth();
    if (!member) return null;
    const res = await fetch(`${API}/api/shop/my-inventory`, { headers: { "X-Member-Token": member.token } });
    if (!res.ok) return null;
    return res.json();
  },
  buyShopItem: async (itemId: number) => {
    const member = getMemberAuth();
    const res = await fetch(`${API}/api/shop/buy/${itemId}`, {
      method: "POST", headers: member ? { "X-Member-Token": member.token } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Lỗi mua vật phẩm" }));
      throw new Error(err.detail || "Lỗi mua vật phẩm");
    }
    return res.json();
  },
  equipShopItem: async (item_type: "castle" | "cannon" | "effect" | "number_effect", svg_key: string | null) => {
    const member = getMemberAuth();
    const res = await fetch(`${API}/api/shop/equip`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(member ? { "X-Member-Token": member.token } : {}) },
      body: JSON.stringify({ item_type, svg_key }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Lỗi trang bị" }));
      throw new Error(err.detail || "Lỗi trang bị");
    }
    return res.json();
  },
  updateShopItemPrice: (itemId: number, price_coins: number) =>
    apiFetch(`/api/shop/items/${itemId}/price`, { method: "PUT", body: JSON.stringify({ price_coins }) }),
};
