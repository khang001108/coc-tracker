"use client";
import { CocLoader } from "@/components/ui/CocLoader";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArtBanner } from "@/components/ui/ArtBanner";
import { api } from "@/lib/api";
import { getMemberAuth, setMemberAuth, clearMemberAuth } from "@/lib/api";
import { thColor, roleLabel, roleClass } from "@/lib/utils";
import { UserCheck, Lock, LogOut, Search, CheckCircle2, Crown, Coins } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { EmberField } from "@/components/ui/EmberField";
import { NameEffect } from "@/components/ui/NameEffect";
import { NumberEffect } from "@/components/ui/NumberEffect";

export default function LoginPage() {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [me, setMe] = useState<{ token: string; player_tag: string; player_name: string } | null>(null);

  // Claim modal
  const [claimTarget, setClaimTarget] = useState<any>(null);
  const [tagConfirm, setTagConfirm] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [setupCodeRequired, setSetupCodeRequired] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Login form (đã claim trước đó, đăng nhập lại trên máy khác)
  const [showLogin, setShowLogin] = useState(false);
  const [loginTag, setLoginTag] = useState("");
  const [loginPin, setLoginPin] = useState("");

  async function load() {
    setLoading(true);
    try { setRoster(await api.getRoster()); } finally { setLoading(false); }
  }

  useEffect(() => {
    const m = getMemberAuth();
    setMe(m);
    if (m) api.getMyMemberInfo().then(full => { if (full) setMe(full); });
    load();
    api.isSetupCodeRequired().then(r => setSetupCodeRequired(!!r.required)).catch(() => {});
  }, []);

  async function submitClaim(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const normalizedTarget = claimTarget.tag.replace("#", "").toUpperCase();
    const normalizedInput = tagConfirm.replace("#", "").trim().toUpperCase();
    if (normalizedInput !== normalizedTarget) return setError(`Tag chưa đúng — tag của "${claimTarget.name}" là ${claimTarget.tag}`);
    if (pin.length < 4) return setError("PIN tối thiểu 4 số");
    if (pin !== pin2) return setError("PIN nhập lại không khớp");
    if (setupCodeRequired && !setupCode.trim()) return setError("Cần nhập mã xác minh — hỏi thủ lĩnh clan hoặc admin web");
    setBusy(true);
    try {
      const res = await api.claimMember(claimTarget.tag, claimTarget.name, pin, setupCode.trim());
      setMemberAuth(res);
      setMe(res);
      setClaimTarget(null);
      setTagConfirm(""); setPin(""); setPin2(""); setSetupCode("");
      await load();
    } catch (e: any) {
      setError(e.message || "Lỗi nhận tài khoản");
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.loginMember(loginTag.trim(), loginPin.trim());
      setMemberAuth(res);
      setMe(res);
      setShowLogin(false);
    } catch (e: any) {
      setError(e.message || "Sai tag hoặc PIN");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearMemberAuth();
    setMe(null);
  }

  const filtered = roster.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 animate-fade-up max-w-4xl">
      <div className="relative rounded-2xl overflow-hidden p-7 md:p-12"
        style={{ background: "linear-gradient(135deg, rgba(244,161,48,0.14), rgba(139,69,19,0.10))" }}>
        <ArtBanner src="/art/skeleton-king.jpg" opacity={0.4} objectPosition="center 25%" />
        <EmberField count={16} />
        <div className="relative flex items-center gap-4 banner-content">
          <div className="flex-1">
            <h1 className="page-title flex items-center gap-2">
              <UserCheck size={22} className="text-green-400" /> Nhận diện thành viên
            </h1>
            <p className="page-subtitle">Chọn đúng tên bạn trong clan để đăng nhập và chat với danh tính thật</p>
          </div>
        </div>
      </div>

      {me ? (
        <div className="card flex items-center gap-3 border-green-500/30 bg-green-500/5">
          <CheckCircle2 size={24} className="text-green-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-gray-400">Đang đăng nhập với tư cách</p>
            <p className="font-bold text-white"><NameEffect effectKey={(me as any).equipped_effect}>{me.player_name}</NameEffect></p>
            <p className="text-xs text-yellow-400 flex items-center gap-1 mt-0.5">
              <Coins size={12} /> {(me as any).coins ?? 0} Coins
            </p>
          </div>
          <button onClick={logout} className="btn-secondary text-sm flex items-center gap-1.5">
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      ) : (
        <div className="card flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-400">Đã nhận tài khoản trước đó trên máy khác?</p>
          <button onClick={() => setShowLogin(true)} className="btn-secondary text-sm flex items-center gap-1.5">
            <Lock size={14} /> Đăng nhập bằng PIN
          </button>
        </div>
      )}

      {me && (
        <Link href="/shop" className="card flex items-center justify-between gap-3 hover:border-yellow-500/40 transition-colors">
          <span className="flex items-center gap-2 text-white font-semibold">🏰 Cửa hàng vật phẩm</span>
          <span className="text-xs text-gray-500">Đổi lâu đài, pháo, hiệu ứng tên →</span>
        </Link>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input className="input pl-9" placeholder="Tìm tên thành viên..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <CocLoader text="Đang tải thành viên clan..." minHeight={200} />
      ) : (
        <div className="card !p-0 overflow-hidden">
          <div className="divide-y divide-gray-800">
            {filtered.map(m => (
              <div key={m.tag} className="flex items-center gap-3 px-4 py-3">
                <div className="th-badge" style={{ color: thColor(m.townHallLevel), background: thColor(m.townHallLevel) + "22", borderColor: thColor(m.townHallLevel) + "44" }}>
                  <NumberEffect effectKey={m.equipped_number_effect}>{m.townHallLevel}</NumberEffect>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                    <NameEffect effectKey={m.equipped_effect}>{m.name}</NameEffect>
                    {m.role === "leader" && <Crown size={12} className="text-yellow-400" />}
                  </p>
                  <p className={`text-xs ${roleClass(m.role)}`}>{roleLabel(m.role)}</p>
                </div>
                {m.claimed ? (
                  m.tag === me?.player_tag ? (
                    <span className="badge-green text-xs">Bạn</span>
                  ) : (
                    <span className="text-xs text-gray-600">Đã có người nhận</span>
                  )
                ) : me ? (
                  <span className="text-xs text-gray-600">—</span>
                ) : (
                  <button onClick={() => { setClaimTarget(m); setError(""); setTagConfirm(""); }}
                    className="btn-gold text-xs !px-3 !py-1.5">
                    Đây là tôi
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claim modal */}
      {claimTarget && (
        <Portal>
        <div className="modal-overlay" onClick={() => { setClaimTarget(null); setTagConfirm(""); }}>
          <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
            <form onSubmit={submitClaim} className="p-5 space-y-4">
              <h3 className="font-bold text-white text-lg">Nhận làm "{claimTarget.name}"</h3>
              <div>
                <p className="text-sm text-gray-400 mb-1.5">Nhập lại tag của bạn để xác nhận đúng là bạn:</p>
                <input className="input" placeholder="vd: #ABC123XYZ"
                  value={tagConfirm} onChange={e => setTagConfirm(e.target.value.toUpperCase())} autoFocus />
              </div>
              {setupCodeRequired && (
                <div>
                  <input className="input" placeholder="Mã xác minh (hỏi thủ lĩnh/admin web)"
                    value={setupCode} onChange={e => setSetupCode(e.target.value)} />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Mã này để chống người lạ nhận nhầm danh tính của bạn — chưa có thì liên hệ thủ lĩnh clan hoặc admin website để xin mã.
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400 mb-1.5">Đặt 1 mã PIN (4-8 số) để lần sau đăng nhập lại. Chỉ bạn biết mã này.</p>
                <input className="input" type="password" inputMode="numeric" placeholder="Đặt PIN"
                  value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} maxLength={8} />
              </div>
              <input className="input" type="password" inputMode="numeric" placeholder="Nhập lại PIN"
                value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, ""))} maxLength={8} />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setClaimTarget(null); setTagConfirm(""); }} className="btn-secondary flex-1">Huỷ</button>
                <button type="submit" disabled={busy} className="btn-primary flex-1">{busy ? "..." : "Xác nhận"}</button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* Login modal */}
      {showLogin && (
        <Portal>
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
            <form onSubmit={submitLogin} className="p-5 space-y-4">
              <h3 className="font-bold text-white text-lg">Đăng nhập</h3>
              <input className="input" placeholder="Tag người chơi (vd: #ABC123)"
                value={loginTag} onChange={e => setLoginTag(e.target.value)} />
              <input className="input" type="password" inputMode="numeric" placeholder="PIN"
                value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, ""))} maxLength={8} />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowLogin(false)} className="btn-secondary flex-1">Huỷ</button>
                <button type="submit" disabled={busy} className="btn-primary flex-1">{busy ? "..." : "Đăng nhập"}</button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
