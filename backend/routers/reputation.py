"""API cho hệ thống Danh vọng — xem services/reputation.py để biết công thức
tính điểm và tier."""
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from supabase_client import get_supabase
from clan_context import get_clan_id, get_tag_by_clan_id
from auth import require_admin
from services.coc_api import get_clan_members
from services.reputation import get_all_totals, get_tier, add_reputation, REASON_LABELS, get_points, DEFAULT_POINTS, SETTINGS_KEY_PREFIX

router = APIRouter()


@router.get("/points-config")
async def get_points_config(request: Request):
    """Bảng công thức Danh vọng HIỆN HÀNH (đã áp dụng override nếu admin có
    chỉnh) — dùng để hiện trong Cài đặt cho admin xem/sửa."""
    sb = get_supabase()
    current = get_points(sb)
    return [
        {"reason": k, "label": REASON_LABELS.get(k, k), "points": current.get(k, v), "default": v}
        for k, v in DEFAULT_POINTS.items()
    ]


@router.put("/points-config")
async def update_points_config(request: Request, _: bool = Depends(require_admin)):
    """Admin chỉnh công thức Danh vọng — body: {reason: points, ...}. Chỉ
    ghi đè các reason hợp lệ (có trong DEFAULT_POINTS), bỏ qua phần lạ."""
    body = await request.json()
    sb = get_supabase()
    saved = {}
    for reason, pts in body.items():
        if reason not in DEFAULT_POINTS:
            continue
        try:
            pts = int(pts)
        except (ValueError, TypeError):
            continue
        key = f"{SETTINGS_KEY_PREFIX}{reason}"
        sb.table("settings").upsert({"key": key, "value": str(pts)}, on_conflict="key").execute()
        saved[reason] = pts
    return {"ok": True, "saved": saved}


@router.get("/leaderboard")
async def get_leaderboard(request: Request, limit: int = Query(50, le=200)):
    """Xếp hạng Danh vọng — gồm cả người hiện KHÔNG có điểm nào (hiện 0đ,
    Tier Đồng) để thấy đủ toàn bộ thành viên hiện tại."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    tag = await get_tag_by_clan_id(clan_id)
    members = await get_clan_members(tag, clan_id=clan_id) if tag else []
    totals = get_all_totals(sb, clan_id)

    rows = []
    for m in members:
        entry = totals.get(m["tag"])
        total = entry["total"] if entry else 0
        rows.append({
            "player_tag": m["tag"], "player_name": m["name"],
            "total": total, "tier": get_tier(total),
        })
    rows.sort(key=lambda r: -r["total"])
    return rows[:limit]


@router.get("/member/{player_tag}")
async def get_member_reputation(player_tag: str, request: Request):
    """Tổng Danh vọng + phân tích theo lý do + lịch sử gần đây của 1 người —
    dùng cho trang Thành viên (bấm vào xem chi tiết)."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    res = (sb.table("member_reputation_log").select("*").eq("clan_id", clan_id)
           .eq("player_tag", player_tag).order("created_at", desc=True).execute())
    rows = res.data or []
    total = sum(r["points"] for r in rows)
    by_reason: dict = {}
    for r in rows:
        e = by_reason.setdefault(r["reason"], {"reason": r["reason"], "label": REASON_LABELS.get(r["reason"], r["reason"]), "count": 0, "total": 0})
        e["count"] += 1
        e["total"] += r["points"]
    return {
        "player_tag": player_tag,
        "total": total,
        "tier": get_tier(total),
        "breakdown": sorted(by_reason.values(), key=lambda e: -abs(e["total"])),
        "history": rows[:30],
    }


@router.post("/adjust")
async def adjust_reputation(request: Request, _: bool = Depends(require_admin)):
    """Admin điều chỉnh Danh vọng thủ công (vd trừ điểm khi vi phạm nội quy,
    hoặc cộng bù khi hệ thống tính thiếu)."""
    clan_id = get_clan_id(request)
    body = await request.json()
    player_tag = (body.get("player_tag") or "").strip()
    player_name = (body.get("player_name") or "").strip()
    points = body.get("points")
    note = (body.get("note") or "").strip() or None
    if not player_tag or not player_name or points is None:
        raise HTTPException(400, "Thiếu player_tag/player_name/points")
    try:
        points = int(points)
    except (ValueError, TypeError):
        raise HTTPException(400, "points phải là số nguyên")
    if points == 0:
        raise HTTPException(400, "points phải khác 0")

    sb = get_supabase()
    import datetime
    ref_key = f"manual-{datetime.datetime.utcnow().isoformat()}"  # luôn ghi mới, không chống trùng
    add_reputation(sb, clan_id, player_tag, player_name, "manual", ref_key=ref_key, note=note, points=points)
    return {"ok": True}
