"""
Sự kiện trao thưởng — tự tính bảng xếp hạng dựa trên dữ liệu war thật từ CoC API.

Quy tắc tham gia:
  - Chỉ thành viên đã đăng nhập web (có member_accounts) mới được tham gia sự kiện.
  - Leaderboard và điều kiện nhận thưởng chỉ xét những người đã tham gia (event_participants).
  - Admin có thể xem tất cả, nhưng không cần join.

Điều kiện (condition_type) hỗ trợ:
  - total_stars            : tổng số sao đạt được trong war
  - best_destruction       : % phá hủy cao nhất trong 1 đòn đánh
  - perfect_war            : đạt 3 sao ở MỌI lượt tấn công đã dùng
  - most_attacks_used      : đã dùng hết toàn bộ lượt tấn công
  - fewest_stars_conceded  : bị đối phương đánh mất ít sao nhất
  - top_donations          : donate cao nhất hiện tại
  - manual                 : admin tự chọn người thắng
"""
from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File, Header
from supabase_client import get_supabase
from auth import require_admin, verify_admin_token
from member_auth import verify_member_token
from services.coc_api import get_current_war, get_war_log, get_clan_members, get_coc_config
import uuid

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

# Chỉ Đồng thủ lĩnh trở lên mới được tạo sự kiện
CREATOR_ROLES = {"leader", "coLeader"}


async def resolve_creator(x_admin_token: str | None, x_member_token: str | None) -> dict:
    """Xác định ai đang thao tác: admin web, hoặc thành viên Đồng thủ lĩnh+.
    Trả về {is_admin, creator_name, creator_tag}. Raise lỗi nếu không đủ quyền."""
    if verify_admin_token(x_admin_token):
        return {"is_admin": True, "creator_name": "Admin", "creator_tag": None}

    member_tag = verify_member_token(x_member_token)
    if not member_tag:
        raise HTTPException(401, "Cần đăng nhập admin hoặc đăng nhập thành viên (Đồng thủ lĩnh trở lên) để thao tác")

    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    members = await get_clan_members(tag) if tag else []
    me = next((m for m in members if m["tag"] == member_tag), None)
    if not me or me.get("role") not in CREATOR_ROLES:
        raise HTTPException(403, "Chỉ Đồng thủ lĩnh trở lên mới được tạo/xoá sự kiện")

    sb = get_supabase()
    acc = sb.table("member_accounts").select("player_name").eq("player_tag", member_tag).execute()
    name = acc.data[0]["player_name"] if acc.data else me.get("name", "Thành viên")
    return {"is_admin": False, "creator_name": name, "creator_tag": member_tag}


# ─────────────────────────────────────────────────────────────────────────────
# Misc / config
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/conditions")
async def list_conditions():
    return [{"value": k, "label": v} for k, v in CONDITION_LABELS.items()]


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), _: bool = Depends(require_admin)):
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Chỉ chấp nhận ảnh JPEG, PNG, WEBP hoặc GIF")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "Ảnh tối đa 5MB")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    path = f"{uuid.uuid4().hex}.{ext}"
    sb = get_supabase()
    try:
        sb.storage.from_("event-rewards").upload(path, content, {"content-type": file.content_type})
    except Exception as e:
        raise HTTPException(500, f"Lỗi tải ảnh lên: {str(e)}")
    public_url = sb.storage.from_("event-rewards").get_public_url(path)
    return {"url": public_url}


# ─────────────────────────────────────────────────────────────────────────────
# Events CRUD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_events():
    sb = get_supabase()
    # clan_id từ query param (default=1)
    clan_id = 1  # TODO: lấy từ request khi có context
    res = sb.table("events").select("*").eq("clan_id", clan_id).order("created_at", desc=True).execute()
    events = res.data or []

    # Gắn participant_count vào từng event
    if events:
        ids = [e["id"] for e in events]
        pc_res = sb.table("event_participants").select("event_id").in_("event_id", ids).execute()
        counts: dict[int, int] = {}
        for row in (pc_res.data or []):
            counts[row["event_id"]] = counts.get(row["event_id"], 0) + 1
        for e in events:
            e["participant_count"] = counts.get(e["id"], 0)

    return events


@router.post("/")
async def create_event(
    request: Request,
    x_admin_token: str | None = Header(default=None),
    x_member_token: str | None = Header(default=None),
):
    creator = await resolve_creator(x_admin_token, x_member_token)
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
        "reward_coins": max(0, int(body.get("reward_coins") or 0)),
        "start_time": body.get("start_time") or None,
        "end_time": body.get("end_time") or None,
        "creator_name": creator["creator_name"],
        "creator_tag": creator["creator_tag"],
        "creator_zalo": (body.get("creator_zalo") or "").strip(),
        "status": "active" if creator["is_admin"] else "pending",
    }
    res = sb.table("events").insert(row).execute()
    return res.data[0]


