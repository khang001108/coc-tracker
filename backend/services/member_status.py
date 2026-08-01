"""
Đánh dấu "đã rời clan" + ẩn thủ công khỏi các bảng xếp hạng LỊCH SỬ (War
nổi bật, Nhiều sao War, War yếu, Hay bỏ war, Chỉ số hoạt động, Coins, Danh
vọng...). KHÔNG xoá dữ liệu gốc — chỉ đánh dấu để hiển thị xám + nhãn, hoặc
lọc bỏ khỏi kết quả trả về nếu Admin đã ẩn thủ công.
"""


def get_left_tags(sb, clan_id: int) -> set:
    """Tag của những người ĐANG được ghi nhận là đã rời clan (member_log).
    LẤY ĐÚNG TRẠNG THÁI MỚI NHẤT theo từng tag — bảng member_log không có
    ràng buộc unique trên player_tag nên có thể tồn tại NHIỀU dòng lịch sử
    cho cùng 1 người (ví dụ rời rồi quay lại nhiều lần); nếu chỉ hỏi "có
    từng dòng status=left nào không" sẽ SAI khi họ đã quay lại (có dòng
    active MỚI HƠN) — phải lấy đúng dòng created_at gần nhất mới đáng tin."""
    try:
        res = (sb.table("member_log").select("player_tag,status,created_at")
               .eq("clan_id", clan_id).order("created_at", desc=True).execute())
        latest_status: dict = {}
        for r in (res.data or []):
            if r["player_tag"] not in latest_status:  # dòng ĐẦU TIÊN gặp = mới nhất (đã order desc)
                latest_status[r["player_tag"]] = r["status"]
        return {tag for tag, status in latest_status.items() if status == "left"}
    except Exception:
        return set()


def get_hidden_tags(sb, clan_id: int) -> set:
    """Tag đã bị Admin ẩn thủ công khỏi các bảng xếp hạng lịch sử."""
    try:
        res = sb.table("stats_hidden_members").select("player_tag").eq("clan_id", clan_id).execute()
        return {r["player_tag"] for r in (res.data or [])}
    except Exception:
        return set()


def annotate_and_filter(rows: list, tag_key: str, left_tags: set, hidden_tags: set) -> list:
    """Lọc bỏ người đã bị Admin ẩn thủ công, đánh dấu left_clan=True cho
    người còn lại đã rời clan (giữ nguyên trong danh sách, chỉ đánh dấu)."""
    out = []
    for r in rows:
        tag = r.get(tag_key)
        if tag in hidden_tags:
            continue
        r["left_clan"] = tag in left_tags
        out.append(r)
    return out
