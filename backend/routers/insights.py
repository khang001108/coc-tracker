"""
Thống kê tích luỹ theo thời gian (khác với /api/clan/... vốn chỉ nhìn dữ
liệu hiện tại): war yếu nhất, hay bỏ war nhất, donate ít nhất — tính từ
war_participation_log / donation_snapshot_log do poller ghi lại mỗi khi có
war kết thúc / donate bị CoC reset hàng tuần.
"""
from fastapi import APIRouter, Request, Query, Depends
from supabase_client import get_supabase
from clan_context import get_clan_id
from auth import require_admin
from datetime import datetime, timedelta
import json

router = APIRouter()


@router.get("/hidden-members")
async def list_hidden_members(request: Request):
    """Danh sách người Admin đã ẩn thủ công khỏi các bảng xếp hạng lịch sử."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    try:
        res = (sb.table("stats_hidden_members").select("*").eq("clan_id", clan_id)
               .order("hidden_at", desc=True).execute())
        return res.data or []
    except Exception:
        return []


@router.post("/hidden-members")
async def hide_member(request: Request, _: bool = Depends(require_admin)):
    """Ẩn 1 người khỏi các bảng xếp hạng lịch sử — dùng khi người ra vào
    clan liên tục làm nhiễu bảng xếp hạng toàn người đã rời. KHÔNG xoá dữ
    liệu gốc, chỉ ẩn khỏi kết quả trả về."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    body = await request.json()
    player_tag = body.get("player_tag")
    player_name = body.get("player_name", player_tag)
    if not player_tag:
        from fastapi import HTTPException
        raise HTTPException(400, "Thiếu player_tag")
    sb.table("stats_hidden_members").upsert({
        "clan_id": clan_id, "player_tag": player_tag, "player_name": player_name,
    }, on_conflict="clan_id,player_tag").execute()
    return {"ok": True}


