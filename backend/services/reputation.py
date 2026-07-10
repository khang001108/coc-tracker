"""
Hệ thống DANH VỌNG — thước đo uy tín thành viên, tính theo CHẤT LƯỢNG đóng
góp chứ không chỉ số lượng. KHÔNG dùng để tiêu (khác Coins) — chỉ để xếp
hạng uy tín, mở khoá vật phẩm Cửa hàng theo ngưỡng, và nhân hệ số Coins
thưởng theo tier.

Bảng điểm (theo yêu cầu):
  Tham gia War            +2      Bỏ lượt War        -15
  War thắng               +3      Không đánh CWL     -25
  Đạt 3 sao (mỗi lần)     +3
  Tham gia CWL            +5
  3 sao trong CWL (mỗi lần) +5
  Donate đủ 500 quân/tuần +2
  Hoàn thành Clan Games   +5
  Tham gia Raid Weekend   +3
  Top đóng góp tuần       +10
  Top đóng góp tháng      +30

Mỗi sự kiện cộng/trừ điểm được ghi vào member_reputation_log với `ref_key`
để chống cộng trùng (vd 1 war chỉ tính 1 lần dù poll lại nhiều lần).
"""
import logging
from supabase_client import get_supabase

log = logging.getLogger("reputation")

POINTS = {
    "war_participate":   2,
    "war_win":           3,
    "three_star":        3,   # nhân theo số lần đạt 3 sao trong war đó
    "cwl_participate":   5,
    "cwl_three_star":    5,   # nhân theo số lần đạt 3 sao trong war CWL đó
    "donate_500":        2,
    "clan_games":        5,
    "raid_weekend":       3,
    "top_weekly_donor":  10,
    "top_monthly_donor": 30,
    "war_skip":         -15,
    "cwl_skip":         -25,
}

REASON_LABELS = {
    "war_participate":   "Tham gia War",
    "war_win":           "War thắng",
    "three_star":        "Đạt 3 sao",
    "cwl_participate":   "Tham gia CWL",
    "cwl_three_star":    "3 sao trong CWL",
    "donate_500":        "Donate đủ 500 quân/tuần",
    "clan_games":        "Hoàn thành Clan Games",
    "raid_weekend":       "Tham gia Raid Weekend",
    "top_weekly_donor":  "Top đóng góp tuần",
    "top_monthly_donor": "Top đóng góp tháng",
    "war_skip":         "Bỏ lượt War",
    "cwl_skip":         "Không đánh CWL",
    "manual":           "Điều chỉnh thủ công",
}

# Tier Danh vọng — càng cao hệ số nhân Coins thưởng war-star càng lớn.
TIERS = [
    (1000, "Kim Cương", 1.5),
    (500,  "Vàng",      1.25),
    (200,  "Bạc",       1.1),
    (0,    "Đồng",      1.0),
]


def get_tier(total: int) -> dict:
    for threshold, name, mult in TIERS:
        if total >= threshold:
            return {"name": name, "multiplier": mult, "threshold": threshold}
    return {"name": "Đồng", "multiplier": 1.0, "threshold": 0}


def add_reputation(sb, clan_id: int, player_tag: str, player_name: str, reason: str,
                    ref_key: str | None = None, note: str | None = None, points: int | None = None):
    """Ghi 1 dòng Danh vọng — an toàn khi gọi lặp lại nhờ UNIQUE(clan_id,
    player_tag, reason, ref_key): dòng trùng sẽ bị DB từ chối, bỏ qua êm."""
    pts = points if points is not None else POINTS.get(reason, 0)
    if pts == 0:
        return
    row = {
        "clan_id": clan_id, "player_tag": player_tag, "player_name": player_name,
        "reason": reason, "points": pts, "ref_key": ref_key, "note": note,
    }
    try:
        sb.table("member_reputation_log").insert(row).execute()
    except Exception:
        pass  # trùng ref_key (đã cộng lần trước) — bỏ qua, không phải lỗi thật


