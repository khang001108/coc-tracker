"""
Thống kê tích luỹ theo thời gian (khác với /api/clan/... vốn chỉ nhìn dữ
liệu hiện tại): war yếu nhất, hay bỏ war nhất, donate ít nhất — tính từ
war_participation_log / donation_snapshot_log do poller ghi lại mỗi khi có
war kết thúc / donate bị CoC reset hàng tuần.
"""
from fastapi import APIRouter, Request, Query
from supabase_client import get_supabase
from clan_context import get_clan_id
from datetime import datetime, timedelta

router = APIRouter()


def _period_cutoff(period: str) -> str | None:
    if period == "week":
        return (datetime.utcnow() - timedelta(days=7)).isoformat()
    if period == "month":
        return (datetime.utcnow() - timedelta(days=30)).isoformat()
    return None  # "all" — từ ngày thành lập web, không giới hạn


@router.get("/war-activity")
async def war_activity(request: Request, period: str = Query("all", pattern="^(week|month|all)$")):
    clan_id = get_clan_id(request)
    sb = get_supabase()
    q = sb.table("war_participation_log").select(
        "player_tag,player_name,attacks_used,attacks_allowed,stars_earned,created_at"
    ).eq("clan_id", clan_id)
    cutoff = _period_cutoff(period)
    if cutoff:
        q = q.gte("created_at", cutoff)
    res = q.execute()

    per_player: dict[str, dict] = {}
    for r in res.data or []:
        p = per_player.setdefault(r["player_tag"], {
            "tag": r["player_tag"], "name": r["player_name"],
            "wars": 0, "skipped": 0, "stars": 0, "attacks_used": 0, "attacks_allowed": 0,
        })
        p["name"] = r["player_name"]  # tên mới nhất
        p["wars"] += 1
        p["stars"] += r["stars_earned"] or 0
        p["attacks_used"] += r["attacks_used"] or 0
        p["attacks_allowed"] += r["attacks_allowed"] or 0
        if (r["attacks_used"] or 0) < (r["attacks_allowed"] or 0):
            p["skipped"] += 1

    players = list(per_player.values())
    for p in players:
        p["avg_stars"] = round(p["stars"] / p["wars"], 2) if p["wars"] else 0
        p["skip_rate"] = round(p["skipped"] / p["wars"] * 100) if p["wars"] else 0

    weakest = sorted([p for p in players if p["wars"] > 0], key=lambda p: p["avg_stars"])[:10]
    most_skips = sorted([p for p in players if p["skipped"] > 0], key=lambda p: (-p["skipped"], -p["skip_rate"]))[:10]

    return {
        "period": period,
        "total_wars_tracked": len(set(r["created_at"] for r in (res.data or []))),  # xấp xỉ
        "weakest_war": weakest,
        "most_skips": most_skips,
    }


@router.get("/donation-trend")
async def donation_trend(request: Request, period: str = Query("all", pattern="^(week|month|all)$")):
    clan_id = get_clan_id(request)
    sb = get_supabase()
    q = sb.table("donation_snapshot_log").select("player_tag,player_name,donations,snapshot_at").eq("clan_id", clan_id)
    cutoff = _period_cutoff(period)
    if cutoff:
        q = q.gte("snapshot_at", cutoff)
    res = q.execute()

    per_player: dict[str, dict] = {}
    for r in res.data or []:
        p = per_player.setdefault(r["player_tag"], {"tag": r["player_tag"], "name": r["player_name"], "donations": 0, "weeks": 0})
        p["name"] = r["player_name"]
        p["donations"] += r["donations"] or 0
        p["weeks"] += 1

    # Cộng thêm donate của tuần CHƯA reset (đang tích luỹ, lấy từ donation_tracker hiện tại)
    # để không bỏ sót tuần hiện tại khi xem "tuần này"/"tháng này".
    try:
        live = sb.table("donation_tracker").select("player_tag,last_donations").execute()
        # Cần map tag->name mới nhất — lấy từ war_participation_log/member_log nếu có
        names_res = sb.table("member_log").select("player_tag,name").eq("clan_id", clan_id).eq("status", "active").execute()
        name_map = {r["player_tag"]: r["name"] for r in (names_res.data or [])}
        for r in live.data or []:
            tag = r["player_tag"]
            if tag not in name_map:
                continue  # chỉ tính thành viên hiện đang trong clan này
            p = per_player.setdefault(tag, {"tag": tag, "name": name_map[tag], "donations": 0, "weeks": 0})
            p["donations"] += r["last_donations"] or 0
    except Exception:
        pass

    least = sorted(per_player.values(), key=lambda p: p["donations"])[:10]
    return {"period": period, "least_donate": least}
