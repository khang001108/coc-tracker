"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Map player_tag -> role ("leader"|"coLeader"|"admin"|"elder"|"member") —
 * dùng để hiện chức vụ cạnh tên ở các danh sách Top/Tổng quan (không phải
 * lúc nào cũng có sẵn role kèm theo dữ liệu, vd Danh vọng/Báo cáo tuần chỉ
 * lưu tag+tên). Chỉ tải 1 lần/trang. */
export function useRoleMap(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    api.getMembers().then((r: any) => {
      if (!alive) return;
      const items = r.items || r || [];
      const m: Record<string, string> = {};
      items.forEach((it: any) => { if (it.tag) m[it.tag] = it.role; });
      setMap(m);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return map;
}
