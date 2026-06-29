const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Clan
  getClan:       () => apiFetch("/api/clan/"),
  refreshClan:   () => apiFetch("/api/clan/refresh"),

  // War
  getCurrentWar: () => apiFetch("/api/war/current"),
  getWarLog:     () => apiFetch("/api/war/log"),
  getCWL:        () => apiFetch("/api/war/cwl"),

  // Capital
  getRaidSeasons: () => apiFetch("/api/capital/raids"),

  // Games / Donate
  getClanGames:  () => apiFetch("/api/games/"),

  // Members
  getMembers:    () => apiFetch("/api/members/"),
  getMemberLog:  () => apiFetch("/api/members/log"),
  getPlayer:     (tag: string) => apiFetch(`/api/members/${encodeURIComponent(tag)}`),

  // Settings
  getSettings:   () => apiFetch("/api/settings/"),
  saveSetting:   (key: string, value: string) =>
    apiFetch("/api/settings/", { method: "POST", body: JSON.stringify({ key, value }) }),
  testClan: (api_key: string, clan_tag: string) =>
    apiFetch("/api/settings/test-clan", { method: "POST", body: JSON.stringify({ api_key, clan_tag }) }),
  testDiscord: (webhook_url: string) =>
    apiFetch("/api/settings/test-discord", { method: "POST", body: JSON.stringify({ webhook_url }) }),
  testTelegram: (bot_token: string, chat_id: string) =>
    apiFetch("/api/settings/test-telegram", { method: "POST", body: JSON.stringify({ bot_token, chat_id }) }),

  // Notify
  sendNotify: (message: string, title?: string) =>
    apiFetch("/api/notify/send", { method: "POST", body: JSON.stringify({ message, title }) }),
};