@router.delete("/hidden-members/{player_tag}")
async def unhide_member(player_tag: str, request: Request, _: bool = Depends(require_admin)):
    """Bỏ ẩn — cho hiện lại trong các bảng xếp hạng lịch sử."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    sb.table("stats_hidden_members").delete().eq("clan_id", clan_id).eq("player_tag", player_tag).execute()
    return {"ok": True}


@router.get("/activity-index")
async def activity_index(request: Request, limit: int = Query(500, le=2000), scope: str = Query("clan")):
    """Chỉ số hoạt động của mọi thành viên — xem services/activity.py.
    Trả về sắp xếp thấp → cao (ai lâu không hoạt động lên đầu, dễ chú ý).
    scope=clan: chỉ trong clan đang chọn. scope=all: liên clan (mọi clan)."""
    sb = get_supabase()
    from services.activity import get_activity_settings
    days_to_full, threshold = get_activity_settings(sb)
    try:
        q = sb.table("activity_index").select("*")
        if scope != "all":
            q = q.eq("clan_id", get_clan_id(request))
        res = q.order("percent").limit(limit).execute()
        rows = res.data or []
        if scope == "all" and rows:
            lookup = _clan_lookup(sb)
            for r in rows:
                info = lookup.get(r.get("clan_id"), {})
                r["clan_name"] = info.get("name", "?")
                r["clan_badge"] = info.get("badge", "")
        from services.member_status import get_left_tags, get_hidden_tags, annotate_and_filter
        by_clan: dict = {}
        for r in rows:
            by_clan.setdefault(r.get("clan_id"), []).append(r)
        rows = []
        for cid, group in by_clan.items():
            left_tags = get_left_tags(sb, cid)
            hidden_tags = get_hidden_tags(sb, cid)
            rows.extend(annotate_and_filter(group, "player_tag", left_tags, hidden_tags))
        rows.sort(key=lambda r: r["percent"])
    except Exception:
        rows = []
    return {"days_to_full": days_to_full, "penalty_threshold": threshold, "members": rows}


@router.get("/coins-history/{player_tag}")
async def coins_history(player_tag: str, request: Request, limit: int = Query(50, le=200)):
    """Lịch sử cộng/trừ Coins của 1 người — dùng khi bấm vào tên ở
    Thống kê → Tích luỹ → Nhiều Coins nhất."""
    sb = get_supabase()
    try:
        res = (sb.table("coins_log").select("*").eq("player_tag", player_tag)
               .order("created_at", desc=True).limit(limit).execute())
        rows = res.data or []
    except Exception:
        return {"total": 0, "history": [], "error": "chưa chạy migration PART 33"}

    acc = sb.table("member_accounts").select("coins,player_name").eq("player_tag", player_tag).execute()
    total = (acc.data[0].get("coins") or 0) if acc.data else 0
    name = (acc.data[0].get("player_name") if acc.data else None) or (rows[0]["player_name"] if rows else player_tag)

    from services.coins import REASON_LABELS
    for r in rows:
        r["reason_label"] = REASON_LABELS.get(r["reason"], r["reason"])
    return {"total": total, "player_name": name, "history": rows}


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
        rows = [r for r in (res.data or []) if (r.get("coins") or 0) > 0]
        out = [{
            "tag": r["player_tag"], "name": r["player_name"], "coins": r.get("coins") or 0,
            "clan_id": r.get("clan_id"),
            "clan_name": clan_info.get(r.get("clan_id"), {}).get("clan_name", "?"),
            "clan_badge": badges.get(r.get("clan_id"), ""),
        } for r in rows]
        from services.member_status import get_left_tags, get_hidden_tags, annotate_and_filter
        by_clan: dict = {}
        for r in out:
            by_clan.setdefault(r.get("clan_id"), []).append(r)
        merged = []
        for cid, group in by_clan.items():
            left_tags = get_left_tags(sb, cid)
            hidden_tags = get_hidden_tags(sb, cid)
            merged.extend(annotate_and_filter(group, "tag", left_tags, hidden_tags))
        merged.sort(key=lambda r: -r["coins"])
        return {"top": merged[:limit]}

    clan_id = get_clan_id(request)
    tag = None
    try:
        from clan_context import get_tag_by_clan_id
        tag = await get_tag_by_clan_id(clan_id)
    except Exception:
        pass
    # Đối chiếu roster CoC API hiện tại — chỉ dùng để lọc bỏ dữ liệu SAI clan
    # (member_accounts thiếu clan_id do chưa chạy hết migration cũ), KHÔNG
    # dùng để loại người đã rời clan — người đã rời vẫn giữ trong danh sách,
    # chỉ đánh dấu xám (left_clan) qua member_log, trừ khi Admin ẩn thủ công.
    try:
        from services.coc_api import get_clan_members
        members = await get_clan_members(tag, clan_id=clan_id) if tag else []
        member_tags = {m["tag"] for m in members}
    except Exception:
        member_tags = None

    from services.member_status import get_left_tags, get_hidden_tags, annotate_and_filter
    left_tags = get_left_tags(sb, clan_id)
    hidden_tags = get_hidden_tags(sb, clan_id)

    res = sb.table("member_accounts").select("player_tag,player_name,coins").order("coins", desc=True).execute()
    rows = res.data or []
    if member_tags is not None:
        rows = [r for r in rows if r["player_tag"] in member_tags or r["player_tag"] in left_tags]
    rows = [r for r in rows if (r.get("coins") or 0) > 0]
    out = [{"tag": r["player_tag"], "name": r["player_name"], "coins": r.get("coins") or 0} for r in rows]
    out = annotate_and_filter(out, "tag", left_tags, hidden_tags)
    return {"top": out[:limit]}


def _period_cutoff(period: str):
    if period == "week":
        return datetime.utcnow() - timedelta(days=7)
    if period == "month":
        return datetime.utcnow() - timedelta(days=30)
    return None  # "all" — từ ngày thành lập web, không giới hạn


def _parse_coc_dt(s: str):
    """war_end_time lưu dạng chuỗi CoC API gốc (vd '20260714T182300.000Z') —
    parse ra datetime thật để lọc/so sánh, KHÔNG dùng created_at (thời điểm
    DB ghi dòng) vì nếu poller từng bị trễ (lỗi CoC API/proxy vài ngày —
    xem services/coc_api.py) thì created_at của cả loạt dữ liệu bị dồn vào
    đúng lúc poller chạy lại, làm sai lệch hẳn khoảng thời gian hiển thị."""
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y%m%dT%H%M%S.%fZ")
    except Exception:
        return None


def _coc_dt_str(dt) -> str:
    """Ngược lại _parse_coc_dt — định dạng 1 datetime về đúng kiểu chuỗi CoC
    API để so sánh (>=) với cột war_end_time (TEXT, chưa phải TIMESTAMPTZ)."""
    return dt.strftime("%Y%m%dT%H%M%S.000Z")


@router.get("/trophy-seasons")
async def trophy_seasons(request: Request, seasons_count: int = Query(3, le=12)):
    """Top Cúp của N mùa gần nhất — trophy_season_log được poll_clan (mỗi 15
    phút) tự cập nhật liên tục đỉnh Cúp của mùa hiện tại (xem
    schedulers/poller.py::_merge_trophy_season), tự "chốt" đúng lúc CoC reset
    xảy ra bất kể ngày nào. Trả về nhóm theo từng mùa, mới nhất trước."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    try:
        res = (sb.table("trophy_season_log").select("season").eq("clan_id", clan_id)
               .order("season", desc=True).execute())
        seasons = sorted({r["season"] for r in (res.data or [])}, reverse=True)[:seasons_count]
        out = []
        for s in seasons:
            rows = (sb.table("trophy_season_log").select("player_tag,player_name,trophies")
                    .eq("clan_id", clan_id).eq("season", s).order("trophies", desc=True).limit(10).execute())
            out.append({"season": s, "top": rows.data or []})
        return out
    except Exception:
        return []


