"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getMemberAuth, getGuestName, setGuestName } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { MessageCircle, Send, Image as ImageIcon, Smile, Lock } from "lucide-react";
import { NameEffect } from "@/components/ui/NameEffect";
import { NumberEffect } from "@/components/ui/NumberEffect";
import { ReputationBadge } from "@/components/ui/ReputationBadge";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import { MasksIcon, AgoraIcon } from "@/components/ui/GrecoIcons";
import { thColor } from "@/lib/utils";

const EMOJIS = ["😀","😂","😍","😎","🤔","👍","👎","🔥","❤️","🎉","😢","😡","🏆","⚔️","🛡️","💪","🙏","👏","😴","🤝"];
const POLL_MS = 4000;

function MessageBubble({ msg, isMine, effectKey, repRank, thLevel }: {
  msg: any; isMine: boolean; effectKey?: string | null;
  repRank?: number | null; thLevel?: number;
}) {
  if (msg.is_system) {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-3 py-1">
          {msg.message}
        </span>
      </div>
    );
  }
  // Ưu tiên dữ liệu gắn sẵn trên tin nhắn (đúng cho cả thành viên clan khác
  // trong Chat Toàn Cầu), fallback về roster của clan đang xem nếu chưa có.
  const th     = msg.sender_th ?? thLevel ?? 0;
  const rank   = repRank;
  const nameEffectKey = msg.sender_effect ?? effectKey;
  const numberEffectKey = msg.sender_number_effect as string | undefined;
  const clanName  = msg.sender_clan_name as string | undefined;
  const clanBadge = msg.sender_clan_badge as string | undefined;
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!isMine && (
          <span className="flex items-center gap-1 px-1 flex-wrap">
            {/* TH badge */}
            {th && th > 0 ? (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0"
                style={{ color: thColor(th), background: thColor(th) + "22", border: `1px solid ${thColor(th)}55` }}>
                TH<NumberEffect effectKey={numberEffectKey}>{th}</NumberEffect>
              </span>
            ) : null}
            {/* Huy hiệu Danh vọng (top 10) — thay cho icon lâu đài/pháo trước đây */}
            {rank && <ReputationBadge rank={rank}/>}
            <span className="text-[11px] text-gray-500"><NameEffect effectKey={nameEffectKey}>{msg.sender_name}</NameEffect></span>
            {/* Huy hiệu hội — chỉ hiện ở Chat Toàn Cầu (liên clan) */}
            {clanName && (
              <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ color: "#F4A130", background: "rgba(244,161,48,0.12)", border: "1px solid rgba(244,161,48,0.3)" }}>
                {clanBadge ? <img src={clanBadge} alt="" className="w-3.5 h-3.5 object-contain" /> : "🏯"} {clanName}
              </span>
            )}
          </span>
        )}
        <div className={`rounded-2xl px-3.5 py-2 ${isMine ? "bg-yellow-500 text-gray-900" : "card !p-0 !border-0"}`}
          style={!isMine ? { padding: "8px 14px" } : {}}>
          {msg.image_url && (
            <img src={msg.image_url} alt="" className="rounded-xl max-w-[220px] max-h-[220px] object-cover mb-1.5" />
          )}
          {msg.message && <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>}
        </div>
        <span className="text-[10px] text-gray-600 px-1">{formatDate(msg.created_at)}</span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [room, setRoom] = useState<"clan" | "global">("global");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [guestNameInput, setGuestNameInput] = useState("");
  const [member, setMember] = useState<{ token: string; player_tag: string; player_name: string } | null>(null);
  const [effectMap, setEffectMap] = useState<Record<string, string | null>>({});
  const [repRankMap, setRepRankMap] = useState<Record<string, number>>({});
  const [thMap, setThMap] = useState<Record<string, number>>({});
  const [chatBg, setChatBg] = useState<string>("");
  const lastIdRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMember(getMemberAuth());
    setGuestNameInput(getGuestName());
    api.getPublicSettings().then((s: any) => setChatBg(s.chat_background_image || "")).catch(() => {});
    api.getRoster().then((roster: any[]) => {
      const effMap: Record<string, string | null> = {};
      roster.forEach(r => { effMap[r.tag] = r.equipped_effect; });
      const thM: Record<string, number> = {};
      roster.forEach((r: any) => { thM[r.tag] = r.townHallLevel || 0; });
      setEffectMap(effMap);
      setThMap(thM);
    }).catch(() => {});
    api.getReputationLeaderboard(10).then((rows: any[]) => {
      const rankMap: Record<string, number> = {};
      rows.forEach((r, i) => { rankMap[r.player_tag] = i + 1; });
      setRepRankMap(rankMap);
    }).catch(() => {});
  }, []);

  async function loadInitial() {
    lastIdRef.current = 0;
    setMessages([]);
    try {
      const data = await api.getMessages(room, 0);
      setMessages(data);
      if (data.length) lastIdRef.current = data[data.length - 1].id;
    } catch {}
    scrollToBottom(true);
  }

  async function pollNew() {
    try {
      const data = await api.getMessages(room, lastIdRef.current);
      if (data.length) {
        // Chặn trùng: nếu gửi tin xong gọi pollNew() ĐÚNG lúc bộ đếm tự động
        // (setInterval) cũng đang chạy, cả 2 có thể cùng lấy về đúng tin nhắn
        // đó rồi cùng thêm vào — nhìn thành 2 tin (chỉ hết khi tải lại trang
        // vì lúc đó lấy lại đúng 1 bản từ server). Lọc theo id đã có để tránh.
        setMessages(prev => {
          const seen = new Set(prev.map((m: any) => m.id));
          const fresh = data.filter((m: any) => !seen.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        lastIdRef.current = data[data.length - 1].id;
        scrollToBottom();
      }
    } catch {}
  }

  function scrollToBottom(instant = false) {
    // Dùng double requestAnimationFrame thay vì setTimeout ngắn — đảm bảo
    // trình duyệt đã vẽ xong hết tin nhắn (kể cả ảnh/hiệu ứng tên) rồi mới
    // đo scrollHeight, tránh bị dừng giữa chừng chưa tới đáy thật.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: instant ? "auto" : "smooth" });
      });
    });
  }

  useEffect(() => {
    loadInitial();
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(pollNew, POLL_MS);
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [room]);

  async function handleSend(imageUrl?: string) {
    const text = input.trim();
    if (!text && !imageUrl) return;
    if (room === "clan" && !member) {
      setError("Cần đăng nhập thành viên để chat trong clan");
      return;
    }
    setSending(true);
    setError("");
    try {
      const name = room === "global" && !member ? (guestNameInput.trim() || "Khách") : undefined;
      if (room === "global" && guestNameInput.trim()) setGuestName(guestNameInput.trim());
      await api.sendMessage(room, text, imageUrl, name);
      setInput("");
      await pollNew();
    } catch (e: any) {
      setError(e.message || "Lỗi gửi tin nhắn");
    } finally {
      setSending(false);
    }
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    try {
      const res = await api.uploadChatImage(file);
      await handleSend(res.url);
    } catch (e: any) {
      setError(e.message || "Lỗi tải ảnh");
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const canType = room === "global" || !!member;

  return (
    <div className="space-y-4 animate-fade-up h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] flex flex-col">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <MessageCircle size={22} className="text-blue-400" /> Chat
        </h1>
        <p className="page-subtitle">Nói chuyện với clan hoặc với mọi người</p>
      </div>

      <SlidingTabs
        tabs={[
          { id: "clan", label: "Chat Clan", icon: <MasksIcon/> },
          { id: "global", label: "Chat công khai", icon: <AgoraIcon/> },
        ]}
        active={room} onChange={(id) => setRoom(id as any)} />

      <div className="card flex-1 flex flex-col !p-0 overflow-hidden min-h-0 relative">
        {chatBg && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <img src={chatBg} alt="" className="w-full h-full object-cover" style={{ opacity: 0.16 }} />
          </div>
        )}
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-gray-600 py-8">Chưa có tin nhắn nào — bắt đầu trò chuyện đi!</p>
          ) : (
            messages.map(m => (
              <MessageBubble key={m.id} msg={m}
                isMine={!!member && m.sender_tag === member.player_tag}
                effectKey={m.sender_tag ? effectMap[m.sender_tag] : null}
                repRank={m.sender_tag ? repRankMap[m.sender_tag] : null}
                thLevel={m.sender_tag ? thMap[m.sender_tag] : 0} />
            ))
          )}
        </div>

        <div className="border-t border-gray-800 p-3 space-y-2">
          {room === "clan" && !member && (
            <div className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
              <Lock size={14} /> Cần <a href="/login" className="underline font-semibold">đăng nhập thành viên</a> để chat trong clan.
            </div>
          )}
          {room === "global" && !member && (
            <input className="input text-xs !py-1.5" placeholder="Tên hiển thị của bạn (tuỳ chọn)"
              value={guestNameInput} onChange={e => setGuestNameInput(e.target.value)} maxLength={30} />
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-end gap-2">
            <div className="relative">
              <button onClick={() => setShowEmoji(v => !v)} disabled={!canType}
                className="p-2.5 rounded-xl hover:bg-gray-800 text-gray-400 disabled:opacity-40">
                <Smile size={18} />
              </button>
              {showEmoji && (
                <div className="absolute bottom-full left-0 mb-2 card !p-2 grid grid-cols-5 gap-1 w-56 z-10">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => { setInput(i => i + e); setShowEmoji(false); }}
                      className="text-xl hover:bg-gray-800 rounded-lg p-1">{e}</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => fileRef.current?.click()} disabled={!canType || sending}
              className="p-2.5 rounded-xl hover:bg-gray-800 text-gray-400 disabled:opacity-40">
              <ImageIcon size={18} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

            <input className="input flex-1" placeholder={canType ? "Nhập tin nhắn..." : "Đăng nhập để chat..."}
              value={input} disabled={!canType || sending}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />

            <button onClick={() => handleSend()} disabled={!canType || sending || !input.trim()}
              className="icon-btn-game w-10 h-10 text-gray-900 disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
