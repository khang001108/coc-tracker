"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAdminToken } from "@/lib/api";
import { AdminGate } from "@/components/ui/AdminGate";
import { PartyPopper, Plus, Trash2, ExternalLink, RefreshCw, CheckCircle2, Circle, X } from "lucide-react";

const EVENT_TYPE_LABEL: Record<string, string> = {
  war: "War thường", cwl: "CWL / War giải", custom: "Tự viết",
};

function EventCard({ event, onOpen }: { event: any; onOpen: () => void }) {
  return (
    <div className="card cursor-pointer hover:border-yellow-500/30 transition-colors" onClick={onOpen}>
      <div className="flex items-start gap-4">
        {event.reward_image_url ? (
          <img src={event.reward_image_url} alt="reward" className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-800" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
            <PartyPopper size={24} className="text-yellow-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-white">{event.title}</h3>
            <span className={`badge text-[10px] ${event.status === "active" ? "badge-green" : "badge-red"}`}>
              {event.status === "active" ? "Đang diễn ra" : "Đã đóng"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{EVENT_TYPE_LABEL[event.event_type] || event.event_type}</p>
          {event.description && <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">{event.description}</p>}
          {event.reward_name && (
            <p className="text-sm text-yellow-400 mt-1.5 font-medium">🎁 {event.reward_name}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EventDetailModal({ event, isAdmin, onClose, onChanged }: any) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [lb, cl] = await Promise.all([
        api.getLeaderboard(event.id).catch(() => ({ leaderboard: [], note: "" })),
        api.getClaims(event.id).catch(() => []),
      ]);
      setLeaderboard(lb.leaderboard || []);
      setNote(lb.note || "");
      setClaims(cl || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [event.id]);

  async function saveLeaderboardAsClaims() {
    if (!leaderboard.length) return;
    await api.saveClaims(event.id, leaderboard);
    await load();
  }

  async function toggleClaim(claim: any) {
    await api.markClaimed(event.id, claim.id, !claim.claimed);
    await load();
    onChanged?.();
  }

  async function handleDelete() {
    if (!confirm(`Xoá sự kiện "${event.title}"?`)) return;
    await api.deleteEvent(event.id);
    onChanged?.();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-lg">{event.title}</h3>
              <p className="text-xs text-gray-500">{EVENT_TYPE_LABEL[event.event_type]}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 shrink-0">
              <X size={18} />
            </button>
          </div>

          {event.description && <p className="text-sm text-gray-300">{event.description}</p>}

          {event.reward_name && (
            <div className="card !p-3 bg-yellow-500/5 border-yellow-500/20 space-y-2">
              <div className="flex items-center gap-3">
                {event.reward_image_url && (
                  <img src={event.reward_image_url} className="w-14 h-14 rounded-xl object-cover" alt="" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-yellow-400">{event.reward_name}</p>
                  {event.reward_shop_link && (
                    <a href={event.reward_shop_link} target="_blank" rel="noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1">
                      Xem trên Shopee <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-bold text-white mb-2">Bảng xếp hạng (Top {event.top_n})</h4>
            {loading ? (
              <div className="h-20 bg-gray-800 rounded-xl animate-pulse" />
            ) : note ? (
              <p className="text-sm text-gray-500">{note}</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có dữ liệu (chưa có war kết thúc hoặc chưa cấu hình clan tag)</p>
            ) : (
              <div className="space-y-1.5">
                {leaderboard.map((m: any) => (
                  <div key={m.player_tag} className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-500 w-5 text-right">{m.rank}</span>
                    <span className="text-sm text-white flex-1 truncate">{m.player_name}</span>
                    <span className="text-xs text-yellow-400 font-semibold">{m.metric_value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAdmin && leaderboard.length > 0 && (
            <button onClick={saveLeaderboardAsClaims} className="btn-secondary w-full text-sm">
              Lưu danh sách top vào danh sách trao thưởng
            </button>
          )}

          {claims.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Trạng thái trao thưởng</h4>
              <div className="space-y-1.5">
                {claims.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-500 w-5 text-right">{c.rank}</span>
                    <span className="text-sm text-white flex-1 truncate">{c.player_name}</span>
                    <span className="text-xs text-gray-500">{c.metric_value}</span>
                    {isAdmin ? (
                      <button onClick={() => toggleClaim(c)} className="shrink-0">
                        {c.claimed
                          ? <CheckCircle2 size={18} className="text-green-400" />
                          : <Circle size={18} className="text-gray-600" />}
                      </button>
                    ) : (
                      c.claimed && <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <button onClick={handleDelete} className="text-xs text-red-400 hover:underline flex items-center gap-1">
              <Trash2 size={12} /> Xoá sự kiện này
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const [conditions, setConditions] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", event_type: "war", condition_type: "total_stars",
    top_n: 3, reward_name: "", reward_image_url: "", reward_shop_link: "",
  });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { api.getConditions().then(setConditions).catch(() => {}); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.createEvent(form);
      setForm({ title: "", description: "", event_type: "war", condition_type: "total_stars",
        top_n: 3, reward_name: "", reward_image_url: "", reward_shop_link: "" });
      setOpen(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-gold flex items-center gap-2 text-sm">
        <Plus size={16} /> Tạo sự kiện mới
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">Tạo sự kiện mới</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-500"><X size={18} /></button>
      </div>

      <input className="input" placeholder="Tên sự kiện (vd: War giải tháng 7)"
        value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

      <textarea className="input" placeholder="Mô tả (tuỳ chọn)" rows={2}
        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Loại sự kiện</label>
          <select className="input" value={form.event_type}
            onChange={e => setForm({ ...form, event_type: e.target.value })}>
            <option value="war">War thường</option>
            <option value="cwl">CWL / War giải</option>
            <option value="custom">Tự viết (thủ công)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Top bao nhiêu người</label>
          <input type="number" min={1} max={50} className="input" value={form.top_n}
            onChange={e => setForm({ ...form, top_n: Number(e.target.value) })} />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Điều kiện xếp hạng</label>
        <select className="input" value={form.condition_type}
          onChange={e => setForm({ ...form, condition_type: e.target.value })}>
          {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <p className="text-[11px] text-gray-600 mt-1">
          Dữ liệu lấy trực tiếp từ war hiện tại/gần nhất qua CoC API. Chọn "Admin tự chọn thủ công" nếu muốn tự nhập người thắng.
        </p>
      </div>

      <div className="pt-2 border-t border-gray-800 space-y-3">
        <p className="text-xs text-gray-500 font-medium">Phần quà (tuỳ chọn)</p>
        <input className="input" placeholder="Tên quà (vd: Thanh kiếm Barbarian phiên bản giới hạn)"
          value={form.reward_name} onChange={e => setForm({ ...form, reward_name: e.target.value })} />
        <input className="input" placeholder="Link ảnh quà (URL ảnh)"
          value={form.reward_image_url} onChange={e => setForm({ ...form, reward_image_url: e.target.value })} />
        <input className="input" placeholder="Link Shopee"
          value={form.reward_shop_link} onChange={e => setForm({ ...form, reward_shop_link: e.target.value })} />
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "Đang tạo..." : "Tạo sự kiện"}
      </button>
    </form>
  );
}

function EventsPageInner() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const isAdmin = !!getAdminToken();

  async function load() {
    setLoading(true);
    try { setEvents(await api.getEvents()); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <PartyPopper size={22} className="text-pink-400" /> Sự kiện & Trao thưởng
          </h1>
          <p className="page-subtitle">War giải, thử thách, quà từ cửa hàng của clan</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      <AdminGate>
        <CreateEventForm onCreated={load} />
      </AdminGate>

      {loading ? (
        <div className="grid gap-3">{[1,2].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-800" />)}</div>
      ) : events.length === 0 ? (
        <div className="card text-center py-10">
          <PartyPopper size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400">Chưa có sự kiện nào</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map(ev => <EventCard key={ev.id} event={ev} onOpen={() => setSelected(ev)} />)}
        </div>
      )}

      {selected && (
        <EventDetailModal event={selected} isAdmin={isAdmin}
          onClose={() => setSelected(null)} onChanged={load} />
      )}
    </div>
  );
}

export default function EventsPage() {
  // Trang sự kiện công khai cho mọi người xem (thưởng, bảng xếp hạng, ai đã nhận),
  // nhưng nút tạo/sửa/xoá/trao thưởng chỉ hiện khi đã đăng nhập admin (AdminGate lồng bên trong từng phần).
  return <EventsPageInner />;
}
