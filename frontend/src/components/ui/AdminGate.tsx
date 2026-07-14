"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/api";
import { Lock, LogOut, Settings2 } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const confirm = useConfirm();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) { setAuthed(false); setChecking(false); return; }
    // Xác thực lại với server — nếu ADMIN_PASSWORD đã bị đổi thì token cũ
    // (ký bằng mật khẩu cũ) sẽ không còn hợp lệ, tự động đăng xuất khỏi
    // MỌI thiết bị/trình duyệt đang đăng nhập, không chỉ nơi vừa đổi mật khẩu.
    api.verifyAdminToken()
      .then(() => setAuthed(true))
      .catch(() => { clearAdminToken(); setAuthed(false); })
      .finally(() => setChecking(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.login(password);
      setAdminToken(res.token);
      setAuthed(true);
      setShowLogin(false);
      setPassword("");
    } catch (e: any) {
      setError(e.message || "Sai mật khẩu");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (!(await confirm("Đăng xuất khỏi khu vực quản trị?"))) return;
    clearAdminToken();
    setAuthed(false);
    setPassword("");
  }

  if (checking) return null;

  // Chưa đăng nhập admin — chỉ hiện 1 nút gọn "Nâng cao", bấm vào mới hiện
  // popup nhập mật khẩu (thay vì chiếm cả 1 mảng lớn trên trang cho mọi
  // người dùng thường không cần tới).
  if (!authed) {
    return (
      <>
        <button onClick={() => setShowLogin(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors"
          style={{ background: "var(--py-card-bg)", border: "1px dashed var(--py-card-border)", color: "var(--py-card-text)" }}>
          <Settings2 size={16} className="text-yellow-500" /> Nâng cao (Quản trị)
        </button>

        {showLogin && (
          <Portal>
            <div className="modal-overlay" onClick={() => setShowLogin(false)}>
              <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleLogin} className="p-5 space-y-4">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Lock size={20} />
                    <h2 className="font-bold text-white">Khu vực quản trị</h2>
                  </div>
                  <p className="text-sm text-gray-400">Nhập mật khẩu admin để tiếp tục</p>
                  <input
                    type="password"
                    name="admin_password_login"
                    autoComplete="current-password"
                    className="input"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                  />
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowLogin(false)} className="btn-secondary flex-1">Huỷ</button>
                    <button type="submit" disabled={loading} className="btn-primary flex-1">
                      {loading ? "Đang kiểm tra..." : "Đăng nhập"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Portal>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-500/10">
          <LogOut size={13} /> Đăng xuất admin
        </button>
      </div>
      {children}
    </div>
  );
}
