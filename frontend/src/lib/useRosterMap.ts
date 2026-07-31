"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Map player_tag -> cả roster record (equipped_effect, equipped_number_effect,
 * equipped_castle, equipped_cannon, equipped_projectile, equipped_explosion,
 * claimed...) — dùng để áp hiệu ứng tên/số đã mua ở CÁC DANH SÁCH chỉ có
 * sẵn tag+tên (Thống kê, Sự kiện, Nội quy, Huy chương...) mà trước đó không
 * tự có kèm effectKey. Chỉ tải 1 lần/trang. */
export function useRosterMap(): Record<string, any> {
  const [map, setMap] = useState<Record<string, any>>({});
  useEffect(() => {
    let alive = true;
    api.getRoster().then((roster: any[]) => {
      if (!alive) return;
      const m: Record<string, any> = {};
      (roster || []).forEach((r: any) => { if (r.tag) m[r.tag] = r; });
      setMap(m);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return map;
}
