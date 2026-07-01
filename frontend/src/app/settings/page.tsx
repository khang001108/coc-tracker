"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Settings, Key, MessageSquare, Send, CheckCircle, AlertCircle, Eye, EyeOff, Loader2, Music2, Upload, Trash2, Play, Pause, UserX, ShieldCheck } from "lucide-react";
import { AdminGate } from "@/components/ui/AdminGate";
import { roleLabel, roleClass } from "@/lib/utils";

function MusicSettings() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [config, setConfig] = useState({ enabled: false, mode: "all", selected_id: "" });
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [t, c] = await Promise.all([api.getTracks().catch(() => []), api.getMusicConfig().catch(() => null)]);
    setTracks(t || []);
    if (c) setConfig(c);
  }

  useEffect(() => { load(); }, []);

  async function saveConfig(next: Partial<typeof config>) {
    const merged = { ...config, ...next };
    setConfig(merged);
    await api.updateMusicConfig(merged);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadTrack(file);
      }
      await load();
    } catch (err: any) {
      alert(err.message || "Lỗi tải nhạc lên");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Xoá bài hát này?")) return;
    await api.deleteTrack(id);
    await load();
  }

  function preview(track: any) {
    if (!previewRef.current) return;
    if (playingId === track.id) {
      previewRef.current.pause();
      setPlayingId(null);
    } else {
      previewRef.current.src = track.file_url;
      previewRef.current.play();
      setPlayingId(track.id);
    }
  }

  return (
    <div className="card space-y-4">
      <audio ref={previewRef} onEnded={() => setPlayingId(null)} />
      <h3 className="font-bold text-white flex items-center gap-2">
        <Music2 size={18} className="text-purple-400" /> Nhạc nền
      </h3>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-300">Bật nhạc nền cho website</p>
        <button onClick={() => saveConfig({ enabled: !config.enabled })}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 overflow-hidden ${config.enabled ? "bg-yellow-500" : "bg-gray-700"}`}
          style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)" }}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${config.enabled ? "translate-x-5" : "translate-x-0"}`}
            style={{ background: "linear-gradient(180deg, #fff, #e2e2e2)", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
        </button>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Chế độ phát</label>
        <div className="flex gap-2">
          <button onClick={() => saveConfig({ mode: "all" })}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${config.mode === "all" ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30" : "bg-gray-800 text-gray-400"}`}>
            Phát tất cả (lần lượt)
          </button>
          <button onClick={() => saveConfig({ mode: "single" })}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${config.mode === "single" ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30" : "bg-gray-800 text-gray-400"}`}>
            Phát 1 bài chỉ định
          </button>
        </div>
        {config.mode === "single" && (
          <select className="input mt-2" value={config.selected_id}
            onChange={e => saveConfig({ selected_id: e.target.value })}>
            <option value="">— Chọn bài hát —</option>
            {tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Danh sách bài hát ({tracks.length})</label>
        <div className="space-y-1.5 mb-3">
          {tracks.map(t => (
            <div key={t.id} className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2">
              <button onClick={() => preview(t)} className="p-1.5 rounded-full hover:bg-gray-700 text-yellow-400 shrink-0">
                {playingId === t.id ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <span className="text-sm text-white flex-1 truncate">{t.title}</span>
              <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-full hover:bg-gray-700 text-red-400 shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {tracks.length === 0 && <p className="text-sm text-gray-600">Chưa có bài hát nào</p>}
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="btn-secondary text-sm flex items-center gap-2 w-fit">
          <Upload size={14} /> {uploading ? "Đang tải lên..." : "Tải nhạc lên (chọn nhiều file)"}
        </button>
        <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleUpload} />
        <p className="text-[11px] text-gray-600 mt-1.5">Hỗ trợ MP3, WAV, OGG, M4A — tối đa 20MB mỗi file.</p>
      </div>
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white animate-scale-in ${
      type === "success" ? "bg-green-600" : "bg-red-600"
    }`}>
      {type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 overflow-hidden ${checked ? "bg-yellow-500" : "bg-gray-700"}`}
      style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)" }}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        style={{ background: "linear-gradient(180deg, #fff, #e2e2e2)", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
    </button>
  );
}

function SettingsPageInner({ embedded }: { embedded?: boolean }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showKey, setShowKey] = useState(false);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    api.getSettings()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set(key: string, val: string) {
    setSettings(s => ({ ...s, [key]: val }));
  }

  async function save(key: string) {
    setSaving(key);
    try {
      await api.saveSetting(key, settings[key] || "");
      showToast("Đã lưu thành công!");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(null);
    }
  }

  async function saveMultiple(keys: string[]) {
    setSaving(keys.join(","));
    try {
      await Promise.all(keys.map(k => api.saveSetting(k, settings[k] || "")));
      showToast("Đã lưu tất cả!");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(null);
    }
  }

  async function testClan() {
    setTesting("clan");
    try {
      const res = await api.testClan(settings.coc_api_key || "", settings.clan_tag || "");
      showToast(`✅ Kết nối OK: ${res.clan_name} (${res.members} thành viên)`);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setTesting(null);
    }
  }

  async function testDiscord() {
    setTesting("discord");
    try {
      await api.testDiscord(settings.discord_webhook || "");
      showToast("✅ Discord hoạt động!");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setTesting(null);
    }
  }

  async function testTelegram() {
    setTesting("telegram");
    try {
      await api.testTelegram(settings.telegram_bot_token || "", settings.telegram_chat_id || "");
      showToast("✅ Telegram hoạt động!");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setTesting(null);
    }
  }

  function LoadBtn({ k, label }: { k: string; label: string }) {
    const isSaving = saving === k || saving?.includes(k);
    return (
      <button onClick={() => save(k)} disabled={!!saving}
        className="btn-gold flex items-center gap-2 text-sm px-3 py-2 shrink-0 disabled:opacity-50">
        {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
        {label}
      </button>
    );
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-40 bg-gray-800 rounded-xl animate-pulse" />
      {[1,2,3].map(i => <div key={i} className="card h-40 animate-pulse bg-gray-800" />)}
    </div>
  );

  return (
    <div className={embedded ? "contents" : "space-y-6 max-w-5xl animate-fade-up"}>
      {!embedded && (
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings size={22} className="text-yellow-400" /> Cài đặt
          </h1>
          <p className="page-subtitle">Cấu hình API key, clan và thông báo</p>
        </div>
      )}

      <div className={embedded ? "contents" : "columns-1 lg:columns-2 gap-6 [&>*]:break-inside-avoid [&>*]:mb-6"}>

      {/* ── CoC API Key ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Key size={16} className="text-yellow-400" />
          </div>
          <h2 className="font-bold text-white">Clash of Clans API</h2>
        </div>

        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300 space-y-1">
          <p className="font-semibold">📌 Cách lấy API Key:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-400">
            <li>Vào <a href="https://developer.clashofclans.com" target="_blank" className="underline hover:text-white">developer.clashofclans.com</a></li>
            <li>Đăng nhập bằng tài khoản Supercell</li>
            <li>Tạo key mới với <strong>IP của server Render</strong> (xem trong Dashboard → Render → Settings → Static IP)</li>
            <li>Copy key và dán vào đây</li>
          </ol>
        </div>

        <div>
          <label className="label">API Key</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              name="coc_api_key_field"
              data-lpignore="true"
              data-1p-ignore
              value={settings.coc_api_key || ""}
              onChange={e => set("coc_api_key", e.target.value)}
              placeholder="eyJ0eXAiOiJKV1Qi..."
            />
            <button onClick={() => setShowKey(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Clan Tag</label>
          <input className="input" value={settings.clan_tag || ""}
            onChange={e => set("clan_tag", e.target.value.toUpperCase())}
            placeholder="#ABC123" />
          <p className="text-xs text-gray-600 mt-1">Ví dụ: #2PP (có dấu #)</p>
        </div>

        <div className="flex gap-2">
          <button onClick={testClan} disabled={!!testing}
            className="btn-secondary flex items-center gap-2 text-sm">
            {testing === "clan" ? <Loader2 size={14} className="animate-spin" /> : null}
            Test kết nối
          </button>
          <button onClick={() => saveMultiple(["coc_api_key", "clan_tag"])} disabled={!!saving}
            className="btn-gold flex items-center gap-2 text-sm">
            {saving?.includes("coc_api_key") ? <Loader2 size={14} className="animate-spin" /> : null}
            Lưu
          </button>
        </div>
      </div>

      {/* ── Discord ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <MessageSquare size={16} className="text-indigo-400" />
          </div>
          <h2 className="font-bold text-white">Discord Webhook</h2>
        </div>

        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
          <p className="font-semibold">📌 Cách lấy Webhook:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-indigo-400">
            <li>Vào Discord Server → Channel → Edit Channel</li>
            <li>Integrations → Webhooks → New Webhook</li>
            <li>Copy Webhook URL và dán vào đây</li>
          </ol>
        </div>

        <div>
          <label className="label">Webhook URL</label>
          <input className="input" type="url"
            value={settings.discord_webhook || ""}
            onChange={e => set("discord_webhook", e.target.value)}
            placeholder="https://discord.com/api/webhooks/..." />
        </div>

        <div className="flex gap-2">
          <button onClick={testDiscord} disabled={!!testing}
            className="btn-secondary flex items-center gap-2 text-sm">
            {testing === "discord" ? <Loader2 size={14} className="animate-spin" /> : null}
            Gửi test
          </button>
          <LoadBtn k="discord_webhook" label="Lưu" />
        </div>
      </div>

      {/* ── Telegram ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Send size={16} className="text-blue-400" />
          </div>
          <h2 className="font-bold text-white">Telegram Bot</h2>
        </div>

        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300 space-y-1">
          <p className="font-semibold">📌 Cách tạo Bot Telegram:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-400">
            <li>Nhắn @BotFather trên Telegram → /newbot</li>
            <li>Đặt tên và username cho bot</li>
            <li>Copy token và dán vào "Bot Token"</li>
            <li>Thêm bot vào group/channel → lấy Chat ID bằng @userinfobot</li>
          </ol>
        </div>

        <div>
          <label className="label">Bot Token</label>
          <input className="input" type="password"
            value={settings.telegram_bot_token || ""}
            onChange={e => set("telegram_bot_token", e.target.value)}
            placeholder="1234567890:ABCdef..." />
        </div>

        <div>
          <label className="label">Chat ID</label>
          <input className="input"
            value={settings.telegram_chat_id || ""}
            onChange={e => set("telegram_chat_id", e.target.value)}
            placeholder="-1001234567890 (group) hoặc 123456789 (cá nhân)" />
        </div>

        <div className="flex gap-2">
          <button onClick={testTelegram} disabled={!!testing}
            className="btn-secondary flex items-center gap-2 text-sm">
            {testing === "telegram" ? <Loader2 size={14} className="animate-spin" /> : null}
            Gửi test
          </button>
          <button onClick={() => saveMultiple(["telegram_bot_token", "telegram_chat_id"])} disabled={!!saving}
            className="btn-gold flex items-center gap-2 text-sm">
            {saving?.includes("telegram") ? <Loader2 size={14} className="animate-spin" /> : null}
            Lưu
          </button>
        </div>
      </div>

      {/* ── Notification toggles ── */}
      <div className="card space-y-4">
        <h2 className="font-bold text-white">🔔 Loại thông báo</h2>
        <p className="text-xs text-gray-500">Bật/tắt từng loại thông báo gửi qua Discord & Telegram</p>

        <div className="space-y-3">
          {[
            { key: "notify_war",    label: "⚔️ Nhắc đánh War",            desc: "Gửi khi còn < 2h kết thúc war và có member chưa đánh" },
            { key: "notify_raid",   label: "🏰 Nhắc tham gia Raid",       desc: "Gửi khi có member chưa raid trong Raid Weekend" },
            { key: "notify_donate", label: "❤️ Nhắc xin lính",            desc: "Phát hiện request lính mới (poll mỗi 5 phút)" },
            { key: "notify_member", label: "👥 Thành viên vào/rời clan",  desc: "Gửi ngay khi detect member join hoặc leave" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <ToggleSwitch
                checked={settings[key] === "true"}
                onChange={async () => {
                  const newVal = settings[key] === "true" ? "false" : "true";
                  set(key, newVal);
                  await api.saveSetting(key, newVal).catch(() => {});
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Xoá lịch sử chat tự động ── */}
      <div className="card space-y-3">
        <h2 className="font-bold text-white">💬 Lịch sử Chat</h2>
        <p className="text-xs text-gray-500">Tin nhắn cũ hơn số ngày dưới đây sẽ tự động bị xoá mỗi ngày.</p>
        <div className="flex items-center gap-2">
          <input type="number" min={1} max={365} className="input !w-28"
            value={settings.chat_retention_days ?? "30"}
            onChange={e => set("chat_retention_days", e.target.value)} />
          <span className="text-sm text-gray-400">ngày</span>
          <button onClick={() => api.saveSetting("chat_retention_days", settings.chat_retention_days || "30")}
            className="btn-gold text-sm ml-auto">Lưu</button>
        </div>
        <p className="text-[11px] text-gray-600">Đặt 0 để không tự xoá.</p>
      </div>

      {/* ── Dọn dẹp tài sản thành viên rời clan ── */}
      <div className="card space-y-3">
        <h2 className="font-bold text-white">🧹 Dọn dẹp tài sản người rời clan</h2>
        <p className="text-xs text-gray-500">
          Nếu 1 thành viên rời clan quá số ngày này, Coins và vật phẩm cửa hàng (lâu đài/pháo) của họ sẽ tự động bị xoá. Tài khoản đăng nhập (PIN) vẫn giữ nguyên — nếu quay lại clan vẫn đăng nhập được, chỉ là bắt đầu lại từ 0 Coins.
        </p>
        <div className="flex items-center gap-2">
          <input type="number" min={1} max={365} className="input !w-28"
            value={settings.asset_cleanup_days ?? "7"}
            onChange={e => set("asset_cleanup_days", e.target.value)} />
          <span className="text-sm text-gray-400">ngày</span>
          <button onClick={() => api.saveSetting("asset_cleanup_days", settings.asset_cleanup_days || "7")}
            className="btn-gold text-sm ml-auto">Lưu</button>
        </div>
      </div>

      {/* ── Manual notify ── */}
      <div className="card space-y-4">
        <h2 className="font-bold text-white">📢 Gửi thông báo thủ công</h2>
        <div>
          <label className="label">Tiêu đề</label>
          <input className="input mb-2" id="notif-title" placeholder="VD: Chuẩn bị War!" />
          <label className="label">Nội dung</label>
          <textarea className="input resize-none" id="notif-msg" rows={3}
            placeholder="Nhắn gửi đến tất cả thành viên..." />
        </div>
        <button onClick={async () => {
          const title = (document.getElementById("notif-title") as HTMLInputElement)?.value;
          const msg = (document.getElementById("notif-msg") as HTMLTextAreaElement)?.value;
          if (!msg) return showToast("Nhập nội dung thông báo", "error");
          try {
            await api.sendNotify(msg, title);
            showToast("Đã gửi thông báo!");
          } catch (e: any) {
            showToast(e.message, "error");
          }
        }} className="btn-gold w-full flex items-center justify-center gap-2">
          <Send size={16} /> Gửi ngay
        </button>
      </div>

      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

function MemberAccountsSettings() {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTag, setBusyTag] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { setRoster(await api.getRoster()); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleRelease(tag: string, name: string) {
    if (!confirm(`Gỡ tài khoản đã nhận cho "${name}"? Người này sẽ mất quyền chat Clan cho đến khi có ai nhận lại (có thể chính chủ nhận lại, hoặc người khác nhận nhầm thì người đúng có thể nhận lại).`)) return;
    setBusyTag(tag);
    try {
      await api.releaseMember(tag);
      await load();
    } catch (e: any) {
      alert(e.message || "Lỗi gỡ tài khoản");
    } finally {
      setBusyTag(null);
    }
  }

  const claimedList = roster.filter(m => m.claimed);

  return (
    <div className="card space-y-4">
      <h3 className="font-bold text-white flex items-center gap-2">
        <ShieldCheck size={18} className="text-blue-400" /> Quản lý tài khoản thành viên
      </h3>
      <p className="text-sm text-gray-400">
        Danh sách người đã "nhận" làm danh tính trong clan. Nếu ai đó nhận nhầm tên (vd nhận nhầm thành thủ lĩnh),
        bấm "Gỡ" để xoá lượt nhận đó — người đúng sẽ vào <a href="/login" className="text-yellow-500 underline">/login</a> nhận lại bình thường.
      </p>

      {loading ? (
        <div className="h-20 bg-gray-800 rounded-xl animate-pulse" />
      ) : claimedList.length === 0 ? (
        <p className="text-sm text-gray-600">Chưa có ai nhận tài khoản</p>
      ) : (
        <div className="space-y-1.5">
          {claimedList.map(m => (
            <div key={m.tag} className="flex items-center gap-3 bg-gray-800/50 rounded-xl px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                <p className={`text-xs ${roleClass(m.role)}`}>{roleLabel(m.role)}</p>
              </div>
              <button onClick={() => handleRelease(m.tag, m.name)} disabled={busyTag === m.tag}
                className="btn-danger text-xs !px-3 !py-1.5 flex items-center gap-1.5">
                <UserX size={13} /> {busyTag === m.tag ? "..." : "Gỡ"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShopPricingSettings() {
  const [items, setItems] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await api.getShopItems()); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save(item: any) {
    const val = edits[item.id];
    if (val === undefined) return;
    setSavingId(item.id);
    try {
      await api.updateShopItemPrice(item.id, Number(val));
      setToastMsg(`Đã cập nhật giá "${item.name}"`);
      setTimeout(() => setToastMsg(""), 2000);
      await load();
    } catch (e: any) {
      alert(e.message || "Lỗi cập nhật giá");
    } finally {
      setSavingId(null);
    }
  }

  const TYPE_LABEL: Record<string, string> = { castle: "🏰 Lâu đài", cannon: "💣 Pháo", effect: "✨ Hiệu ứng tên" };
  const grouped = items.reduce((acc: Record<string, any[]>, it) => {
    (acc[it.item_type] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="card space-y-4">
      <h3 className="font-bold text-white">🏷️ Giá Cửa hàng vật phẩm</h3>
      <p className="text-xs text-gray-500">Chỉnh giá Coins cho từng vật phẩm trong Cửa hàng. Đặt 0 = miễn phí mặc định.</p>
      {toastMsg && <p className="text-xs text-green-400">{toastMsg}</p>}
      {loading ? (
        <div className="h-24 bg-gray-800 rounded-xl animate-pulse" />
      ) : (
        Object.entries(grouped).map(([type, list]) => (
          <div key={type} className="space-y-1.5">
            <p className="text-xs text-gray-500 font-medium">{TYPE_LABEL[type] || type}</p>
            {list.map(item => (
              <div key={item.id} className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2">
                <span className="text-sm text-white flex-1 truncate">{item.name}</span>
                <input type="number" min={0} className="input !w-24 !py-1 text-xs"
                  defaultValue={item.price_coins}
                  onChange={e => setEdits({ ...edits, [item.id]: e.target.value })} />
                <button onClick={() => save(item)} disabled={savingId === item.id}
                  className="btn-secondary !px-2 !py-1 text-xs">
                  {savingId === item.id ? "..." : "Lưu"}
                </button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AdminGate>
      <div className="space-y-6 max-w-5xl animate-fade-up">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings size={22} className="text-yellow-400" /> Cài đặt
          </h1>
          <p className="page-subtitle">Cấu hình API key, clan và thông báo</p>
        </div>
        <div className="columns-1 lg:columns-2 gap-6 [&>*]:break-inside-avoid [&>*]:mb-6">
          <SettingsPageInner embedded />
          <MusicSettings />
          <MemberAccountsSettings />
          <ShopPricingSettings />
        </div>
      </div>
    </AdminGate>
  );
}
