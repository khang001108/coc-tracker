"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Map player_tag -> hạng (1-10) trong bảng xếp hạng Danh vọng — dùng để
 * hiện huy hiệu Danh vọng cạnh tên ở BẤT KỲ đâu có tên thành viên (Chat,
 * Thành viên, War...). Chỉ tải 1 lần/trang, cache nhẹ trong state cục bộ. */
export function useReputationRankMap(): Record<string, number> {
  const [map, setMap] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    api.getReputationLeaderboard(10).then((rows: any[]) => {
      if (!alive) return;
      const m: Record<string, number> = {};
      rows.forEach((r, i) => { m[r.player_tag] = i + 1; });
      setMap(m);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return map;
}
