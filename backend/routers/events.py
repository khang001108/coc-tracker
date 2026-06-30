"""
Sự kiện trao thưởng — tự tính bảng xếp hạng dựa trên dữ liệu war thật từ CoC API.

Điều kiện (condition_type) hỗ trợ, dựa trên những gì CoC API thực sự cung cấp
qua endpoint currentwar / warlog cho từng thành viên trong 1 trận war:
  - total_stars            : tổng số sao đạt được trong war (tối đa 6 nếu 2 lượt đánh)
  - best_destruction       : % phá hủy cao nhất trong 1 đòn đánh
  - perfect_war            : đạt 3 sao ở MỌI lượt tấn công đã dùng
  - most_attacks_used      : đã dùng hết toàn bộ lượt tấn công được phép
  - fewest_stars_conceded  : bị đối phương đánh mất ít sao nhất khi phòng thủ (phòng thủ tốt)
  - top_donations          : donate cao nhất hiện tại (dùng cho sự kiện không phải war)
  - manual                 : admin tự chọn người thắng, không tính tự động

CoC API KHÔNG cung cấp: thời gian mỗi lượt đánh, donate theo khoảng thời gian tùy chọn
(chỉ có tổng hiện tại), lịch sử chi tiết quá khứ ngoài 20 war log gần nhất.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from supabase_client import get_supabase
from auth import require_admin
from services.coc_api import get_current_war, get_war_log, get_clan_members, get_coc_config

router = APIRouter()

CONDITION_LABELS = {
    "total_stars": "Tổng số sao trong war",
    "best_destruction": "% phá hủy cao nhất (1 đòn)",
    "perfect_war": "Toàn bộ lượt đánh đều 3 sao",
    "most_attacks_used": "Dùng hết lượt tấn công",
    "fewest_stars_conceded": "Phòng thủ tốt nhất (mất ít sao nhất)",
    "top_donations": "Donate cao nhất hiện tại",
    "manual": "Admin tự chọn thủ công",
}


@router.get("/conditions")
async def list_conditions():
    """Cho frontend hiển thị danh sách điều kiện khả dụng khi tạo sự kiện."""
    return [{"value": k, "label": v} for k, v in CONDITION_LABELS.items()]


@router.get("/")
async def list_events():
    sb = get_supabase()
    res = sb.table("events").select("*").order("created_at", desc=True).execute()
    return res.data


@router.post("/")
async def create_event(request: Request, _: bool = Depends(require_admin)):
    body = await request.json()
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(400, "Cần tên sự kiện")
    condition_type = body.get("condition_type", "total_stars")
    if condition_type not in CONDITION_LABELS:
        raise HTTPException(400, "Điều kiện không hợp lệ")
    sb = get_supabase()
    row = {
        "title": title,
        "description": body.get("description", ""),
        "event_type": body.get("event_type", "war"),
        "condition_type": condition_type,
        "top_n": int(body.get("top_n", 3)),
        "reward_name": body.get("reward_name", ""),
        "reward_image_url": body.get("reward_image_url", ""),
        "reward_shop_link": body.get("reward_shop_link", ""),
        "status": "active",
    }
    res = sb.table("events").insert(row).execute()
    return res.data[0]


@router.put("/{event_id}")
async def update_event(event_id: int, request: Request, _: bool = Depends(require_admin)):
    body = await request.json()
    allowed = ["title", "description", "reward_name", "reward_image_url",
               "reward_shop_link", "status", "top_n"]
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        raise HTTPException(400, "Không có gì để cập nhật")
    sb = get_supabase()
    res = sb.table("events").update(update).eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy sự kiện")
    return res.data[0]


@router.delete("/{event_id}")
async def delete_event(event_id: int, _: bool = Depends(require_admin)):
    sb = get_supabase()
    sb.table("events").delete().eq("id", event_id).execute()
    return {"ok": True}


def _compute_war_metric(member: dict, condition_type: str) -> float:
    attacks = member.get("attacks", [])
    if condition_type == "total_stars":
        return float(member.get("stars", 0))
    if condition_type == "best_destruction":
        return max([a.get("destructionPercentage", 0) for a in attacks], default=0.0)
    if condition_type == "perfect_war":
        if not attacks:
            return 0.0
        return 1.0 if all(a.get("stars", 0) == 3 for a in attacks) else 0.0
    if condition_type == "most_attacks_used":
        return float(len(attacks))
    if condition_type == "fewest_stars_conceded":
        opp_attacks = member.get("opponentAttacks", 0)
        best_against = member.get("bestOpponentAttack", {})
        stars_lost = best_against.get("stars", 0) if isinstance(best_against, dict) else 0
        # điểm càng cao = phòng thủ càng tốt -> đảo dấu số sao bị mất
        return -float(stars_lost)
    return 0.0


@router.get("/{event_id}/leaderboard")
async def get_leaderboard(event_id: int):
    sb = get_supabase()
    res = sb.table("events").select("*").eq("id", event_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy sự kiện")
    event = res.data
    condition_type = event["condition_type"]
    top_n = event.get("top_n", 3)

    if condition_type == "manual":
        return {"event": event, "leaderboard": [], "note": "Sự kiện thủ công — admin tự thêm người nhận thưởng"}

    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag:
        raise HTTPException(400, "Chưa cấu hình clan tag")

    if condition_type == "top_donations":
        members = await get_clan_members(tag)
        ranked = sorted(members, key=lambda m: m.get("donations", 0), reverse=True)
        leaderboard = [
            {"player_tag": m["tag"], "player_name": m["name"], "rank": i + 1,
             "metric_value": f"{m.get('donations', 0)} donate"}
            for i, m in enumerate(ranked[:top_n])
        ]
        return {"event": event, "leaderboard": leaderboard}

    # Các điều kiện còn lại cần dữ liệu war — lấy war hiện tại nếu đang/đã kết thúc,
    # nếu không thì lấy trận gần nhất trong war log
    war = None
    try:
        cur = await get_current_war(tag)
        if cur.get("state") in ("inWar", "warEnded"):
            war = cur
    except Exception:
        pass
    if war is None:
        log = await get_war_log(tag)
        war = log[0] if log else None
    if war is None:
        raise HTTPException(404, "Không có dữ liệu war để tính điểm")

    members = war.get("clan", {}).get("members", [])
    scored = [
        {"member": m, "score": _compute_war_metric(m, condition_type)}
        for m in members
    ]
    scored = [s for s in scored if s["score"] > 0] if condition_type == "perfect_war" else scored
    scored.sort(key=lambda s: s["score"], reverse=True)

    def fmt_metric(condition_type: str, score: float) -> str:
        if condition_type == "total_stars": return f"{int(score)} sao"
        if condition_type == "best_destruction": return f"{score:.1f}%"
        if condition_type == "perfect_war": return "War hoàn hảo"
        if condition_type == "most_attacks_used": return f"{int(score)} lượt đánh"
        if condition_type == "fewest_stars_conceded": return f"Mất {int(-score)} sao khi bị đánh"
        return str(score)

    leaderboard = [
        {
            "player_tag": s["member"]["tag"],
            "player_name": s["member"]["name"],
            "rank": i + 1,
            "metric_value": fmt_metric(condition_type, s["score"]),
        }
        for i, s in enumerate(scored[:top_n])
    ]
    return {"event": event, "leaderboard": leaderboard, "war_end_time": war.get("endTime")}


@router.post("/{event_id}/claim")
async def upsert_claim(event_id: int, request: Request, _: bool = Depends(require_admin)):
    """Lưu danh sách top từ leaderboard vào event_claims (gọi sau khi xem leaderboard, trước khi đánh dấu đã trao)."""
    body = await request.json()
    entries = body.get("entries", [])
    sb = get_supabase()
    rows = [{
        "event_id": event_id,
        "player_tag": e["player_tag"],
        "player_name": e["player_name"],
        "rank": e.get("rank"),
        "metric_value": e.get("metric_value", ""),
    } for e in entries]
    if rows:
        sb.table("event_claims").upsert(rows, on_conflict="event_id,player_tag").execute()
    res = sb.table("event_claims").select("*").eq("event_id", event_id).order("rank").execute()
    return res.data


@router.get("/{event_id}/claims")
async def get_claims(event_id: int):
    sb = get_supabase()
    res = sb.table("event_claims").select("*").eq("event_id", event_id).order("rank").execute()
    return res.data


@router.post("/{event_id}/claims/{claim_id}/mark")
async def mark_claimed(event_id: int, claim_id: int, request: Request, _: bool = Depends(require_admin)):
    body = await request.json()
    claimed = bool(body.get("claimed", True))
    sb = get_supabase()
    import datetime
    update = {"claimed": claimed, "claimed_at": datetime.datetime.utcnow().isoformat() if claimed else None}
    res = sb.table("event_claims").update(update).eq("id", claim_id).eq("event_id", event_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy")
    return res.data[0]
