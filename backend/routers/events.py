"""
Sự kiện trao thưởng — tự tính bảng xếp hạng dựa trên dữ liệu war thật từ CoC API.

Quy tắc tham gia:
  - Chỉ thành viên đã đăng nhập web (có member_accounts) mới được tham gia sự kiện.
  - Leaderboard và điều kiện nhận thưởng chỉ xét những người đã tham gia (event_participants).
  - Admin có thể xem tất cả, nhưng không cần join.

Phạm vi (visibility):
  - 'private' (mặc định): chỉ thành viên của CLAN TẠO sự kiện được thấy/tham gia/nhận thưởng.
  - 'public' : liên clan — chọn allowed_clan_ids = 1 hoặc nhiều clan (rỗng/NULL = TẤT CẢ clan)
               cùng được thấy, tham gia và cùng nhận thưởng chung 1 bảng xếp hạng.

Điều kiện (condition_type) hỗ trợ:
  - total_stars            : tổng số sao đạt được trong war
  - best_destruction       : % phá hủy cao nhất trong 1 đòn đánh
  - perfect_war            : đạt 3 sao ở MỌI lượt tấn công đã dùng
  - most_attacks_used      : đã dùng hết toàn bộ lượt tấn công
  - fewest_stars_conceded  : bị đối phương đánh mất ít sao nhất
  - top_donations          : donate cao nhất hiện tại
  - manual                 : admin tự chọn người thắng
"""
from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File, Header, BackgroundTasks
from supabase_client import get_supabase
from clan_context import get_clan_id, get_tag_by_clan_id
from auth import require_admin, verify_admin_token
from member_auth import verify_member_token
from services.coc_api import get_current_war, get_war_log, get_clan_members, get_cwl_group, get_cwl_war, get_raid_seasons, get_cwl_season_rounds
from services.push_service import send_push_to_clan
import uuid

router = APIRouter()

CONDITION_LABELS = {
    "total_stars": "Tổng số sao trong war",
    "best_destruction": "% phá hủy cao nhất (1 đòn)",
    "perfect_war": "Toàn bộ lượt đánh đều 3 sao",
    "most_attacks_used": "Dùng hết lượt tấn công",
    "fewest_stars_conceded": "Phòng thủ tốt nhất (mất ít sao nhất)",
    "top_donations": "Donate cao nhất hiện tại",
    "capital_most_loot": "Clan Capital: Gold cướp được nhiều nhất",
    "capital_most_attacks": "Clan Capital: Số lượt tấn công nhiều nhất",
    "donate_total": "Donate: Tổng donate từ lúc tham gia sự kiện",
    "manual": "Admin tự chọn thủ công",
}

# Chỉ Đồng thủ lĩnh trở lên mới được tạo sự kiện
CREATOR_ROLES = {"leader", "coLeader"}


async def resolve_creator(clan_id: int, x_admin_token: str | None, x_member_token: str | None) -> dict:
    """Xác định ai đang thao tác: admin web, hoặc thành viên Đồng thủ lĩnh+.
    Trả về {is_admin, creator_name, creator_tag}. Raise lỗi nếu không đủ quyền."""
    if verify_admin_token(x_admin_token):
        return {"is_admin": True, "creator_name": "Admin", "creator_tag": None}

    member_tag = verify_member_token(x_member_token)
    if not member_tag:
        raise HTTPException(401, "Cần đăng nhập admin hoặc đăng nhập thành viên (Đồng thủ lĩnh trở lên) để thao tác")

    tag = await get_tag_by_clan_id(clan_id)
    members = await get_clan_members(tag, clan_id=clan_id) if tag else []
    me = next((m for m in members if m["tag"] == member_tag), None)
    if not me or me.get("role") not in CREATOR_ROLES:
        raise HTTPException(403, "Chỉ Đồng thủ lĩnh trở lên mới được tạo/xoá sự kiện")

    sb = get_supabase()
    acc = sb.table("member_accounts").select("player_name").eq("player_tag", member_tag).execute()
    name = acc.data[0]["player_name"] if acc.data else me.get("name", "Thành viên")
    return {"is_admin": False, "creator_name": name, "creator_tag": member_tag}


