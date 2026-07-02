"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/api";
import { Lock, LogOut } from "lucide-react";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    setAuthed(!!token);
    setChecking(false);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.login(password);
      setAdminToken(res.token);
      setAuthed(true);
    } catch (e: any) {
      setError(e.message || "Sai mật khẩu");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    if (!confirm("Đăng xuất khỏi khu vực quản trị?")) return;
    clearAdminToken();
    setAuthed(false);
    setPassword("");
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <form onSubmit={handleLogin} className="card w-full max-w-sm space-y-4">
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
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Đang kiểm tra..." : "Đăng nhập"}
          </button>
        </form>
      </div>
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
