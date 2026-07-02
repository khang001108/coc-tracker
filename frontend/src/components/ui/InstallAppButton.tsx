"use client";
import { useEffect, useState } from "react";
import { Download, Smartphone, CheckCircle2 } from "lucide-react";

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [browserHint, setBrowserHint] = useState("");

  useEffect(() => {
    // Đã cài rồi (đang chạy ở chế độ standalone/fullscreen) thì khỏi hiện nút
    if (window.matchMedia?.("(display-mode: standalone)")?.matches || (navigator as any).standalone) {
      setInstalled(true);
    }

    function onPrompt(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Đoán trình duyệt để gợi ý đúng cách cài cho những nơi không hỗ trợ
    // cài tự động (beforeinstallprompt chỉ có ở trình duyệt nền Chromium).
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setBrowserHint("ios");
    else if (/Firefox/.test(ua)) setBrowserHint("firefox");
    else if (/Safari/.test(ua) && !/Chrome|CriOS|CocCoc/.test(ua)) setBrowserHint("safari");

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setShowHelp(true);
  }

  if (installed) {
    return (
      <div className="card flex items-center gap-3">
        <CheckCircle2 size={18} className="text-green-400 shrink-0" />
        <p className="text-sm text-gray-400">App đã được cài trên thiết bị này.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Smartphone size={16} className="text-blue-400" />
        </div>
        <h2 className="font-bold text-white">Tải app về máy</h2>
      </div>
      <p className="text-sm text-gray-400">
        Cài app ra màn hình chính / vào danh sách ứng dụng — mở nhanh như app thật, không cần mở trình duyệt gõ lại link.
      </p>
      <button onClick={handleClick}
        className="btn-gold w-full flex items-center justify-center gap-2">
        <Download size={16} /> Tải về / Cài đặt
      </button>

      {showHelp && (
        <div className="text-xs text-gray-400 bg-gray-800/50 rounded-xl p-3 space-y-1.5">
          {browserHint === "ios" ? (
            <p>📱 Trên iPhone/iPad: bấm nút <b>Chia sẻ</b> (hình vuông có mũi tên) ở thanh dưới Safari → chọn <b>"Thêm vào MH chính"</b>.</p>
          ) : browserHint === "firefox" ? (
            <p>🦊 Firefox không hỗ trợ cài app kiểu này trên máy tính. Bạn dùng <b>Chrome</b>, <b>Cốc Cốc</b> hoặc <b>Edge</b> để cài, hoặc trên Firefox Android: menu ⋮ → "Cài đặt" / "Thêm vào màn hình chính".</p>
          ) : browserHint === "safari" ? (
            <p>🧭 Trên Safari macOS: menu <b>Chia sẻ</b> → <b>"Thêm vào Dock"</b>. Trên iPhone: nút Chia sẻ → "Thêm vào MH chính".</p>
          ) : (
            <p>Không tìm thấy nút cài tự động — thử mở menu trình duyệt (⋮ hoặc ⋯) và tìm mục "Cài đặt ứng dụng" / "Thêm vào màn hình chính".</p>
          )}
        </div>
      )}
    </div>
  );
}
