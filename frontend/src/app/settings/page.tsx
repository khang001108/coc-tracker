"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Settings, MessageSquare, Send, CheckCircle, AlertCircle, Loader2, Music2, Upload, Trash2, Play, Pause, UserX, ShieldCheck, Plus, Globe, Edit3, Copy } from "lucide-react";
import { AdminGate } from "@/components/ui/AdminGate";
import { InstallAppButton } from "@/components/ui/InstallAppButton";
import { roleLabel, roleClass } from "@/lib/utils";
import { getCurrentClanId } from "@/lib/clanContext";

function MiniToast({ msg, type = "error" }: { msg: string; type?: "error" | "success" }) {
  if (!msg) return null;
  return (
    <p className={`text-xs px-2.5 py-1.5 rounded-lg border ${
      type === "error"
        ? "text-red-400 bg-red-500/10 border-red-500/20"
        : "text-green-400 bg-green-500/10 border-green-500/20"}`}>
      {msg}
    </p>
  );
}

function MusicSettings() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [config, setConfig] = useState({ enabled: false, mode: "all", selected_id: "" });
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function flashMsg(text: string, type: "error" | "success" = "error") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

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
      flashMsg("Đã tải nhạc lên!", "success");
    } catch (err: any) {
      flashMsg(err.message || "Lỗi tải nhạc lên");
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

  // Kéo-thả sắp xếp thứ tự phát nhạc
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDrop(dropIndex: number) {
    if (dragIndex.current === null || dragIndex.current === dropIndex) {
      dragIndex.current = null; setDragOverIndex(null);
      return;
    }
    const next = [...tracks];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(dropIndex, 0, moved);
    setTracks(next);
    dragIndex.current = null;
    setDragOverIndex(null);
    api.reorderTracks(next.map(t => t.id))
      .then(() => flashMsg("Đã lưu thứ tự phát nhạc mới", "success"))
      .catch((e: any) => flashMsg(e.message || "Lỗi lưu thứ tự"));
  }

  return (
    <details className="card !p-0 group">
      <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors">
        <span className="font-bold text-white flex items-center gap-2">
          <Music2 size={18} className="text-purple-400" /> Nhạc nền
        </span>
        <span className="text-xs text-gray-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="px-4 pb-4 space-y-4">
      <audio ref={previewRef} onEnded={() => setPlayingId(null)} />

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
        <label className="text-xs text-gray-500 mb-1.5 block">Danh sách bài hát ({tracks.length}) — kéo-thả ⠿ để đổi thứ tự phát</label>
        <div className="space-y-1.5 mb-3">
          {tracks.map((t, i) => (
            <div key={t.id}
              draggable
              onDragStart={() => { dragIndex.current = i; }}
              onDragOver={e => { e.preventDefault(); setDragOverIndex(i); }}
              onDragLeave={() => setDragOverIndex(o => (o === i ? null : o))}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { dragIndex.current = null; setDragOverIndex(null); }}
              className={`flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2 transition-colors ${
                dragOverIndex === i ? "ring-1 ring-yellow-500 bg-yellow-500/10" : ""}`}>
              <span className="text-gray-600 cursor-grab active:cursor-grabbing select-none shrink-0" title="Kéo để sắp xếp">⠿</span>
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
        {msg && <div className="mt-1.5"><MiniToast msg={msg.text} type={msg.type} /></div>}
      </div>
      </div>
    </details>
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

/** Nút "Tải ảnh từ thư viện máy" dùng chung cho mọi chỗ chọn ảnh nền trong
 * Cài đặt — tận dụng lại API upload ảnh sự kiện đã có sẵn. */
function UploadFromDeviceButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr("");
    try {
      const res = await api.uploadEventImage(file);
      onUploaded(res.url);
    } catch (e: any) { setErr(e.message || "Lỗi tải ảnh lên"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div>
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="btn-secondary text-xs w-full flex items-center justify-center gap-1.5">
        <Upload size={13}/> {uploading ? "Đang tải lên..." : "📷 Thêm ảnh từ thư viện trong máy"}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {err && <p className="text-[10px] text-red-400 mt-1">{err}</p>}
    </div>
  );
}

function SettingsPageInner({ embedded }: { embedded?: boolean }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [bannerPage, setBannerPage] = useState("login");
  const [testNotifyMsg, setTestNotifyMsg] = useState("");

  async function testNotifySample() {
    setTesting("notify-sample"); setTestNotifyMsg("");
    try {
      await api.testNotifySample();
      setTestNotifyMsg("✅ Đã gửi 2 tin mẫu (Donate + War nhận Coins) — kiểm tra Discord/Telegram của clan đang chọn.");
    } catch (e: any) {
      setTestNotifyMsg("❌ " + (e.message || "Lỗi gửi thông báo mẫu — kiểm tra đã lưu Discord Webhook / Telegram Bot Token & Chat ID chưa."));
    } finally {
      setTesting(null);
    }
  }
  const [detectedChats, setDetectedChats] = useState<any[] | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectHint, setDetectHint] = useState("");

  async function detectTelegramChats() {
    if (!settings.telegram_bot_token?.trim()) {
      showToast("Cần dán Bot Token vào ô bên trên trước", "error");
      return;
    }
    setDetecting(true); setDetectedChats(null); setDetectHint("");
    try {
      const res = await api.telegramDetectChats(settings.telegram_bot_token.trim());
      if (!res.chats?.length) {
        setDetectHint(res.hint || "Chưa tìm thấy chat nào.");
      } else {
        setDetectedChats(res.chats);
      }
    } catch (e: any) {
      showToast(e.message || "Lỗi lấy Chat ID", "error");
    } finally {
      setDetecting(false);
    }
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    api.getSettings()
      .then(async (s) => {
        setSettings(s);
        // Discord/Telegram thật ra được gửi theo CẤU HÌNH RIÊNG CỦA TỪNG CLAN
        // (bảng clans), không phải theo cấu hình chung này — nạp đè giá trị
        // đúng của clan đang chọn vào đây để hiện + lưu cho đúng chỗ, tránh
        // lưu vào chỗ không ai đọc (đây chính là lý do "bấm Test không thấy
        // gửi gì" — trước đây lưu nhầm vào bảng settings chung).
        try {
          const clan = await api.getClanById(getCurrentClanId());
          setSettings(s2 => ({
            ...s2,
            discord_webhook: clan.discord_webhook || "",
            telegram_bot_token: clan.telegram_bot_token || "",
            telegram_chat_id: clan.telegram_chat_id || "",
          }));
        } catch {}
      })
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

  async function saveClanConfig(fields: Record<string, string>, label: string) {
    setSaving(Object.keys(fields).join(","));
    try {
      await api.updateClan(getCurrentClanId(), fields);
      showToast(`Đã lưu ${label} cho clan đang chọn!`);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(null);
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
    <div className={embedded ? "contents" : "space-y-6 max-w-7xl animate-fade-up"}>
      {!embedded && (
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings size={22} className="text-yellow-400" /> Cài đặt
          </h1>
          <p className="page-subtitle">Cấu hình API key, clan và thông báo</p>
        </div>
      )}

      <div className={embedded ? "contents" : "columns-1 lg:columns-2 gap-6 [&_.card]:break-inside-avoid [&_.card]:mb-6"}>

      {/* ── Quản lý Clan (đã gộp chung với cấu hình CoC API — mỗi clan, kể cả
           clan chính, đều sửa Tag + API Key ngay trong danh sách bên dưới) ── */}
      <details className="card !p-0 group" open>
        <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors">
          <span className="font-bold text-white flex items-center gap-2">🏰 Quản lý Clan</span>
          <span className="text-xs text-gray-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="px-4 pb-4 space-y-4">
        <p className="text-xs text-gray-500">Thêm/sửa/xoá clan. Mỗi clan cần CoC API key riêng.</p>

        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300 space-y-1">
          <p className="font-semibold">📌 Cách lấy API Key:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-400">
            <li>Vào <a href="https://developer.clashofclans.com" target="_blank" className="underline hover:text-white">developer.clashofclans.com</a></li>
            <li>Đăng nhập bằng tài khoản Supercell</li>
            <li>Tạo API Key mới</li>
            <li>Trong mục <strong>Allowed IP Addresses</strong>, nhập IP public của server: <strong>45.79.218.79</strong></li>
            <li>Tạo Key, sau đó sao chép (Copy) API Key</li>
            <li>Dán API Key vào ô bên dưới</li>
          </ol>
        </div>

        <ClanManagement />
        </div>
      </details>

      {/* ── Discord ── */}
      <details className="card !p-0 group">
        <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors">
          <span className="font-bold text-white flex items-center gap-2">
            <MessageSquare size={16} className="text-indigo-400" /> Discord Webhook
          </span>
          <span className="text-xs text-gray-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="px-4 pb-4 space-y-4">

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
          <button onClick={() => saveClanConfig({ discord_webhook: settings.discord_webhook || "" }, "Discord Webhook")}
            disabled={!!saving} className="btn-gold flex items-center gap-2 text-sm px-3 py-2 shrink-0 disabled:opacity-50">
            {saving?.includes("discord_webhook") ? <Loader2 size={14} className="animate-spin" /> : null}
            Lưu
          </button>
        </div>
        </div>
      </details>

      {/* ── Telegram ── */}
      <details className="card !p-0 group">
        <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors">
          <span className="font-bold text-white flex items-center gap-2">
            <Send size={16} className="text-blue-400" /> Telegram Bot
          </span>
          <span className="text-xs text-gray-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="px-4 pb-4 space-y-4">

        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300 space-y-1">
          <p className="font-semibold">📌 Cách tạo Bot Telegram:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-400">
            <li>Nhắn tin với @BotFather trên Telegram và gửi lệnh /newbot</li>
            <li>Đặt tên và username cho bot</li>
            <li>Sao chép Bot Token và dán vào ô Bot Token bên dưới</li>
            <li>Thêm bot vào group hoặc channel (nếu sử dụng)</li>
            <li>Gửi 1 tin nhắn bất kỳ cho bot hoặc trong group có bot</li>
            <li>Bấm nút <strong>"📡 Lấy Chat ID"</strong> bên dưới — web sẽ tự tìm giúp, không cần làm thủ công qua trình duyệt nữa</li>
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

        <div>
          <button onClick={detectTelegramChats} disabled={detecting}
            className="btn-secondary text-sm w-full flex items-center justify-center gap-2">
            {detecting ? <Loader2 size={14} className="animate-spin"/> : "📡"} {detecting ? "Đang tìm..." : "Lấy Chat ID"}
          </button>
          {detectHint && <p className="text-[11px] text-gray-500 mt-1.5">{detectHint}</p>}
          {detectedChats && detectedChats.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] text-gray-500">Bấm để chọn đúng nhóm/phiên chat của bạn:</p>
              {detectedChats.map(c => (
                <button key={c.chat_id} onClick={() => { set("telegram_chat_id", c.chat_id); setDetectedChats(null); }}
                  className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-xl text-xs transition-colors ${
                    settings.telegram_chat_id === c.chat_id ? "bg-yellow-500/20 border border-yellow-500/40" : "bg-gray-800 hover:bg-gray-700"}`}>
                  <span className="truncate">
                    <span className="font-semibold text-white">{c.name}</span>
                    <span className="text-gray-500 ml-1.5">({c.type === "group" || c.type === "supergroup" ? "nhóm" : c.type === "channel" ? "kênh" : "cá nhân"})</span>
                  </span>
                  <span className="text-gray-500 shrink-0 ml-2">{c.chat_id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={testTelegram} disabled={!!testing}
            className="btn-secondary flex items-center gap-2 text-sm">
            {testing === "telegram" ? <Loader2 size={14} className="animate-spin" /> : null}
            Gửi test
          </button>
          <button onClick={() => saveClanConfig({ telegram_bot_token: settings.telegram_bot_token || "", telegram_chat_id: settings.telegram_chat_id || "" }, "Telegram Bot")}
            disabled={!!saving}
            className="btn-gold flex items-center gap-2 text-sm">
            {saving?.includes("telegram") ? <Loader2 size={14} className="animate-spin" /> : null}
            Lưu
          </button>
        </div>
        </div>
      </details>

      {/* ── Cài đặt nâng cao (thu gọn bớt cho đỡ dài) ── */}
      <details className="group">
        <summary className="cursor-pointer list-none flex items-center justify-between p-3 rounded-xl mb-3"
          style={{ background: "var(--py-card-bg)", border: "1px solid var(--py-card-border)" }}>
          <span className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--py-card-text)" }}>
            ⚙️ Cài đặt nâng cao
          </span>
          <span className="text-xs text-gray-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="space-y-6">

      {/* ── Notification toggles ── */}
      <div className="card space-y-4">
        <h2 className="font-bold text-white">🔔 Loại thông báo</h2>
        <p className="text-xs text-gray-500">Bật/tắt từng loại thông báo gửi qua Discord & Telegram</p>

        {/* Thời gian nhắc nhở — tuỳ chỉnh được, mặc định War/CWL 2h, Raid 24h */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Nhắc War/CWL trước khi kết thúc</label>
            <div className="flex items-center gap-1.5">
              <input type="number" min={0.5} max={24} step={0.5} className="input !w-20 text-center"
                value={settings.war_reminder_hours || "2"}
                onChange={e => set("war_reminder_hours", e.target.value)} />
              <span className="text-xs text-gray-500">giờ</span>
              <button onClick={() => save("war_reminder_hours")} className="btn-secondary text-xs shrink-0 ml-auto">Lưu</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Nhắc Raid trước khi kết thúc</label>
            <div className="flex items-center gap-1.5">
              <input type="number" min={1} max={72} step={1} className="input !w-20 text-center"
                value={settings.raid_reminder_hours || "24"}
                onChange={e => set("raid_reminder_hours", e.target.value)} />
              <span className="text-xs text-gray-500">giờ</span>
              <button onClick={() => save("raid_reminder_hours")} className="btn-secondary text-xs shrink-0 ml-auto">Lưu</button>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-gray-600">Mỗi war/raid chỉ nhắc đúng 1 lần trong khoảng thời gian này (không spam lặp lại mỗi 5 phút như trước).</p>

        <div className="space-y-3">
          {[
            { key: "notify_war",       label: "⚔️ Nhắc đánh War",            desc: "Gửi 1 lần khi còn đúng số giờ đã đặt ở trên và có member chưa đánh" },
            { key: "notify_cwl",       label: "🏆 Nhắc đánh CWL",            desc: "Tương tự War thường nhưng áp dụng cho vòng CWL đang diễn ra" },
            { key: "notify_raid",      label: "🏰 Nhắc tham gia Raid",       desc: "Gửi 1 lần khi còn đúng số giờ đã đặt ở trên và có member chưa raid" },
            { key: "notify_donate",    label: "🎁 Donate nhận Coins",        desc: "Gửi khi có người donate và được cộng Coins (CoC không có API 'xin lính' theo thời gian thực nên chỉ báo được SAU khi đã donate xong)" },
            { key: "notify_war_coins", label: "⚔️ War nhận Coins",           desc: "Gửi khi có người đạt sao trong war và được cộng Coins" },
            { key: "notify_member",    label: "👥 Thành viên vào/rời clan",  desc: "Gửi ngay khi detect member join hoặc leave" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <ToggleSwitch
                checked={settings[key] !== "false"}
                onChange={async () => {
                  const newVal = settings[key] === "false" ? "true" : "false";
                  set(key, newVal);
                  await api.saveSetting(key, newVal).catch(() => {});
                }}
              />
            </div>
          ))}
        </div>

        <button onClick={testNotifySample} disabled={!!testing}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
          {testing === "notify-sample" ? <Loader2 size={14} className="animate-spin"/> : "🔔"} Test gửi thông báo mẫu
        </button>
        {testNotifyMsg && <p className="text-[11px] text-gray-500">{testNotifyMsg}</p>}
      </div>

      {/* ── Xoá lịch sử chat tự động ── */}
      <div className="card space-y-3">
        <h2 className="font-bold text-white">💬 Lịch sử Chat liên clan</h2>
        <p className="text-xs text-gray-500">Tin nhắn ở Chat liên clan cũ hơn số ngày dưới đây sẽ tự động bị xoá. Chat Clan không bị ảnh hưởng, luôn được giữ lại.</p>
        <div className="flex items-center gap-2">
          <input type="number" min={1} max={365} className="input !w-28"
            value={settings.chat_retention_days ?? "1"}
            onChange={e => set("chat_retention_days", e.target.value)} />
          <span className="text-sm text-gray-400">ngày</span>
          <button onClick={() => api.saveSetting("chat_retention_days", settings.chat_retention_days || "1")}
            className="btn-gold text-sm ml-auto">Lưu</button>
        </div>
        <p className="text-[11px] text-gray-600">Đặt 0 để không tự xoá.</p>
      </div>

      {/* ── Xoá dữ liệu thống kê tích luỹ ── */}
      <div className="card space-y-3">
        <h2 className="font-bold text-white">📊 Dữ liệu thống kê tích luỹ</h2>
        <p className="text-xs text-gray-500">
          Lượt tham chiến war + lịch sử donate dùng để tính "War yếu nhất / Hay bỏ war / Donate ít nhất" ở trang Thống kê.
          Dữ liệu cũ hơn số ngày dưới đây sẽ tự động bị xoá — để trống/0 để giữ vĩnh viễn (khuyến khích nếu muốn xem "Từ đầu").
        </p>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={3650} className="input !w-28"
            value={settings.stats_retention_days ?? "0"}
            onChange={e => set("stats_retention_days", e.target.value)} />
          <span className="text-sm text-gray-400">ngày</span>
          <button onClick={() => api.saveSetting("stats_retention_days", settings.stats_retention_days || "0")}
            className="btn-gold text-sm ml-auto">Lưu</button>
        </div>
        <button onClick={async () => {
          if (!confirm("Xoá ngay dữ liệu thống kê cũ hơn số ngày đã cấu hình ở trên?")) return;
          try { await api.cleanupStatsNow(); showToast("Đã dọn dẹp xong!"); }
          catch (e: any) { showToast(e.message, "error"); }
        }} className="btn-secondary text-sm w-full">🗑️ Xoá ngay</button>
      </div>

      {/* ── Xoá cache tạm để web luôn mượt ── */}
      <div className="card space-y-3">
        <h2 className="font-bold text-white">🧹 Bộ nhớ đệm (Cache)</h2>
        <p className="text-xs text-gray-500">
          Dữ liệu CWL (bảng xếp hạng, top đánh hay...) được lưu tạm ~3 phút để web tải nhanh hơn,
          không phải gọi lại CoC API mỗi lần mở trang. Nếu thấy dữ liệu có vẻ cũ và không muốn đợi tự hết hạn,
          bấm nút bên dưới để xoá ngay và tải lại dữ liệu mới nhất.
        </p>
        <button onClick={async () => {
          try {
            const res = await api.clearCache();
            showToast(`Đã xoá ${res.cleared} mục cache — lần mở CWL tiếp theo sẽ tải mới hoàn toàn.`);
          } catch (e: any) { showToast(e.message, "error"); }
        }} className="btn-secondary text-sm w-full">🧹 Xoá cache tạm ngay</button>
      </div>

      {/* ── Ảnh nền Chat ── */}
      <div className="card space-y-3">
        <h2 className="font-bold text-white">🖼️ Ảnh nền Chat</h2>
        <p className="text-xs text-gray-500">Chọn ảnh nền mờ phía sau khung chat (áp dụng cho mọi người, cả Chat Clan lẫn Chat liên clan).</p>
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => set("chat_background_image", "")}
            className={`aspect-square rounded-xl border-2 flex items-center justify-center text-[10px] text-gray-500 ${
              !settings.chat_background_image ? "border-yellow-500" : "border-gray-700"}`}>
            Không dùng
          </button>
          {["archer-queen-army", "giant-sunset", "giants-balloons-desert"].map(name => (
            <button key={name} onClick={() => set("chat_background_image", `/art/${name}.jpg`)}
              className={`aspect-square rounded-xl overflow-hidden border-2 ${
                settings.chat_background_image === `/art/${name}.jpg` ? "border-yellow-500" : "border-transparent"}`}>
              <img src={`/art/${name}.jpg`} alt={name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-1 block">Hoặc dán link ảnh khác (URL)</label>
          <input className="input text-xs" placeholder="https://..."
            value={settings.chat_background_image?.startsWith("/art/") ? "" : (settings.chat_background_image || "")}
            onChange={e => set("chat_background_image", e.target.value)} />
        </div>
        <UploadFromDeviceButton onUploaded={url => set("chat_background_image", url)} />
        <button onClick={() => save("chat_background_image")} disabled={!!saving}
          className="btn-gold text-sm w-full">Lưu ảnh nền Chat</button>
      </div>

      {/* ── Thẻ hiển thị ở Tổng quan ── */}
      <div className="card space-y-3">
        <h2 className="font-bold text-white">🏠 Thẻ hiển thị ở Tổng quan</h2>
        <p className="text-xs text-gray-500">Ẩn/hiện các thẻ War, CWL, Clan Capital ở trang Tổng quan (chỉ ẩn khi có sự kiện đang diễn ra, không ảnh hưởng trang riêng của từng mục).</p>
        {[
          { key: "overview_show_war", label: "⚔️ Thẻ War đang diễn ra" },
          { key: "overview_show_cwl", label: "🏆 Thẻ Clan War League" },
          { key: "overview_show_capital", label: "🏰 Thẻ Clan Capital / Raid Weekend" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between text-sm" style={{ color: "var(--py-card-text)" }}>
            {label}
            <ToggleSwitch
              checked={settings[key] !== "false"}
              onChange={() => {
                const next = settings[key] === "false" ? "true" : "false";
                set(key, next);
                api.saveSetting(key, next).catch(() => {});
              }}
            />
          </label>
        ))}
      </div>

      {/* ── Màu tia lửa hiệu ứng ── */}
      <div className="card space-y-3">
        <h2 className="font-bold text-white">✨ Màu tia lửa hiệu ứng</h2>
        <p className="text-xs text-gray-500">Đổi màu tia lửa bay ở các khung có hiệu ứng lửa (Đăng nhập, Cửa hàng, War, Tổng quan, Clan Capital, Clan Games...) — áp dụng chung cho toàn bộ web.</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: "gold", label: "Vàng lửa", swatch: "linear-gradient(135deg,#FFED8A,#FF6A00)" },
            { key: "blue", label: "Xanh dương", swatch: "linear-gradient(135deg,#C9F0FF,#0288D1)" },
            { key: "purple", label: "Tím", swatch: "linear-gradient(135deg,#E9D5FF,#6D28D9)" },
            { key: "pink", label: "Hồng", swatch: "linear-gradient(135deg,#FFD6EC,#BE185D)" },
          ].map(o => (
            <button key={o.key}
              onClick={() => { set("ember_color", o.key); api.saveSetting("ember_color", o.key).catch(() => {}); }}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-colors ${
                (settings.ember_color || "gold") === o.key ? "border-yellow-500" : "border-transparent"}`}>
              <span className="w-8 h-8 rounded-full" style={{ background: o.swatch, boxShadow: "0 0 8px rgba(0,0,0,0.3)" }} />
              <span className="text-[10px] text-gray-400">{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Ảnh nền từng mục ── */}
      <div className="card space-y-3">
        <h2 className="font-bold text-white">🖼️ Ảnh nền từng mục</h2>
        <p className="text-xs text-gray-500">Đổi ảnh nền riêng cho từng trang — chọn trang, rồi chọn ảnh (hoặc dán link ảnh khác), Lưu là áp dụng ngay.</p>

        <select className="input text-sm" value={bannerPage} onChange={e => setBannerPage(e.target.value)}>
          <option value="login">Nhận diện thành viên</option>
          <option value="shop">Cửa hàng</option>
          <option value="events">Sự kiện</option>
          <option value="capital">Clan Capital</option>
          <option value="members">Thành viên</option>
          <option value="donate">Donate &amp; Clan Games</option>
          <option value="games">Clan Games (trang riêng)</option>
          <option value="stats">Thống kê</option>
          <option value="war">War &amp; CWL</option>
          <option value="overview_war">Tổng quan · thẻ War</option>
          <option value="overview_cwl">Tổng quan · thẻ CWL</option>
        </select>

        {(() => {
          let banners: Record<string, string> = {};
          try { banners = settings.page_banners ? JSON.parse(settings.page_banners) : {}; } catch {}
          const current = banners[bannerPage] || "";
          const ART_OPTIONS = [
            "archer-queen-army", "balloon-swarm-skulls", "barbarian-fireball", "capital-sky-islands",
            "dragon-fire-logo", "giant-sunset", "giants-balloons-desert", "pekka-lava",
            "prince-celebration", "royal-vista", "ruins-aftermath", "skeleton-king", "wizard-fireball-goblins",
          ];
          function pick(src: string) {
            const next = { ...banners, [bannerPage]: src };
            const json = JSON.stringify(next);
            set("page_banners", json);
            api.saveSetting("page_banners", json).then(() => showToast("Đã đổi ảnh nền!")).catch(() => {});
          }
          function reset() {
            const next = { ...banners };
            delete next[bannerPage];
            const json = JSON.stringify(next);
            set("page_banners", json);
            api.saveSetting("page_banners", json).then(() => showToast("Đã đưa về ảnh mặc định")).catch(() => {});
          }
          return (
            <>
              <div className="grid grid-cols-5 gap-1.5">
                {ART_OPTIONS.map(name => (
                  <button key={name} onClick={() => pick(`/art/${name}.jpg`)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${
                      current === `/art/${name}.jpg` ? "border-yellow-500" : "border-transparent"}`}>
                    <img src={`/art/${name}.jpg`} alt={name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input text-xs flex-1" placeholder="Hoặc dán link ảnh khác (URL)"
                  defaultValue={current.startsWith("/art/") ? "" : current}
                  onKeyDown={e => { if (e.key === "Enter") pick((e.target as HTMLInputElement).value); }} />
                <button onClick={reset} className="btn-secondary text-xs shrink-0">Mặc định</button>
              </div>
              <UploadFromDeviceButton onUploaded={pick} />
              {current && <p className="text-[10px] text-gray-600">Đang dùng: {current}</p>}
            </>
          );
        })()}
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
      </details>

      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

function EventReportsSettings() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setReports(await api.getEventReports()); } catch {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const openReports = reports.filter(r => r.status !== "resolved");

  return (
    <details className="card !p-0 group">
      <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors">
        <span className="font-bold text-white flex items-center gap-2">
          🚩 Báo cáo sự kiện {openReports.length > 0 && <span className="badge-red text-[10px]">{openReports.length} mới</span>}
        </span>
        <span className="text-xs text-gray-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="px-4 pb-4 space-y-2">
        <p className="text-xs text-gray-500">Thành viên báo cáo sự kiện sai trái/lừa đảo sẽ hiện ở đây.</p>
        {loading ? (
          <p className="text-xs text-gray-600">Đang tải...</p>
        ) : reports.length === 0 ? (
          <p className="text-xs text-gray-600">Chưa có báo cáo nào.</p>
        ) : (
          reports.map(r => (
            <div key={r.id} className={`p-3 rounded-xl border ${r.status === "resolved" ? "border-gray-800 opacity-50" : "border-red-500/30 bg-red-500/5"}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-white">{r.event_title}</p>
                {r.status !== "resolved" && (
                  <button onClick={async () => { await api.resolveEventReport(r.id); load(); }}
                    className="text-[11px] text-green-400 hover:underline">Đánh dấu đã xử lý</button>
                )}
              </div>
              <p className="text-xs text-gray-400">{r.reason}</p>
              <p className="text-[10px] text-gray-600 mt-1">Từ {r.reporter_name} · {new Date(r.created_at).toLocaleString("vi-VN")}</p>
            </div>
          ))
        )}
      </div>
    </details>
  );
}

function MemberAccountsSettings() {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTag, setBusyTag] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);

  function flashMsg(text: string, type: "error" | "success" = "error") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

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
      flashMsg(`Đã gỡ tài khoản của ${name}`, "success");
    } catch (e: any) {
      flashMsg(e.message || "Lỗi gỡ tài khoản");
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
      {msg && <MiniToast msg={msg.text} type={msg.type} />}

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
  const [toastErr, setToastErr] = useState("");

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
      setToastErr(e.message || "Lỗi cập nhật giá");
      setTimeout(() => setToastErr(""), 4000);
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
    <details className="card !p-0 group">
      <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors">
        <span className="font-bold text-white">🏷️ Giá Cửa hàng vật phẩm</span>
        <span className="text-xs text-gray-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="px-4 pb-4 space-y-4">
      <p className="text-xs text-gray-500">Chỉnh giá Coins cho từng vật phẩm trong Cửa hàng. Đặt 0 = miễn phí mặc định.</p>
      {toastMsg && <p className="text-xs text-green-400">{toastMsg}</p>}
      {toastErr && <MiniToast msg={toastErr} type="error" />}
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
    </details>
  );
}


// ── Clan Management ────────────────────────────────────────────────────────
function ClanManagement() {
  const [clans, setClans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ clan_tag: "", coc_api_key: "" });
  const [preview, setPreview] = useState<{ name: string; badge: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok"|"err"; text: string } | null>(null);
  const [keyRevealed, setKeyRevealed] = useState(false);

  const flash = (type: "ok"|"err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  async function load() {
    setLoading(true);
    try {
      const data = await api.listClans();
      setClans(data);
    } catch (e: any) {
      flash("err", `Lỗi tải danh sách: ${e?.message || "Không kết nối được backend"}`);
      setClans([]);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startAdd() {
    setForm({ clan_tag: "", coc_api_key: "" });
    setPreview(null);
    setEditId(null);
    setKeyRevealed(true);
    setShowForm(true);
  }

  async function startEdit(cl: any) {
    setEditId(cl.id);
    setPreview({ name: cl.clan_name, badge: cl.badge_url || "" });
    setForm({ clan_tag: cl.clan_tag, coc_api_key: "" });
    setKeyRevealed(false);
    setShowForm(true);
    // Danh sách công khai (list_clans) không trả về API key thật (tránh lộ
    // cho người không phải admin) — nên phải gọi riêng endpoint chỉ-admin
    // này để lấy đúng key đang lưu, hiển thị dạng ẩn (••••) thay vì để trống
    // bắt gõ lại từ đầu mỗi lần sửa.
    try {
      const full = await api.getClanById(cl.id);
      setForm({ clan_tag: full.clan_tag, coc_api_key: full.coc_api_key || "" });
      setKeyRevealed(!full.coc_api_key);
    } catch {
      setKeyRevealed(true); // không lấy được key cũ — cho gõ tay luôn
    }
  }

  // Kiểm tra clan tag + API key → hiện tên clan nếu thành công
  async function kiemTra() {
    const tag = form.clan_tag.trim();
    const key = form.coc_api_key.trim();
    if (!tag || !key) { flash("err", "Nhập đủ Clan Tag và API Key"); return; }
    setTesting(true);
    setPreview(null);
    try {
      const res = await api.testClan(key, tag);
      if (res?.ok && res?.clan_name) {
        setPreview({ name: res.clan_name, badge: res.badgeUrls?.medium || "" });
        flash("ok", `✅ Tìm thấy: ${res.clan_name} (${res.members} thành viên)`);
      } else {
        flash("err", "Không tìm thấy clan. Kiểm tra tag và API key.");
      }
    } catch (e: any) {
      flash("err", e?.message || "Kết nối thất bại");
    }
    setTesting(false);
  }

  async function save() {
    if (!preview) { flash("err", "Kiểm tra kết nối trước khi lưu"); return; }
    setSaving(true);
    try {
      const payload = {
        clan_tag: form.clan_tag.trim(),
        clan_name: preview.name,
        coc_api_key: form.coc_api_key.trim(),
      };
      if (editId) await api.updateClan(editId, payload);
      else await api.createClan(payload);
      flash("ok", editId ? "Đã cập nhật!" : "Thêm clan thành công!");
      setShowForm(false);
      setEditId(null);
      setPreview(null);
      load();
    } catch (e: any) { flash("err", e?.message || "Lỗi lưu"); }
    setSaving(false);
  }

  async function del(id: number, name: string) {
    if (!confirm(`Xoá clan "${name}"? Dữ liệu sự kiện và chat sẽ bị xoá.`)) return;
    try { await api.deleteClan(id); flash("ok", "Đã xoá"); load(); }
    catch (e: any) { flash("err", e?.message || "Không thể xoá clan chính"); }
  }

  return (
    <div className="space-y-3">
      {/* Flash message */}
      {msg && (
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${msg.type === "ok" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          {msg.type === "ok" ? <CheckCircle size={15}/> : <AlertCircle size={15}/>} {msg.text}
        </div>
      )}

      {/* Danh sách clan hiện có */}
      {loading ? (
        <div className="flex justify-center py-3"><Loader2 size={18} className="animate-spin text-yellow-400"/></div>
      ) : clans.length > 0 ? (
        <div className="space-y-2">
          {clans.map(cl => (
            <div key={cl.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "var(--py-card-bg)", border: `1px solid ${cl.id === 1 ? "rgba(244,161,48,0.4)" : "var(--py-card-border)"}` }}>
              {cl.badge_url ? (
                <img src={cl.badge_url} alt="" className="w-8 h-8 rounded-lg shrink-0 object-contain" style={{ background: "rgba(0,0,0,0.2)" }}/>
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
                  style={{ background: "linear-gradient(135deg,#F4A130,#B8731A)", color: "#1A0A00" }}>
                  #{cl.id}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--py-card-text)" }}>{cl.clan_name}</p>
                <p className="text-xs text-gray-500">{cl.clan_tag}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => startEdit(cl)} title="Sửa clan"
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa" }}>
                  <Edit3 size={13}/>
                </button>
                {cl.id !== 1 && (
                  <button onClick={() => del(cl.id, cl.clan_name)} title="Xoá clan"
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                    <Trash2 size={13}/>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-2">Chưa có clan nào. Bấm thêm bên dưới.</p>
      )}

      {/* Nút thêm */}
      {!showForm && (
        <button onClick={startAdd}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:border-yellow-400/50 hover:text-yellow-400"
          style={{ border: "1.5px dashed rgba(244,161,48,0.3)", color: "var(--py-card-text)" }}>
          <Plus size={15}/> Thêm clan mới
        </button>
      )}

      {/* Form thêm/sửa — chỉ cần Tag + Key */}
      {showForm && (
        <div className="space-y-3 p-3 rounded-xl" style={{ border: "1px solid rgba(244,161,48,0.3)", background: "var(--py-card-bg)" }}>
          <p className="text-xs font-bold text-yellow-400">{editId ? "✏️ Sửa clan" : "➕ Thêm clan mới"}</p>

          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Clan Tag *</label>
            <input className="input" placeholder="#2JRLPQ2UP" value={form.clan_tag}
              onChange={e => { setForm({ ...form, clan_tag: e.target.value }); setPreview(null); }} />
            {editId && (
              <p className="text-[10px] text-gray-500 mt-1">
                Đổi tag = chuyển sang theo dõi 1 clan CoC khác hẳn (giữ nguyên API key vẫn được, vì key chỉ gắn với IP server chứ không gắn với clan cụ thể).
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">CoC API Key *</label>
            {!keyRevealed ? (
              <div className="flex items-center gap-2">
                <input className="input text-xs font-mono flex-1" type="password" value={form.coc_api_key} readOnly />
                <button type="button" onClick={() => setKeyRevealed(true)} title="Sửa API Key"
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa" }}>
                  <Edit3 size={13}/>
                </button>
              </div>
            ) : (
              <input className="input text-xs font-mono" placeholder="eyJ0eXAiOiJKV1QiLC..."
                value={form.coc_api_key}
                onChange={e => { setForm({ ...form, coc_api_key: e.target.value }); setPreview(null); }}/>
            )}
            <p className="text-[10px] text-gray-600 mt-0.5">
              {!keyRevealed ? "Đang giữ nguyên key đã lưu — bấm ✏️ nếu muốn đổi." : "Tạo key tại developer.clashofclans.com với IP của Render"}
            </p>
          </div>

          {/* Nút Kiểm tra */}
          <button onClick={kiemTra} disabled={testing}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(244,161,48,0.12)", border: "1px solid rgba(244,161,48,0.35)", color: "#F4A130" }}>
            {testing ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
            {testing ? "Đang kiểm tra..." : "🔍 Kiểm tra kết nối"}
          </button>

          {/* Preview kết quả */}
          {preview && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
              {preview.badge && <img src={preview.badge} alt="" className="w-10 h-10 object-contain"/>}
              <div>
                <p className="text-sm font-bold text-green-400">{preview.name}</p>
                <p className="text-[10px] text-green-600">Kết nối thành công ✓</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !preview}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: preview ? "linear-gradient(135deg,#F4A130,#B8731A)" : "rgba(100,100,100,0.2)", color: preview ? "#1A0A00" : "#666", cursor: preview ? "pointer" : "not-allowed" }}>
              {saving ? "Đang lưu..." : "💾 Lưu"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setPreview(null); }}
              className="flex-1 py-2 rounded-xl text-sm border text-gray-400 hover:text-white transition-colors"
              style={{ borderColor: "var(--py-card-border)" }}>Huỷ</button>
          </div>
        </div>
      )}
    </div>
  );
}


function PushNotificationSettings() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<string>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [notifyChat, setNotifyChat] = useState(true);
  const [notifyEvent, setNotifyEvent] = useState(true);
  const [notifyWar, setNotifyWar] = useState(true);
  const [notifyRaid, setNotifyRaid] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);

  function flashMsg(text: string, type: "error" | "success" = "error") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  async function refresh() {
    const { pushSupported, getPushPermission, getCurrentSubscription } = await import("@/lib/push");
    if (!pushSupported()) { setSupported(false); return; }
    setPermission(await getPushPermission());
    const sub = await getCurrentSubscription();
    setSubscribed(!!sub);
  }

  useEffect(() => { refresh(); }, []);

  async function handleToggle() {
    setBusy(true);
    try {
      if (subscribed) {
        const { disablePush } = await import("@/lib/push");
        await disablePush();
        setSubscribed(false);
        flashMsg("Đã tắt thông báo ngoài app", "success");
      } else {
        const { enablePush } = await import("@/lib/push");
        const res = await enablePush({ notify_chat: notifyChat, notify_event: notifyEvent, notify_war: notifyWar, notify_raid: notifyRaid });
        if (res.ok) {
          setSubscribed(true);
          flashMsg("Đã bật thông báo ngoài app!", "success");
        } else {
          flashMsg(res.error || "Không bật được thông báo");
        }
        setPermission(await Notification.permission);
      }
    } finally {
      setBusy(false);
    }
  }

  async function updatePref(key: "notify_chat" | "notify_event" | "notify_war" | "notify_raid", val: boolean) {
    if (key === "notify_chat") setNotifyChat(val);
    else if (key === "notify_event") setNotifyEvent(val);
    else if (key === "notify_war") setNotifyWar(val);
    else setNotifyRaid(val);
    if (!subscribed) return;
    const { getCurrentSubscription } = await import("@/lib/push");
    const sub = await getCurrentSubscription();
    if (sub) {
      try { await api.pushPreferences(sub.endpoint, { [key]: val }); }
      catch (e: any) { flashMsg(e.message || "Lỗi cập nhật"); }
    }
  }

  if (!supported) return null;

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Globe size={16} className="text-purple-400" />
        </div>
        <h2 className="font-bold text-white">Thông báo ngoài app</h2>
      </div>
      <p className="text-sm text-gray-400">
        Nhận thông báo trên trình duyệt/điện thoại kể cả khi không mở app — khi có tin nhắn chat mới hoặc sự kiện mới.
      </p>

      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--py-card-bg)", border: "1px solid var(--py-card-border)" }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--py-card-text)" }}>
            {subscribed ? "Đã bật" : "Đang tắt"}
          </p>
          {permission === "denied" && (
            <p className="text-[11px] text-red-400 mt-0.5">Trình duyệt đã chặn quyền thông báo — vào cài đặt trình duyệt để mở lại.</p>
          )}
        </div>
        <button onClick={handleToggle} disabled={busy || permission === "denied"}
          className={subscribed ? "btn-secondary text-sm" : "btn-gold text-sm"}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : subscribed ? "Tắt" : "Bật thông báo"}
        </button>
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm" style={{ color: "var(--py-card-text)" }}>
          💬 Tin nhắn chat mới
          <input type="checkbox" checked={notifyChat} onChange={e => updatePref("notify_chat", e.target.checked)} className="w-4 h-4 accent-yellow-500" />
        </label>
        <label className="flex items-center justify-between text-sm" style={{ color: "var(--py-card-text)" }}>
          🎉 Sự kiện mới
          <input type="checkbox" checked={notifyEvent} onChange={e => updatePref("notify_event", e.target.checked)} className="w-4 h-4 accent-yellow-500" />
        </label>
        <label className="flex items-center justify-between text-sm" style={{ color: "var(--py-card-text)" }}>
          ⚔️ Nhắc đánh War/CWL
          <input type="checkbox" checked={notifyWar} onChange={e => updatePref("notify_war", e.target.checked)} className="w-4 h-4 accent-yellow-500" />
        </label>
        <label className="flex items-center justify-between text-sm" style={{ color: "var(--py-card-text)" }}>
          🏰 Nhắc Raid Weekend
          <input type="checkbox" checked={notifyRaid} onChange={e => updatePref("notify_raid", e.target.checked)} className="w-4 h-4 accent-yellow-500" />
        </label>
      </div>

      {msg && <MiniToast msg={msg.text} type={msg.type} />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-7xl animate-fade-up">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Settings size={22} className="text-yellow-400" /> Cài đặt
        </h1>
        <p className="page-subtitle">Cấu hình API key, clan và thông báo</p>
      </div>

      {/* Ai cũng chỉnh được — không cần đăng nhập admin, vì đây là quyền của
          từng trình duyệt/thiết bị, không phải cấu hình clan. */}
      <InstallAppButton />
      <PushNotificationSettings />

      <AdminGate>
        <div className="max-w-2xl mx-auto lg:mx-0 space-y-3">
          <SettingsPageInner embedded />
          <EventReportsSettings />
          <MusicSettings />
          <MemberAccountsSettings />
          <ShopPricingSettings />
        </div>
      </AdminGate>
    </div>
  );
}