@router.put("/{event_id}")
async def update_event(event_id: int, request: Request, _: bool = Depends(require_admin)):
    body = await request.json()
    allowed = ["title", "description", "reward_name", "reward_image_url",
               "reward_shop_link", "status", "top_n", "start_time", "end_time", "creator_zalo"]
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        raise HTTPException(400, "Không có gì để cập nhật")
    sb = get_supabase()
    res = sb.table("events").update(update).eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy sự kiện")
    return res.data[0]


@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    x_admin_token: str | None = Header(default=None),
    x_member_token: str | None = Header(default=None),
):
    sb = get_supabase()
    if verify_admin_token(x_admin_token):
        sb.table("events").delete().eq("id", event_id).execute()
        return {"ok": True, "deleted": True}

    member_tag = verify_member_token(x_member_token)
    if not member_tag:
        raise HTTPException(401, "Cần đăng nhập để yêu cầu xoá")
    res = sb.table("events").select("creator_tag").eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy sự kiện")
    if res.data[0]["creator_tag"] != member_tag:
        raise HTTPException(403, "Chỉ người tạo sự kiện hoặc admin mới được xoá")
    sb.table("events").update({"status": "pending_delete"}).eq("id", event_id).execute()
    return {"ok": True, "pending_delete": True}


# ─────────────────────────────────────────────────────────────────────────────
# Workflow: approve / reject / delete confirm
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{event_id}/approve")
async def approve_event(event_id: int, _: bool = Depends(require_admin)):
    sb = get_supabase()
    res = sb.table("events").update({"status": "active"}).eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy sự kiện")
    return res.data[0]


@router.post("/{event_id}/reject")
async def reject_event(event_id: int, _: bool = Depends(require_admin)):
    sb = get_supabase()
    sb.table("events").delete().eq("id", event_id).execute()
    return {"ok": True}


@router.post("/{event_id}/confirm-delete")
async def confirm_delete(event_id: int, _: bool = Depends(require_admin)):
    sb = get_supabase()
    sb.table("events").delete().eq("id", event_id).execute()
    return {"ok": True}


@router.post("/{event_id}/cancel-delete")
async def cancel_delete_request(event_id: int, _: bool = Depends(require_admin)):
    sb = get_supabase()
    res = sb.table("events").update({"status": "active"}).eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy sự kiện")
    return res.data[0]


# ─────────────────────────────────────────────────────────────────────────────
# Tham gia sự kiện (JOIN / LEAVE / LIST)
# Chỉ thành viên đã đăng nhập web (member_accounts) mới được tham gia
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{event_id}/join")
async def join_event(
    event_id: int,
    x_member_token: str | None = Header(default=None),
):
    """Thành viên đã đăng nhập web đăng ký tham gia sự kiện."""
    member_tag = verify_member_token(x_member_token)
    if not member_tag:
        raise HTTPException(401, "Cần đăng nhập thành viên để tham gia sự kiện")

    sb = get_supabase()

    # Kiểm tra tài khoản thành viên tồn tại
    acc = sb.table("member_accounts").select("player_name").eq("player_tag", member_tag).execute()
    if not acc.data:
        raise HTTPException(403, "Tài khoản thành viên không tồn tại — hãy đăng ký trước")

    # Kiểm tra sự kiện đang active
    ev = sb.table("events").select("status, title").eq("id", event_id).execute()
    if not ev.data:
        raise HTTPException(404, "Không tìm thấy sự kiện")
    if ev.data[0]["status"] not in ("active", "pending_delete"):
        raise HTTPException(400, "Sự kiện này không còn mở để tham gia")

    player_name = acc.data[0]["player_name"]
    try:
        sb.table("event_participants").upsert(
            {"event_id": event_id, "player_tag": member_tag, "player_name": player_name},
            on_conflict="event_id,player_tag",
        ).execute()
    except Exception as e:
        raise HTTPException(500, f"Lỗi đăng ký tham gia: {str(e)}")

    return {"ok": True, "player_tag": member_tag, "player_name": player_name}


@router.delete("/{event_id}/leave")
async def leave_event(
    event_id: int,
    x_member_token: str | None = Header(default=None),
):
    """Thành viên rút khỏi sự kiện."""
    member_tag = verify_member_token(x_member_token)
    if not member_tag:
        raise HTTPException(401, "Cần đăng nhập thành viên")

    sb = get_supabase()
    sb.table("event_participants").delete().eq("event_id", event_id).eq("player_tag", member_tag).execute()
    return {"ok": True}


@router.get("/{event_id}/participants")
async def get_participants(event_id: int):
    """Danh sách thành viên đã tham gia sự kiện."""
    sb = get_supabase()
    res = sb.table("event_participants").select("*").eq("event_id", event_id).order("joined_at").execute()
    return res.data or []


# ─────────────────────────────────────────────────────────────────────────────
# Leaderboard (chỉ xét thành viên đã tham gia)
# ─────────────────────────────────────────────────────────────────────────────

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
        best_against = member.get("bestOpponentAttack", {})
        stars_lost = best_against.get("stars", 0) if isinstance(best_against, dict) else 0
        return -float(stars_lost)
    return 0.0


