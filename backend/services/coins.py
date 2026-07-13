"""Ví Coins dùng chung — mọi nơi cộng/trừ Coins nên gọi qua đây để tự động
ghi lại lịch sử giao dịch (coins_log), phục vụ tính năng "xem lịch sử Coins"
khi bấm vào 1 người ở Thống kê → Tích luỹ → Nhiều Coins nhất."""
import datetime

REASON_LABELS = {
    "war_star":       "Thưởng sao War",
    "donate":         "Thưởng Donate",
    "quest":          "Hoàn thành Nhiệm vụ",
    "shop_purchase":  "Mua vật phẩm Cửa hàng",
    "event_reward":   "Thưởng Sự kiện",
    "event_refund":   "Hoàn Coins Sự kiện (huỷ)",
    "manual":         "Điều chỉnh thủ công",
}


def add_coins(sb, clan_id: int, player_tag: str, player_name: str, reason: str, amount: int, note: str | None = None) -> int:
    """Cộng/trừ Coins (amount có thể âm) + ghi log. Trả về số dư MỚI.
    An toàn nếu bảng coins_log chưa tồn tại (chưa chạy migration) — vẫn cập
    nhật số dư bình thường, chỉ bỏ qua phần ghi log."""
    if amount == 0:
        acc = sb.table("member_accounts").select("coins").eq("player_tag", player_tag).execute()
        return (acc.data[0].get("coins") or 0) if acc.data else 0

    acc = sb.table("member_accounts").select("coins").eq("player_tag", player_tag).execute()
    current = (acc.data[0].get("coins") or 0) if acc.data else 0
    new_balance = max(0, current + amount)
    sb.table("member_accounts").update({"coins": new_balance}).eq("player_tag", player_tag).execute()

    try:
        sb.table("coins_log").insert({
            "clan_id": clan_id, "player_tag": player_tag, "player_name": player_name,
            "reason": reason, "amount": amount, "note": note,
        }).execute()
    except Exception:
        pass  # chưa chạy migration coins_log — không chặn giao dịch chính

    return new_balance