@router.get("/top-trophies")
async def top_trophies(request: Request, limit: int = Query(10, le=50), scope: str = Query("clan")):
    """Xếp hạng Cúp — scope=clan: chỉ trong clan đang chọn (dùng dữ liệu
    thành viên hiện tại). scope=all: liên clan (mọi clan, dùng snapshot đã
    lưu sẵn cho nhanh, không gọi lại CoC API cho từng clan)."""
    sb = get_supabase()

    if scope == "all":
        clans_res = sb.table("clans").select("id, clan_name").execute()
        clan_info = {c["id"]: c for c in (clans_res.data or [])}
        rows = []
        for cid in clan_info:
            try:
                snap = sb.table("snapshot_clan").select("data").eq("clan_id", cid).order("id", desc=True).limit(1).execute()
                if not snap.data:
                    continue
                clan_data = json.loads(snap.data[0]["data"])
                badge = clan_data.get("badgeUrls", {}).get("medium", "")
                for m in clan_data.get("memberList", []):
                    rows.append({
                        "tag": m["tag"], "name": m["name"], "trophies": m.get("trophies", 0),
                        "clan_id": cid, "clan_name": clan_info[cid]["clan_name"], "clan_badge": badge,
                    })
            except Exception:
                continue
        rows.sort(key=lambda r: -r["trophies"])
        return {"top": rows[:limit]}

    from clan_context import get_tag_for_request
    from services.coc_api import get_clan_members_resilient
    _, tag = await get_tag_for_request(request)
    members = await get_clan_members_resilient(tag, clan_id=get_clan_id(request)) if tag else []
    ranked = sorted(members, key=lambda m: -(m.get("trophies") or 0))
    return {"top": [{"tag": m["tag"], "name": m["name"], "trophies": m.get("trophies") or 0} for m in ranked[:limit]]}


def _clan_lookup(sb) -> dict:
    """{clan_id: {name, badge}} cho mọi clan — dùng snapshot đã lưu sẵn,
    không gọi lại CoC API cho từng clan (nhanh hơn nhiều khi xem liên clan)."""
    clans_res = sb.table("clans").select("id, clan_name").execute()
    info = {c["id"]: {"name": c["clan_name"], "badge": ""} for c in (clans_res.data or [])}
    for cid in info:
        try:
            snap = sb.table("snapshot_clan").select("data").eq("clan_id", cid).order("id", desc=True).limit(1).execute()
            if snap.data:
                info[cid]["badge"] = json.loads(snap.data[0]["data"]).get("badgeUrls", {}).get("medium", "")
        except Exception:
            pass
    return info