def get_total_reputation(sb, clan_id: int, player_tag: str) -> int:
    res = sb.table("member_reputation_log").select("points").eq("clan_id", clan_id).eq("player_tag", player_tag).execute()
    return sum(r["points"] for r in (res.data or []))


def get_all_totals(sb, clan_id: int) -> dict:
    """{player_tag: {player_name, total}} — tổng Danh vọng của TẤT CẢ người
    từng có điểm trong clan (gộp toàn bộ lịch sử, tính 1 lần cho hiệu năng)."""
    res = sb.table("member_reputation_log").select("player_tag,player_name,points").eq("clan_id", clan_id).execute()
    totals: dict = {}
    for r in (res.data or []):
        e = totals.setdefault(r["player_tag"], {"player_name": r["player_name"], "total": 0})
        e["total"] += r["points"]
        e["player_name"] = r["player_name"]  # tên mới nhất ghi đè (đổi tên trong game)
    return totals


async def run_monthly_reputation(clan_id: int):
    """Chạy vào ngày 1 hàng tháng (xem schedulers/poller.py) — tính 2 khoản
    Danh vọng theo THÁNG mà không thể tính theo tuần:
      - Hoàn thành Clan Games (+5): CoC API không có endpoint 'clan games theo
        clan' công khai — phải lấy từng thành viên qua /players/{tag}, đọc
        achievement 'Games Champion' (điểm Clan Games mùa hiện tại), so với
        ngưỡng cấu hình (mặc định 4000, đổi được ở Cài đặt).
      - Top đóng góp tháng (+30): cộng dồn donation_snapshot_log 30 ngày gần
        nhất (mỗi lần CoC reset donate hàng tuần sẽ có 1 dòng lưu lại)."""
    import datetime as _dt
    from clan_context import get_tag_by_clan_id
    from services.coc_api import get_clan_members, get_player

    sb = get_supabase()
    now = _dt.datetime.utcnow()
    month_ref = now.strftime("%Y-%m")

    # ── Top đóng góp tháng ──
    try:
        cutoff = (now - _dt.timedelta(days=30)).isoformat()
        res = (sb.table("donation_snapshot_log").select("player_tag,player_name,donations")
               .eq("clan_id", clan_id).gte("snapshot_at", cutoff).execute())
        totals: dict = {}
        for r in (res.data or []):
            e = totals.setdefault(r["player_tag"], {"player_name": r["player_name"], "sum": 0})
            e["sum"] += r.get("donations", 0) or 0
        if totals:
            top_tag = max(totals, key=lambda t: totals[t]["sum"])
            if totals[top_tag]["sum"] > 0:
                add_reputation(sb, clan_id, top_tag, totals[top_tag]["player_name"], "top_monthly_donor", ref_key=month_ref)
    except Exception as e:
        log.error(f"top_monthly_donor error (clan_id={clan_id}): {e}")

    # ── Hoàn thành Clan Games ──
    try:
        cfg = sb.table("settings").select("value").eq("key", "reputation_clan_games_target").execute()
        target = int(cfg.data[0]["value"]) if cfg.data and cfg.data[0]["value"].isdigit() else 4000
        tag = await get_tag_by_clan_id(clan_id)
        members = await get_clan_members(tag, clan_id=clan_id) if tag else []
        for m in members:
            try:
                p = await get_player(m["tag"], clan_id=clan_id)
                games_points = next((a.get("value", 0) for a in p.get("achievements", [])
                                      if a.get("name") == "Games Champion"), 0)
                if games_points >= target:
                    add_reputation(sb, clan_id, m["tag"], m["name"], "clan_games", ref_key=month_ref)
            except Exception:
                continue  # lỗi 1 người (vd server CoC lag) không chặn cả clan
    except Exception as e:
        log.error(f"clan_games reputation error (clan_id={clan_id}): {e}")
