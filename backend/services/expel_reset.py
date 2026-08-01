"""
Reset dữ liệu đóng góp khi 1 người bị KHAI TRỪ (không phải rời tự nguyện) —
để nếu họ quay lại clan sau này, không giữ lại lợi thế từ trước lúc bị phạt
(Danh vọng, sao War, Chỉ số hoạt động, Coins tích luỹ...) — tránh việc được
lên chức nhanh hơn người khác nhờ dữ liệu cũ, dù đã từng bị đuổi vì không
đủ Nội quy.

CHỈ áp dụng cho hành động "expel" (khai trừ) — rời clan TỰ NGUYỆN (không vi
phạm gì) vẫn giữ nguyên lịch sử như bình thường, không bị ảnh hưởng."""


def reset_contribution_data(sb, clan_id: int, player_tag: str):
    """Xoá sạch dữ liệu đóng góp tích luỹ của 1 người trong 1 clan cụ thể.
    KHÔNG xoá lịch sử war/donate/... của các thành viên KHÁC, chỉ xoá dòng
    của đúng player_tag này. An toàn khi gọi lặp lại (không có gì để xoá
    thêm lần 2 thì không lỗi gì).

    Giới hạn đã biết: KHÔNG xoá được phần "War nổi bật" (war_highlight) vì
    dữ liệu đó nằm chung trong 1 dòng JSON của cả clan theo từng tuần
    (weekly_report_log), không tách xoá riêng theo người được — ảnh hưởng
    không lớn vì đó chỉ là con số "từng lọt Top 5 mấy lần", không phải kho
    điểm số có thể cộng dồn nhanh."""
    for table in ("member_reputation_log", "war_participation_log", "coins_log"):
        try:
            sb.table(table).delete().eq("clan_id", clan_id).eq("player_tag", player_tag).execute()
        except Exception:
            pass

    try:
        sb.table("activity_index").delete().eq("clan_id", clan_id).eq("player_tag", player_tag).execute()
    except Exception:
        pass

    try:
        sb.table("member_accounts").update({"coins": 0}).eq("player_tag", player_tag).execute()
    except Exception:
        pass
