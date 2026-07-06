"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { api, getMemberAuth } from "@/lib/api";

/**
 * Nhắc thành viên ĐÃ RỜI CLAN nhưng vẫn còn tài khoản web — cho họ biết còn
 * bao nhiêu ngày trước khi Coins/vật phẩm bị xoá (asset_cleanup_days, mặc
 * định 7 ngày). Hiện ở MỌI trang vì đây là thông tin quan trọng họ cần biết
 * ngay khi quay lại web, bất kể đang xem trang nào.
 */
export function LeaveStatusBanner() {
  const [info, setInfo] = useState<{ days_since_left: number; days_until_wipe: number; cleanup_days: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const member = getMemberAuth();
    if (!member) return;
    api.getMyMemberInfo().then((me: any) => {
      if (me?.leave_info) setInfo(me.leave_info);
    }).catch(() => {});
  }, []);

  if (!info || dismissed) return null;

  const urgent = info.days_until_wipe <= 2;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[90] px-4 py-2.5 flex items-center gap-2 text-xs sm:text-sm ${urgent ? "bg-red-600" : "bg-amber-600"} text-white`}>
      <AlertTriangle size={16} className="shrink-0" />
      <p className="flex-1">
        Bạn đã rời clan {info.days_since_left} ngày trước.{" "}
        {info.days_until_wipe > 0
          ? <>Coins & vật phẩm sẽ bị xoá sau <strong>{info.days_until_wipe} ngày</strong> nếu không quay lại clan.</>
          : <>Coins & vật phẩm của bạn có thể bị xoá bất cứ lúc nào.</>}
      </p>
      <button onClick={() => setDismissed(true)} className="shrink-0 p-1 hover:bg-white/20 rounded-full">
        <X size={14} />
      </button>
    </div>
  );
}
