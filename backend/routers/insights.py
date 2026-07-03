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
    cutoff = _period_cutoff(period)
    try:
        q = sb.table("war_participation_log").select(
            "player_tag,player_name,attacks_used,attacks_allowed,stars_earned,created_at,war_end_time,war_type,"
            "best_attack_stars,best_attack_destruction,best_attack_duration,best_attack_opponent,"
            "best_defense_stars,best_defense_destruction,best_defense_attacker"
        ).eq("clan_id", clan_id)
        if cutoff:
            q = q.gte("created_at", cutoff)
        res = q.execute()
    except Exception:
        # Chưa chạy MIGRATION PART 7 — vẫn trả về phần war yếu/hay bỏ war,
        # chỉ bỏ qua MVP tấn công/phòng thủ.
        q = sb.table("war_participation_log").select(
            "player_tag,player_name,attacks_used,attacks_allowed,stars_earned,created_at,war_end_time,war_type"
        ).eq("clan_id", clan_id)
        if cutoff:
            q = q.gte("created_at", cutoff)
        res = q.execute()
    rows = res.data or []

    per_player: dict[str, dict] = {}
    best_attack_overall = None   # đòn đánh anh dũng nhất trong cả khoảng thời gian
    best_defense_overall = None  # phòng thủ anh dũng nhất trong cả khoảng thời gian

    def _attack_key(r):
        return (r.get("best_attack_stars") or 0, r.get("best_attack_destruction") or 0, -(r.get("best_attack_duration") or 99999))

    def _defense_key(r):
        # Phòng thủ tốt = đối phương ăn ÍT sao/ít % — nên "tốt nhất" là nhỏ nhất,
        # ta đảo dấu để dùng chung logic "lớn nhất là tốt nhất" khi so sánh.
        return (-(r.get("best_defense_stars") if r.get("best_defense_stars") is not None else 99),
                -(r.get("best_defense_destruction") if r.get("best_defense_destruction") is not None else 100))

    for r in rows:
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

        if r.get("best_attack_stars") is not None:
            if best_attack_overall is None or _attack_key(r) > _attack_key(best_attack_overall):
                best_attack_overall = r
        if r.get("best_defense_stars") is not None:
            if best_defense_overall is None or _defense_key(r) > _defense_key(best_defense_overall):
                best_defense_overall = r

    players = list(per_player.values())
    for p in players:
        p["avg_stars"] = round(p["stars"] / p["wars"], 2) if p["wars"] else 0
        p["skip_rate"] = round(p["skipped"] / p["wars"] * 100) if p["wars"] else 0

    weakest = sorted([p for p in players if p["wars"] > 0], key=lambda p: p["avg_stars"])[:10]
    most_skips = sorted([p for p in players if p["skipped"] > 0], key=lambda p: (-p["skipped"], -p["skip_rate"]))[:10]

    def _fmt_attack(r):
        if not r:
            return None
        return {
            "player_name": r["player_name"], "player_tag": r["player_tag"],
            "stars": r.get("best_attack_stars"), "destruction": r.get("best_attack_destruction"),
            "duration": r.get("best_attack_duration"), "opponent": r.get("best_attack_opponent"),
            "war_end_time": r.get("war_end_time"), "war_type": r.get("war_type"),
        }

    def _fmt_defense(r):
        if not r:
            return None
        return {
            "player_name": r["player_name"], "player_tag": r["player_tag"],
            "stars": r.get("best_defense_stars"), "destruction": r.get("best_defense_destruction"),
            "attacker": r.get("best_defense_attacker"),
            "war_end_time": r.get("war_end_time"), "war_type": r.get("war_type"),
        }

    return {
        "period": period,
        "total_wars_tracked": len(set(r["war_end_time"] for r in rows)),
        "weakest_war": weakest,
        "most_skips": most_skips,
        "mvp_attack": _fmt_attack(best_attack_overall),
        "mvp_defense": _fmt_defense(best_defense_overall),
    }


@router.get("/war-history")
async def war_history(request: Request, war_type: str = Query("random", pattern="^(random|cwl)$"), limit: int = Query(20, le=100)):
    """Lịch sử war tự tích luỹ (kể cả CWL — CoC API không cho xem lại các mùa
    CWL cũ nên chỉ có dữ liệu từ lúc app bắt đầu ghi nhận trở đi)."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    try:
        res = sb.table("war_history_log").select("*").eq("clan_id", clan_id).eq("war_type", war_type) \
            .order("created_at", desc=True).limit(limit).execute()
        return {"items": res.data or []}
    except Exception:
        return {"items": [], "error": "chưa chạy migration PART 7"}
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