async def _notify_event(event: dict):
    """Gửi push (ngoài app) báo sự kiện mới/được duyệt cho đúng (các) clan liên quan."""
    sb = get_supabase()
    title = f"🎉 Sự kiện mới: {event.get('title','')}"
    body = event.get("reward_name") or "Xem chi tiết trong app"
    if event.get("visibility") == "public":
        allowed = event.get("allowed_clan_ids")
        if allowed:
            clan_ids = allowed
        else:
            res = sb.table("clans").select("id").execute()
            clan_ids = [c["id"] for c in (res.data or [])] or [event.get("clan_id", 1)]
    else:
        clan_ids = [event.get("clan_id", 1)]
    for cid in clan_ids:
        try:
            await send_push_to_clan(cid, title, body, "/events", "event")
        except Exception:
            pass


def _member_clan_id(sb, player_tag: str | None) -> int | None:
    if not player_tag:
        return None
    res = sb.table("member_accounts").select("clan_id").eq("player_tag", player_tag).execute()
    if res.data:
        return res.data[0].get("clan_id") or 1
    return None


def _event_visible_to(event: dict, clan_id: int) -> bool:
    if event.get("clan_id") == clan_id:
        return True
    if event.get("visibility") == "public":
        allowed = event.get("allowed_clan_ids")
        return not allowed or clan_id in allowed
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Misc / config
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{event_id}/report")
async def report_event(event_id: int, request: Request, x_member_token: str | None = Header(default=None)):
    """Thành viên tố cáo 1 sự kiện sai trái/lừa đảo — admin xem trong Cài đặt."""
    member_tag = verify_member_token(x_member_token)
    if not member_tag:
        raise HTTPException(401, "Cần đăng nhập thành viên để báo cáo")
    body = await request.json()
    reason = (body.get("reason") or "").strip()
    if not reason:
        raise HTTPException(400, "Cần nhập lý do báo cáo")
    sb = get_supabase()
    acc = sb.table("member_accounts").select("player_name").eq("player_tag", member_tag).execute()
    if not acc.data:
        raise HTTPException(403, "Tài khoản không tồn tại")
    ev = sb.table("events").select("title").eq("id", event_id).execute()
    if not ev.data:
        raise HTTPException(404, "Không tìm thấy sự kiện")
    try:
        sb.table("event_reports").insert({
            "event_id": event_id, "event_title": ev.data[0]["title"],
            "reporter_tag": member_tag, "reporter_name": acc.data[0]["player_name"],
            "reason": reason,
        }).execute()
    except Exception as e:
        raise HTTPException(500, f"Chưa chạy migration PART 9: {str(e)}")
    return {"ok": True}


@router.get("/reports/all")
async def list_reports(_: bool = Depends(require_admin)):
    sb = get_supabase()
    try:
        res = sb.table("event_reports").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception:
        return []