def _compute_clan_war_stats(sb, clan_id: int, war_end_cutoff, report_cutoff_iso: str | None) -> dict:
    """Tính chỉ số War cho 1 clan — KHÔNG sort/cắt bớt (để gộp nhiều clan lại
    thành 1 danh sách rồi mới sort 1 lần khi xem Liên clan)."""
    def _fetch_all(select_cols: str) -> list:
        """Phân trang thủ công — Supabase/PostgREST mặc định chỉ trả tối đa
        1000 dòng/lượt gọi. Clan war đều đặn nhiều tháng dễ vượt mốc này."""
        out: list = []
        start = 0
        page_size = 1000
        while True:
            q = sb.table("war_participation_log").select(select_cols).eq("clan_id", clan_id)
            if war_end_cutoff:
                q = q.gte("war_end_time", war_end_cutoff)
            batch = (q.range(start, start + page_size - 1).execute()).data or []
            out.extend(batch)
            if len(batch) < page_size:
                break
            start += page_size
        return out

    try:
        rows = _fetch_all(
            "player_tag,player_name,attacks_used,attacks_allowed,stars_earned,created_at,war_end_time,war_type,"
            "best_attack_stars,best_attack_destruction,best_attack_duration,best_attack_opponent,"
            "best_defense_stars,best_defense_destruction,best_defense_attacker"
        )
    except Exception:
        rows = _fetch_all("player_tag,player_name,attacks_used,attacks_allowed,stars_earned,created_at,war_end_time,war_type")

    per_player: dict[str, dict] = {}
    best_attack, best_defense = None, None

    def _attack_key(r):
        return (r.get("best_attack_stars") or 0, r.get("best_attack_destruction") or 0, -(r.get("best_attack_duration") or 99999))

    def _defense_key(r):
        return (-(r.get("best_defense_stars") if r.get("best_defense_stars") is not None else 99),
                -(r.get("best_defense_destruction") if r.get("best_defense_destruction") is not None else 100))

    for r in rows:
        p = per_player.setdefault(r["player_tag"], {
            "tag": r["player_tag"], "name": r["player_name"], "wars": 0, "stars": 0,
            "skipped_fraction": 0.0, "attacks_used": 0, "attacks_allowed": 0,
        })
        p["name"] = r["player_name"]
        p["wars"] += 1
        p["stars"] += r["stars_earned"] or 0
        used, allowed = r.get("attacks_used") or 0, r.get("attacks_allowed") or 0
        p["attacks_used"] += used
        p["attacks_allowed"] += allowed
        if allowed > 0:
            p["skipped_fraction"] += (allowed - used) / allowed
        if r.get("best_attack_stars") is not None:
            if best_attack is None or _attack_key(r) > _attack_key(best_attack):
                best_attack = r
        if r.get("best_defense_stars") is not None:
            if best_defense is None or _defense_key(r) > _defense_key(best_defense):
                best_defense = r

    for p in per_player.values():
        p["avg_stars"] = round(p["stars"] / p["wars"], 2) if p["wars"] else 0
        p["skipped"] = round(p["skipped_fraction"], 1)
        p["skip_rate"] = round(p["skipped_fraction"] / p["wars"] * 100) if p["wars"] else 0

    # War nổi bật — số lần lọt Top 5 "War/CWL giỏi nhất" ở Báo cáo tuần
    war_highlight_count: dict[str, dict] = {}
    try:
        q = sb.table("weekly_report_log").select("report,created_at").eq("clan_id", clan_id)
        if report_cutoff_iso:
            q = q.gte("created_at", report_cutoff_iso)
        for row in (q.execute().data or []):
            for idx, e in enumerate(((row.get("report") or {}).get("war") or {}).get("good", [])[:5]):
                t = e.get("player_tag")
                if not t:
                    continue
                acc = war_highlight_count.setdefault(t, {"tag": t, "name": e.get("player_name"), "count": 0, "weeks": []})
                acc["count"] += 1
                acc["weeks"].append({"date": row.get("created_at"), "rank": idx + 1, "value": e.get("value")})
    except Exception:
        pass

    from services.member_status import get_left_tags, get_hidden_tags, annotate_and_filter
    left_tags = get_left_tags(sb, clan_id)
    hidden_tags = get_hidden_tags(sb, clan_id)
    per_player_list = annotate_and_filter(list(per_player.values()), "tag", left_tags, hidden_tags)
    war_highlight_list = annotate_and_filter(list(war_highlight_count.values()), "tag", left_tags, hidden_tags)

    return {
        "rows": rows, "per_player": per_player_list,
        "war_highlight_count": {h["tag"]: h for h in war_highlight_list},
        "best_attack": best_attack, "best_defense": best_defense,
    }


