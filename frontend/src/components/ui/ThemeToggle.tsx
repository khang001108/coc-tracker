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
      className="flex items-center justify-center icon-btn-game w-10 h-10 mx-auto">
      {theme === "dark" ? <Sun size={16} className="text-gray-900" /> : <Moon size={16} className="text-gray-900" />}
    </button>
  );
}
