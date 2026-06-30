"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const KEY = "coc_theme";

export function applyTheme(theme: "dark" | "gold") {
  document.documentElement.classList.toggle("theme-gold", theme === "gold");
}

export function ThemeInitScript() {
  // Chạy trước khi React hydrate để tránh nháy sai theme lúc tải trang
  const code = `(function(){try{var t=localStorage.getItem('${KEY}');if(t==='gold'){document.documentElement.classList.add('theme-gold');}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function ThemeToggle({ variant = "full" }: { variant?: "full" | "icon" }) {
  const [theme, setTheme] = useState<"dark" | "gold">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as "dark" | "gold") || "dark";
    setTheme(saved);
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
      className="flex items-center justify-center gap-2 py-2 rounded-xl font-medium text-sm w-full transition-all"
      style={{
        background: theme === "dark"
          ? "linear-gradient(180deg, #FFF6DE, #F2DFAD)"
          : "linear-gradient(180deg, #2a2f3a, #161920)",
        color: theme === "dark" ? "#5C4517" : "#e5e7eb",
        border: `1px solid ${theme === "dark" ? "#D8B968" : "#1c1f26"}`,
      }}>
      {theme === "dark" ? <><Sun size={15} /> Giao diện Hoàng Kim</> : <><Moon size={15} /> Giao diện Tối</>}
    </button>
  );
}
