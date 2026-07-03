"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

let cached: string | null = null;
let pending: Promise<string> | null = null;

async function fetchEmberColor(): Promise<string> {
  if (cached) return cached;
  if (!pending) {
    pending = api.getPublicSettings()
      .then((s: any) => { cached = s.ember_color || "gold"; return cached!; })
      .catch(() => "gold");
  }
  return pending;
}

/** Màu tia lửa (EmberField) đang cấu hình trong Cài đặt — mặc định "gold".
 * Cache lại trong bộ nhớ để nhiều trang dùng chung không phải gọi API lặp lại. */
export function useEmberColor(): "gold" | "blue" | "purple" | "pink" {
  const [color, setColor] = useState<any>(cached || "gold");
  useEffect(() => {
    let alive = true;
    fetchEmberColor().then(c => { if (alive) setColor(c); });
    return () => { alive = false; };
  }, []);
  return color;
}
