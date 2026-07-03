"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

let cached: Record<string, string> | null = null;
let pending: Promise<Record<string, string>> | null = null;

async function fetchPageBanners(): Promise<Record<string, string>> {
  if (cached) return cached;
  if (!pending) {
    pending = api.getPublicSettings()
      .then((s: any) => {
        try { cached = s.page_banners ? JSON.parse(s.page_banners) : {}; }
        catch { cached = {}; }
        return cached!;
      })
      .catch(() => ({}));
  }
  return pending;
}

/** Ảnh nền của 1 trang — ưu tiên ảnh admin đã đổi trong Cài đặt → Ảnh nền
 * từng mục, nếu chưa đổi thì dùng ảnh mặc định (defaultSrc). */
export function usePageBanner(pageKey: string, defaultSrc: string): string {
  const [src, setSrc] = useState(cached?.[pageKey] || defaultSrc);
  useEffect(() => {
    let alive = true;
    fetchPageBanners().then(banners => { if (alive && banners[pageKey]) setSrc(banners[pageKey]); });
    return () => { alive = false; };
  }, [pageKey]);
  return src;
}
