"use client";
import { ArrowUpNarrowWide, ArrowDownWideNarrow } from "lucide-react";

/** Nút bật/tắt chiều sắp xếp (thấp→cao hoặc cao→thấp) — dùng chung cho mọi
 * danh sách/bảng xếp hạng trong app. */
export function SortToggle({ asc, onToggle, title }: { asc: boolean; onToggle: () => void; title?: string }) {
  return (
    <button onClick={onToggle} title={title || (asc ? "Đang xếp thấp → cao" : "Đang xếp cao → thấp")}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-700 text-gray-400 hover:text-yellow-400 hover:border-yellow-500/40 transition-colors shrink-0">
      {asc ? <ArrowUpNarrowWide size={14}/> : <ArrowDownWideNarrow size={14}/>}
      {asc ? "Thấp→Cao" : "Cao→Thấp"}
    </button>
  );
}
