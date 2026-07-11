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
import json

router = APIRouter()


@router.get("/top-coins")
async def top_coins(request: Request, limit: int = Query(10, le=50), scope: str = Query("clan")):
    """Xếp hạng ai đang có nhiều Coins nhất (chỉ tính người đã đăng nhập/nhận
    tài khoản trên web, vì Coins chỉ tồn tại cho nhóm này).
    scope=clan: chỉ trong clan đang chọn. scope=all: liên clan (mọi clan)."""
    sb = get_supabase()

    if scope == "all":
        clans_res = sb.table("clans").select("id, clan_name").execute()
        clan_info = {c["id"]: c for c in (clans_res.data or [])}
        # Lấy huy hiệu từng clan từ snapshot gần nhất (không gọi lại CoC API cho
        # từng clan — dùng cache có sẵn cho nhanh)
        badges: dict[int, str] = {}
        for cid in clan_info:
            try:
                snap = sb.table("snapshot_clan").select("data").eq("clan_id", cid).order("id", desc=True).limit(1).execute()
                if snap.data:
                    badges[cid] = json.loads(snap.data[0]["data"]).get("badgeUrls", {}).get("medium", "")
            except Exception:
                pass

        res = sb.table("member_accounts").select("player_tag,player_name,coins,clan_id").order("coins", desc=True).execute()
        rows = [r for r in (res.data or []) if (r.get("coins") or 0) > 0][:limit]
        return {"top": [{
            "tag": r["player_tag"], "name": r["player_name"], "coins": r.get("coins") or 0,
            "clan_id": r.get("clan_id"),
            "clan_name": clan_info.get(r.get("clan_id"), {}).get("clan_name", "?"),
            "clan_badge": badges.get(r.get("clan_id"), ""),
        } for r in rows]}

    clan_id = get_clan_id(request)
    tag = None
    try:
        from clan_context import get_tag_by_clan_id
        tag = await get_tag_by_clan_id(clan_id)
    except Exception:
        pass
    # Lọc đúng thành viên đang trong clan này (member_accounts không phải lúc
    # nào cũng có clan_id nếu chưa chạy hết migration — nên đối chiếu qua
    # roster hiện tại của CoC API cho chắc).
    try:
        from services.coc_api import get_clan_members
        members = await get_clan_members(tag, clan_id=clan_id) if tag else []
        member_tags = {m["tag"] for m in members}
    except Exception:
        member_tags = None

    res = sb.table("member_accounts").select("player_tag,player_name,coins").order("coins", desc=True).execute()
    rows = res.data or []
    if member_tags is not None:
        rows = [r for r in rows if r["player_tag"] in member_tags]
    rows = [r for r in rows if (r.get("coins") or 0) > 0][:limit]
    return {"top": [{"tag": r["player_tag"], "name": r["player_name"], "coins": r.get("coins") or 0} for r in rows]}


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

    now_iso = datetime.utcnow().isoformat()
    if cutoff:
        period_start = cutoff
    else:
        # "all" — lấy created_at sớm nhất trong dữ liệu đang có (từ khi bắt đầu ghi nhận)
        period_start = min((r["created_at"] for r in rows if r.get("created_at")), default=None)

    return {
        "period": period,
        "period_start": period_start,
        "period_end": now_iso,
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
        items = res.data or []
    except Exception:
        return {"items": [], "error": "chưa chạy migration PART 7"}

    if war_type == "cwl":
        # Đánh số mùa tuần tự 1,2,3... theo THỨ TỰ THỜI GIAN thật (giống cách
        # đánh số ở tính năng Huy chương CWL) — để nhóm lịch sử theo "Mùa X"
        # thay vì hiện chuỗi "2026-07" thô của CoC.
        try:
            seasons_res = sb.table("cwl_season_log").select("season").eq("clan_id", clan_id).order("season").execute()
            ordered_seasons = sorted({r["season"] for r in (seasons_res.data or [])})
            season_number_map = {s: i + 1 for i, s in enumerate(ordered_seasons)}
            for it in items:
                it["season_number"] = season_number_map.get(it.get("season"))
        except Exception:
            pass

    return {"items": items}
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
