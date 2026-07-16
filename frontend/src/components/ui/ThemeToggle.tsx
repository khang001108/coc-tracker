"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import Script from "next/script";

const KEY = "coc_theme";

export function applyTheme(theme: "dark" | "gold") {
  document.documentElement.classList.toggle("theme-gold", theme === "gold");
}

export function ThemeInitScript() {
  // Chạy TRƯỚC khi React hydrate (strategy="beforeInteractive") để tránh
  // nháy/về sai theme lúc tải trang. Dùng next/script thay vì thẻ <script>
  // thường trong <head> vì App Router không đảm bảo <script> thường trong
  // <head> luôn chạy trước hydrate — beforeInteractive mới đảm bảo điều đó.
  const code = `(function(){try{var t=localStorage.getItem('${KEY}');if(t==='gold'){document.documentElement.classList.add('theme-gold');}}catch(e){}})();`;
  return <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: code }} />;
}

export function ThemeToggle({ variant = "full" }: { variant?: "full" | "icon" }) {
  const [theme, setTheme] = useState<"dark" | "gold">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as "dark" | "gold") || "dark";
    setTheme(saved);
    // Đảm bảo class luôn khớp với localStorage kể cả khi script pre-hydrate
    // vì lý do gì đó chưa kịp áp dụng (ví dụ điều hướng SPA giữa các trang).
    applyTheme(saved);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "gold" : "dark";
    setTheme(next);
    localStorage.setItem(KEY, next);
    applyTheme(next);
  }

  if (variant === "icon") {
    return (
      <button onClick={toggle} className="icon-btn-game w-8 h-8 text-gray-900">
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    );
  }

  return (
    <button onClick={toggle}
      className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm w-full transition-all"
      style={{
        background: theme === "dark"
          ? "linear-gradient(180deg, #FFF6DE, #F2DFAD)"
          : "linear-gradient(180deg, #2a2f3a, #161920)",
        color: theme === "dark" ? "#5C4517" : "#e5e7eb",
        border: `1px solid ${theme === "dark" ? "#D8B968" : "#1c1f26"}`,
      }}>
      {theme === "dark" ? <><Sun size={15} /> Giao diện sáng</> : <><Moon size={15} /> Giao diện tối</>}
    </button>
  );
}