@router.get("/war-activity")
async def war_activity(request: Request, period: str = Query("all", pattern="^(week|month|all)$"), scope: str = Query("clan")):
    """scope=clan: chỉ trong clan đang chọn. scope=all: liên clan (mọi
    clan) — để so sánh giữa các clan với nhau. TRẢ VỀ ĐẦY ĐỦ mọi thành viên
    (không giới hạn Top 10) — sắp thứ tự để hiển thị, cắt bớt tuỳ frontend."""
    sb = get_supabase()
    cutoff = _period_cutoff(period)
    # Lọc theo war_end_time (thời điểm war THẬT SỰ kết thúc, lấy từ CoC API)
    # chứ không phải created_at (lúc DB ghi dòng) — nếu poller từng bị trễ
    # (CoC API/proxy lỗi vài ngày) thì created_at của cả loạt dữ liệu cũ sẽ
    # dồn vào đúng lúc poller chạy lại, làm khoảng thời gian hiển thị sai hẳn.
    war_end_cutoff = _coc_dt_str(cutoff) if cutoff else None
    report_cutoff_iso = cutoff.isoformat() if cutoff else None

    if scope == "all":
        clans_res = sb.table("clans").select("id").execute()
        clan_ids = [c["id"] for c in (clans_res.data or [])]
        lookup = _clan_lookup(sb)
    else:
        clan_ids = [get_clan_id(request)]
        lookup = {}

    all_rows: list = []
    all_players: list = []
    all_highlights: list = []
    best_attack_overall, best_defense_overall = None, None

    def _attack_key(r):
        return (r.get("best_attack_stars") or 0, r.get("best_attack_destruction") or 0, -(r.get("best_attack_duration") or 99999))

    def _defense_key(r):
        return (-(r.get("best_defense_stars") if r.get("best_defense_stars") is not None else 99),
                -(r.get("best_defense_destruction") if r.get("best_defense_destruction") is not None else 100))

    for cid in clan_ids:
        stats = _compute_clan_war_stats(sb, cid, war_end_cutoff, report_cutoff_iso)
        tag_info = lookup.get(cid, {})
        for p in stats["per_player"]:
            if scope == "all":
                p = {**p, "clan_id": cid, "clan_name": tag_info.get("name", "?"), "clan_badge": tag_info.get("badge", "")}
            all_players.append(p)
        for h in stats["war_highlight_count"].values():
            if scope == "all":
                h = {**h, "clan_id": cid, "clan_name": tag_info.get("name", "?"), "clan_badge": tag_info.get("badge", "")}
            all_highlights.append(h)
        all_rows.extend(stats["rows"])
        ba, bd = stats["best_attack"], stats["best_defense"]
        if ba is not None and (best_attack_overall is None or _attack_key(ba) > _attack_key(best_attack_overall)):
            best_attack_overall = {**ba, "clan_id": cid, "clan_name": tag_info.get("name")} if scope == "all" else ba
        if bd is not None and (best_defense_overall is None or _defense_key(bd) > _defense_key(best_defense_overall)):
            best_defense_overall = {**bd, "clan_id": cid, "clan_name": tag_info.get("name")} if scope == "all" else bd

    most_stars = sorted([p for p in all_players if p["stars"] > 0], key=lambda p: -p["stars"])
    weakest = sorted([p for p in all_players if p["wars"] > 0], key=lambda p: p["avg_stars"])
    most_skips = sorted([p for p in all_players if p["skipped_fraction"] > 0], key=lambda p: (-p["skipped_fraction"], -p["skip_rate"]))
    war_highlights = sorted(all_highlights, key=lambda p: -p["count"])

    def _fmt_attack(r):
        if not r:
            return None
        out = {
            "player_name": r["player_name"], "player_tag": r["player_tag"],
            "stars": r.get("best_attack_stars"), "destruction": r.get("best_attack_destruction"),
            "duration": r.get("best_attack_duration"), "opponent": r.get("best_attack_opponent"),
            "war_end_time": r.get("war_end_time"), "war_type": r.get("war_type"),
        }
        if scope == "all":
            out["clan_name"] = r.get("clan_name")
        return out

    def _fmt_defense(r):
        if not r:
            return None
        out = {
            "player_name": r["player_name"], "player_tag": r["player_tag"],
            "stars": r.get("best_defense_stars"), "destruction": r.get("best_defense_destruction"),
            "attacker": r.get("best_defense_attacker"),
            "war_end_time": r.get("war_end_time"), "war_type": r.get("war_type"),
        }
        if scope == "all":
            out["clan_name"] = r.get("clan_name")
        return out

    now_iso = datetime.utcnow().isoformat()
    if cutoff:
        period_start = cutoff.isoformat()
    else:
        parsed_dates = [_parse_coc_dt(r["war_end_time"]) for r in all_rows if r.get("war_end_time")]
        parsed_dates = [d for d in parsed_dates if d]
        period_start = min(parsed_dates).isoformat() if parsed_dates else None

    return {
        "period": period,
        "period_start": period_start,
        "period_end": now_iso,
        "total_wars_tracked": len(set(r["war_end_time"] for r in all_rows)),
        "most_stars": most_stars,
        "weakest": weakest,
        "most_skips": most_skips,
        "war_highlights": war_highlights,
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
    cutoff = _period_cutoff(period)
    # Phân trang thủ công — xem lý do ở _fetch_all trong war_activity phía
    # trên (Supabase/PostgREST mặc định cắt ở 1000 dòng/lượt gọi).
    all_rows: list = []
    start = 0
    page_size = 1000
    while True:
        q = sb.table("donation_snapshot_log").select("player_tag,player_name,donations,snapshot_at").eq("clan_id", clan_id)
        if cutoff:
            q = q.gte("snapshot_at", cutoff.isoformat())
        batch = (q.range(start, start + page_size - 1).execute()).data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size

    per_player: dict[str, dict] = {}
    for r in all_rows:
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