def _fmt_metric(condition_type: str, score: float) -> str:
    if condition_type == "total_stars": return f"{int(score)} sao"
    if condition_type == "best_destruction": return f"{score:.1f}%"
    if condition_type == "perfect_war": return "War hoàn hảo"
    if condition_type == "most_attacks_used": return f"{int(score)} lượt đánh"
    if condition_type == "fewest_stars_conceded": return f"Mất {int(-score)} sao khi bị đánh"
    return str(score)


@router.get("/{event_id}/leaderboard")
async def get_leaderboard(event_id: int):
    sb = get_supabase()

    # Lấy thông tin sự kiện
    res = sb.table("events").select("*").eq("id", event_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy sự kiện")
    event = res.data
    condition_type = event["condition_type"]
    top_n = event.get("top_n", 3)

    # Lấy danh sách người đã tham gia
    part_res = sb.table("event_participants").select("player_tag, player_name").eq("event_id", event_id).execute()
    participants = part_res.data or []
    participant_tags = {p["player_tag"] for p in participants}

    if condition_type == "manual":
        return {
            "event": event,
            "leaderboard": [],
            "note": "Sự kiện thủ công — admin tự thêm người nhận thưởng",
            "participant_count": len(participants),
        }

    if not participants:
        return {
            "event": event,
            "leaderboard": [],
            "note": "Chưa có thành viên nào đăng ký tham gia sự kiện này.",
            "participant_count": 0,
        }

    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag:
        raise HTTPException(400, "Chưa cấu hình clan tag")

    # Điều kiện donate: lấy từ danh sách clan members
    if condition_type == "top_donations":
        members = await get_clan_members(tag)
        # Chỉ giữ người đã tham gia sự kiện
        members = [m for m in members if m["tag"] in participant_tags]
        ranked = sorted(members, key=lambda m: m.get("donations", 0), reverse=True)
        leaderboard = [
            {
                "player_tag": m["tag"],
                "player_name": m["name"],
                "rank": i + 1,
                "metric_value": f"{m.get('donations', 0)} donate",
            }
            for i, m in enumerate(ranked[:top_n])
        ]
        return {"event": event, "leaderboard": leaderboard, "participant_count": len(participants)}

    # Điều kiện war — lấy war hiện tại hoặc gần nhất
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

    war_members = war.get("clan", {}).get("members", [])

    # Chỉ xét thành viên đã tham gia sự kiện
    war_members = [m for m in war_members if m["tag"] in participant_tags]

    if not war_members:
        return {
            "event": event,
            "leaderboard": [],
            "note": "Không có người tham gia nào xuất hiện trong war này.",
            "participant_count": len(participants),
        }

    scored = [
        {"member": m, "score": _compute_war_metric(m, condition_type)}
        for m in war_members
    ]
    if condition_type == "perfect_war":
        scored = [s for s in scored if s["score"] > 0]
    scored.sort(key=lambda s: s["score"], reverse=True)

    leaderboard = [
        {
            "player_tag": s["member"]["tag"],
            "player_name": s["member"]["name"],
            "rank": i + 1,
            "metric_value": _fmt_metric(condition_type, s["score"]),
        }
        for i, s in enumerate(scored[:top_n])
    ]
    return {
        "event": event,
        "leaderboard": leaderboard,
        "war_end_time": war.get("endTime"),
        "participant_count": len(participants),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Claims (trao thưởng)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{event_id}/claim")
async def upsert_claim(event_id: int, request: Request, _: bool = Depends(require_admin)):
    """Lưu danh sách top từ leaderboard vào event_claims."""
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

    # Tự động chuyển coins từ người tổ chức sang người thắng khi xác nhận trao thưởng
    if claimed:
        try:
            ev = sb.table("events").select("creator_tag, reward_coins").eq("id", event_id).single().execute()
            claim_data = res.data[0]
            winner_tag = claim_data.get("player_tag")
            if (ev.data and ev.data.get("reward_coins", 0) > 0
                    and ev.data.get("creator_tag") and winner_tag
                    and ev.data["creator_tag"] != winner_tag):
                coins = ev.data["reward_coins"]
                creator_tag = ev.data["creator_tag"]
                # Trừ coins của người tổ chức
                creator_acc = sb.table("member_accounts").select("coins").eq("player_tag", creator_tag).execute()
                if creator_acc.data:
                    cur = creator_acc.data[0].get("coins") or 0
                    sb.table("member_accounts").update({"coins": max(0, cur - coins)}).eq("player_tag", creator_tag).execute()
                # Cộng coins cho người thắng
                winner_acc = sb.table("member_accounts").select("coins").eq("player_tag", winner_tag).execute()
                if winner_acc.data:
                    cur = winner_acc.data[0].get("coins") or 0
                    sb.table("member_accounts").update({"coins": cur + coins}).eq("player_tag", winner_tag).execute()
        except Exception:
            pass  # Lỗi chuyển coins không nên block việc mark claimed

    return res.data[0]