@router.post("/reports/{report_id}/resolve")
async def resolve_report(report_id: int, _: bool = Depends(require_admin)):
    sb = get_supabase()
    sb.table("event_reports").update({"status": "resolved"}).eq("id", report_id).execute()
    return {"ok": True}


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
async def list_events(request: Request):
    sb = get_supabase()
    clan_id = get_clan_id(request)

    own = sb.table("events").select("*").eq("clan_id", clan_id).order("created_at", desc=True).execute().data or []
    try:
        public_others = sb.table("events").select("*") \
            .eq("visibility", "public").neq("clan_id", clan_id) \
            .order("created_at", desc=True).execute().data or []
    except Exception:
        # Cột visibility chưa tồn tại (chưa chạy migration) — bỏ qua liên clan
        public_others = []

    public_others = [e for e in public_others if not e.get("allowed_clan_ids") or clan_id in e["allowed_clan_ids"]]

    seen = {e["id"] for e in own}
    events = own + [e for e in public_others if e["id"] not in seen]
    events.sort(key=lambda e: e.get("created_at") or "", reverse=True)

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
    background_tasks: BackgroundTasks,
    x_admin_token: str | None = Header(default=None),
    x_member_token: str | None = Header(default=None),
):
    clan_id = get_clan_id(request)
    creator = await resolve_creator(clan_id, x_admin_token, x_member_token)
    body = await request.json()
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(400, "Cần tên sự kiện")
    condition_type = body.get("condition_type", "total_stars")
    if condition_type not in CONDITION_LABELS:
        raise HTTPException(400, "Điều kiện không hợp lệ")

    visibility = body.get("visibility", "private")
    if visibility not in ("private", "public"):
        raise HTTPException(400, "visibility không hợp lệ")
    allowed_clan_ids = body.get("allowed_clan_ids") or None
    if visibility == "private":
        allowed_clan_ids = None
    elif allowed_clan_ids is not None:
        try:
            allowed_clan_ids = [int(x) for x in allowed_clan_ids] or None
        except (ValueError, TypeError):
            raise HTTPException(400, "allowed_clan_ids không hợp lệ")

    sb = get_supabase()
    row = {
        "clan_id": clan_id,
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
    try:
        res = sb.table("events").insert({**row, "visibility": visibility, "allowed_clan_ids": allowed_clan_ids}).execute()
    except Exception:
        # Cột visibility/allowed_clan_ids chưa tồn tại (chưa chạy migration)
        res = sb.table("events").insert(row).execute()

    created = res.data[0]
    if created.get("status") == "active":
        background_tasks.add_task(_notify_event, created)
    return created


@router.put("/{event_id}")
async def update_event(
    event_id: int,
    request: Request,
    x_admin_token: str | None = Header(default=None),
    x_member_token: str | None = Header(default=None),
):
    sb = get_supabase()
    is_admin = verify_admin_token(x_admin_token)
    if not is_admin:
        member_tag = verify_member_token(x_member_token)
        if not member_tag:
            raise HTTPException(401, "Cần đăng nhập để sửa sự kiện")
        existing = sb.table("events").select("creator_tag").eq("id", event_id).execute()
        if not existing.data:
            raise HTTPException(404, "Không tìm thấy sự kiện")
        if existing.data[0]["creator_tag"] != member_tag:
            raise HTTPException(403, "Chỉ người tạo sự kiện hoặc admin mới được sửa")

    body = await request.json()
    allowed = ["title", "description", "reward_name", "reward_image_url",
               "reward_shop_link", "reward_coins", "top_n", "start_time", "end_time", "creator_zalo",
               "condition_type"]
    # Chỉ admin mới được đổi trạng thái / phạm vi liên clan (tránh người tạo
    # tự duyệt sự kiện của chính mình hoặc mở rộng sang clan khác tuỳ ý).
    if is_admin:
        allowed += ["status", "visibility", "allowed_clan_ids"]
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        raise HTTPException(400, "Không có gì để cập nhật")
    try:
        res = sb.table("events").update(update).eq("id", event_id).execute()
    except Exception:
        update.pop("visibility", None)
        update.pop("allowed_clan_ids", None)
        update.pop("reward_coins", None)
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
async def approve_event(event_id: int, background_tasks: BackgroundTasks, _: bool = Depends(require_admin)):
    sb = get_supabase()
    res = sb.table("events").update({"status": "active"}).eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy sự kiện")
    background_tasks.add_task(_notify_event, res.data[0])
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
# Chỉ thành viên đã đăng nhập web (member_accounts) mới được tham gia.
# Sự kiện 'private' chỉ nhận thành viên đúng clan đã tạo; 'public' nhận thành
# viên của các clan trong allowed_clan_ids (rỗng = tất cả clan).
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
    acc = sb.table("member_accounts").select("player_name,clan_id").eq("player_tag", member_tag).execute()
    if not acc.data:
        raise HTTPException(403, "Tài khoản thành viên không tồn tại — hãy đăng ký trước")
    member_clan_id = acc.data[0].get("clan_id") or 1

    # Kiểm tra sự kiện đang active + có quyền tham gia (đúng clan / public cho phép)
    ev = sb.table("events").select("*").eq("id", event_id).execute()
    if not ev.data:
        raise HTTPException(404, "Không tìm thấy sự kiện")
    event = ev.data[0]
    if event["status"] not in ("active", "pending_delete"):
        raise HTTPException(400, "Sự kiện này không còn mở để tham gia")
    if not _event_visible_to(event, member_clan_id):
        raise HTTPException(403, "Sự kiện này chỉ dành cho thành viên clan khác — bạn không đủ điều kiện tham gia")

    player_name = acc.data[0]["player_name"]
    participant_row = {"event_id": event_id, "player_tag": member_tag, "player_name": player_name}

    # Sự kiện Donate: ghi lại số donate HIỆN TẠI làm mốc — điểm sự kiện sau
    # này = donate lúc đó - mốc này (chỉ tính donate PHÁT SINH sau khi join).
    if event.get("event_type") == "donate":
        try:
            tag_for_lookup = await get_tag_by_clan_id(member_clan_id)
            members = await get_clan_members(tag_for_lookup, clan_id=member_clan_id)
            me = next((m for m in members if m["tag"] == member_tag), None)
            participant_row["baseline_donations"] = me.get("donations", 0) if me else 0
        except Exception:
            participant_row["baseline_donations"] = 0

    try:
        sb.table("event_participants").upsert(
            {**participant_row, "clan_id": member_clan_id},
            on_conflict="event_id,player_tag",
        ).execute()
    except Exception as e:
        try:
            sb.table("event_participants").upsert(participant_row, on_conflict="event_id,player_tag").execute()
        except Exception as e2:
            raise HTTPException(500, f"Lỗi đăng ký tham gia: {str(e2)}")

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
# Với sự kiện public liên clan, participants có thể thuộc nhiều clan khác nhau
# — leaderboard sẽ gộp dữ liệu war/donate từ TỪNG clan tương ứng của họ.
# ─────────────────────────────────────────────────────────────────────────────

def _compute_war_metric(member: dict, condition_type: str) -> float:
    attacks = member.get("attacks", [])
    if condition_type == "total_stars":
        # CoC API không có field "stars" tổng sẵn trên member — phải cộng
        # dồn từ từng đòn đánh (đây là lỗi cũ khiến điều kiện này luôn ra 0).
        return float(sum(a.get("stars", 0) for a in attacks))
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


async def _cwl_current_war_members(tag: str, clan_id: int) -> list:
    """Tổng hợp thành viên CWL cho MỌI vòng đã đánh trong mùa hiện tại (không
    chỉ vòng mới nhất) — mỗi người có 'attacks' gộp từ tất cả các ngày, để
    điều kiện sự kiện (tổng sao, % phá huỷ...) tính đúng cho cả mùa CWL 7
    ngày thay vì chỉ 1 ngày (đây là lỗi trước đây khiến sao đã đạt ở ngày cũ
    không được cập nhật vào sự kiện)."""
    try:
        rounds = await get_cwl_season_rounds(tag, clan_id=clan_id)
    except Exception:
        return []
    merged: dict[str, dict] = {}
    for w in rounds:
        for m in w.get("clan", {}).get("members", []):
            entry = merged.setdefault(m.get("tag"), {"tag": m.get("tag"), "name": m.get("name", "?"), "attacks": []})
            entry["name"] = m.get("name", "?")
            entry["attacks"].extend(m.get("attacks", []))
    return list(merged.values())


async def _war_members_for_clan(clan_id: int, event_type: str = "war") -> list:
    """Lấy danh sách member trong war hiện tại/gần nhất của 1 clan cụ thể.
    event_type == 'cwl' → ưu tiên tìm trong CWL trước (trước đây chỉ tìm ở
    war thường nên sự kiện loại CWL luôn báo nhầm 'không ai tham gia' dù
    thành viên đang đánh CWL thật)."""
    tag = await get_tag_by_clan_id(clan_id)
    if not tag:
        return []

    if event_type == "cwl":
        members = await _cwl_current_war_members(tag, clan_id)
        if members:
            return members
        # Không tìm được vòng CWL nào — fallback thử war thường (phòng khi
        # admin gắn nhầm loại sự kiện) trước khi chịu thua.

    war = None
    try:
        cur = await get_current_war(tag, clan_id=clan_id)
        if cur.get("state") in ("inWar", "warEnded"):
            war = cur
    except Exception:
        pass
    if war is None:
        log = await get_war_log(tag, clan_id=clan_id)
        war = log[0] if log else None
    if war is None and event_type != "cwl":
        # Chưa thử CWL (vì event không khai là loại cwl) — thử luôn cho chắc,
        # vì war thường lẫn CWL đều hợp lệ để tính "top sao/perfect war".
        members = await _cwl_current_war_members(tag, clan_id)
        if members:
            return members
    if war is None:
        return []
    return war.get("clan", {}).get("members", [])


async def _donation_members_for_clan(clan_id: int) -> list:
    tag = await get_tag_by_clan_id(clan_id)
    if not tag:
        return []
    return await get_clan_members(tag, clan_id=clan_id)


async def _capital_members_for_clan(clan_id: int) -> list:
    """Thành viên + số liệu Raid Weekend mới nhất của 1 clan (dùng cho sự
    kiện loại Clan Capital)."""
    tag = await get_tag_by_clan_id(clan_id)
    if not tag:
        return []
    try:
        seasons = await get_raid_seasons(tag, clan_id=clan_id)
    except Exception:
        return []
    if not seasons:
        return []
    return seasons[0].get("members", [])


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
    default_clan_id = event.get("clan_id") or 1

    # Lấy danh sách người đã tham gia (kèm clan_id của từng người nếu có)
    try:
        part_res = sb.table("event_participants").select("player_tag, player_name, clan_id, baseline_donations").eq("event_id", event_id).execute()
    except Exception:
        part_res = sb.table("event_participants").select("player_tag, player_name, clan_id").eq("event_id", event_id).execute()
    participants = part_res.data or []
    participant_tags = {p["player_tag"] for p in participants}
    # clan_id của từng participant — mặc định về clan tạo event nếu thiếu (event cũ trước migration)
    participant_clan: dict[str, int] = {p["player_tag"]: (p.get("clan_id") or default_clan_id) for p in participants}
    clan_ids_involved = sorted(set(participant_clan.values())) or [default_clan_id]

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

    # Điều kiện donate: lấy từ danh sách clan members — gộp từ tất cả clan liên quan
    if condition_type == "top_donations":
        all_members: list = []
        for cid in clan_ids_involved:
            try:
                all_members += await _donation_members_for_clan(cid)
            except Exception:
                continue
        members = [m for m in all_members if m["tag"] in participant_tags]
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

    # Điều kiện Clan Capital: gộp raid mới nhất của từng clan liên quan
    if condition_type in ("capital_most_loot", "capital_most_attacks"):
        all_capital_members: list = []
        for cid in clan_ids_involved:
            try:
                all_capital_members += await _capital_members_for_clan(cid)
            except Exception:
                continue
        members = [m for m in all_capital_members if m["tag"] in participant_tags]
        # Người tham gia nhưng chưa raid lượt nào (0 gold, 0 attack) tự động
        # bị loại vì điểm = 0, sẽ rơi xuống cuối bảng — không xét vào top N
        # nếu top N nhỏ hơn số người tham gia.
        key = "capitalResourcesLooted" if condition_type == "capital_most_loot" else "attacks"
        ranked = sorted(members, key=lambda m: m.get(key, 0), reverse=True)
        ranked = [m for m in ranked if m.get(key, 0) > 0]
        unit = "gold" if condition_type == "capital_most_loot" else "lượt tấn công"
        leaderboard = [
            {
                "player_tag": m["tag"],
                "player_name": m["name"],
                "rank": i + 1,
                "metric_value": f"{m.get(key, 0)} {unit}",
            }
            for i, m in enumerate(ranked[:top_n])
        ]
        note = None if leaderboard else "Chưa có ai raid Clan Capital trong mùa gần nhất."
        return {"event": event, "leaderboard": leaderboard, "note": note, "participant_count": len(participants)}

    # Điều kiện Donate: donate hiện tại - mốc donate lúc tham gia sự kiện.
    # Giới hạn: nếu CoC reset donate hàng tuần giữa lúc sự kiện diễn ra, số
    # có thể lệch — CoC không có API donate theo mốc thời gian tuỳ chọn.
    if condition_type == "donate_total":
        baseline_by_tag = {p["player_tag"]: p.get("baseline_donations", 0) or 0 for p in participants}
        all_donate_members: list = []
        for cid in clan_ids_involved:
            try:
                all_donate_members += await _donation_members_for_clan(cid)
            except Exception:
                continue
        scored = []
        for m in all_donate_members:
            if m["tag"] not in participant_tags:
                continue
            earned = max(0, m.get("donations", 0) - baseline_by_tag.get(m["tag"], 0))
            scored.append({"tag": m["tag"], "name": m["name"], "earned": earned})
        ranked = sorted([m for m in scored if m["earned"] > 0], key=lambda m: -m["earned"])
        leaderboard = [
            {"player_tag": m["tag"], "player_name": m["name"], "rank": i + 1, "metric_value": f"{m['earned']} donate"}
            for i, m in enumerate(ranked[:top_n])
        ]
        note = None if leaderboard else "Chưa ai donate thêm kể từ lúc tham gia sự kiện."
        return {"event": event, "leaderboard": leaderboard, "note": note, "participant_count": len(participants)}

    # Điều kiện war — gộp war hiện tại/gần nhất của từng clan liên quan
    war_members: list = []
    for cid in clan_ids_involved:
        try:
            war_members += await _war_members_for_clan(cid, event.get("event_type", "war"))
        except Exception:
            continue

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
