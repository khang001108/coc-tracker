"""
Trao thưởng huy chương CWL TRONG GAME — suất có giới hạn, xoay vòng công bằng.

CoC API KHÔNG trả về việc ai đã được trao huy chương trong game (đây là phần
thưởng Supercell tự động cấp theo league+sao, không phải thứ leader tự chọn
người nhận) — nên phần này là admin/đồng thủ lĩnh TỰ ĐÁNH DẤU sau khi đã trao
thật trong game.

Sau khi được đánh dấu, người đó bị "tích và mờ" — tạm loại khỏi danh sách ưu
tiên nhận huy chương ở (các) mùa CWL kế tiếp, để nhường suất cho người khác.
"1 lần WCL" được đếm theo MÙA CWL THẬT (bảng cwl_season_log, tự động ghi nhận
bởi poller khi 1 mùa CWL thật kết thúc — xem services/coc_api + schedulers/
poller.py::_check_cwl_season_completed), KHÔNG đếm theo sự kiện tạo trong app.
Sau đủ số lần cấu hình ở Cài đặt (medal_reward_reset_cwl_count, mặc định 3),
người đó tự động đủ điều kiện nhận lại.
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Header, Query
from supabase_client import get_supabase
from clan_context import get_clan_id, get_tag_by_clan_id
from auth import verify_admin_token
from member_auth import verify_member_token
from services.coc_api import get_clan_members

router = APIRouter()

CREATOR_ROLES = {"leader", "coLeader"}


def _reset_count(sb) -> int:
    res = sb.table("settings").select("value").eq("key", "medal_reward_reset_cwl_count").execute()
    try:
        return max(1, int(res.data[0]["value"])) if res.data and res.data[0]["value"] else 3
    except (ValueError, TypeError):
        return 3


async def _resolve_actor(clan_id: int, x_admin_token: str | None, x_member_token: str | None) -> str:
    """Trả về tên người thao tác (admin hoặc Đồng thủ lĩnh+) — raise nếu
    không đủ quyền. Cùng quy tắc quyền với việc tạo sự kiện (events.py)."""
    if verify_admin_token(x_admin_token):
        return "Admin"
    member_tag = verify_member_token(x_member_token)
    if not member_tag:
        raise HTTPException(401, "Cần đăng nhập admin hoặc thành viên (Đồng thủ lĩnh trở lên)")
    tag = await get_tag_by_clan_id(clan_id)
    members = await get_clan_members(tag, clan_id=clan_id) if tag else []
    me = next((m for m in members if m["tag"] == member_tag), None)
    if not me or me.get("role") not in CREATOR_ROLES:
        raise HTTPException(403, "Chỉ Đồng thủ lĩnh trở lên mới được thao tác")
    sb = get_supabase()
    acc = sb.table("member_accounts").select("player_name").eq("player_tag", member_tag).execute()
    return acc.data[0]["player_name"] if acc.data else me.get("name", "Thành viên")


@router.get("/eligibility")
async def get_eligibility(request: Request):
    """Danh sách thành viên hiện tại kèm trạng thái đủ điều kiện nhận huy
    chương (✅ đủ điều kiện / 🔒 đang bị giới hạn, còn bao nhiêu mùa nữa)."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    tag = await get_tag_by_clan_id(clan_id)
    members = await get_clan_members(tag, clan_id=clan_id) if tag else []
    reset_count = _reset_count(sb)

    seasons_res = (sb.table("cwl_season_log").select("season").eq("clan_id", clan_id)
                   .order("season").execute())
    all_seasons = sorted({r["season"] for r in (seasons_res.data or [])})

    awards_res = (sb.table("medal_reward_log").select("*").eq("clan_id", clan_id)
                  .order("created_at", desc=True).execute())
    last_award_by_tag: dict = {}
    for a in (awards_res.data or []):
        if a["player_tag"] not in last_award_by_tag:  # đã sort desc — dòng đầu tiên là gần nhất
            last_award_by_tag[a["player_tag"]] = a

    result = []
    for m in members:
        tag_ = m["tag"]
        last = last_award_by_tag.get(tag_)
        if not last:
            result.append({"player_tag": tag_, "player_name": m["name"], "eligible": True,
                            "remaining_seasons": 0, "last_award": None})
            continue
        seasons_passed = sum(1 for s in all_seasons if s > last["season"])
        remaining = max(0, reset_count - seasons_passed)
        result.append({
            "player_tag": tag_, "player_name": m["name"],
            "eligible": remaining <= 0, "remaining_seasons": remaining,
            "last_award": {"season": last["season"], "created_at": last["created_at"], "awarded_by": last.get("awarded_by")},
        })
    result.sort(key=lambda r: (r["eligible"] is False, -r["remaining_seasons"], r["player_name"]))
    return {"reset_cwl_count": reset_count, "members": result}


@router.post("/award")
async def award_medal(request: Request, x_admin_token: str | None = Header(default=None),
                       x_member_token: str | None = Header(default=None)):
    """Admin/Đồng thủ lĩnh đánh dấu 1 người ĐÃ được trao huy chương thật
    trong game — ghi lại mùa CWL hiện tại làm mốc xoay vòng."""
    clan_id = get_clan_id(request)
    actor_name = await _resolve_actor(clan_id, x_admin_token, x_member_token)
    body = await request.json()
    player_tag = (body.get("player_tag") or "").strip()
    player_name = (body.get("player_name") or "").strip()
    note = (body.get("note") or "").strip() or None
    if not player_tag or not player_name:
        raise HTTPException(400, "Thiếu player_tag/player_name")

    sb = get_supabase()
    tag = await get_tag_by_clan_id(clan_id)
    season = None
    try:
        from services.coc_api import get_cwl_group
        group = await get_cwl_group(tag, clan_id=clan_id) if tag else {}
        season = group.get("season")
    except Exception:
        pass
    if not season:
        # Không đang trong mùa CWL nào (hoặc lỗi API) — dùng mùa gần nhất đã ghi nhận
        last = (sb.table("cwl_season_log").select("season").eq("clan_id", clan_id)
                .order("season", desc=True).limit(1).execute())
        season = last.data[0]["season"] if last.data else "unknown"

    row = {"clan_id": clan_id, "player_tag": player_tag, "player_name": player_name,
           "season": season, "awarded_by": actor_name, "note": note}
    sb.table("medal_reward_log").insert(row).execute()
    return {"ok": True}


@router.get("/history")
async def get_history(request: Request, limit: int = Query(50, le=200)):
    clan_id = get_clan_id(request)
    sb = get_supabase()
    res = (sb.table("medal_reward_log").select("*").eq("clan_id", clan_id)
           .order("created_at", desc=True).limit(limit).execute())
    return res.data or []


@router.delete("/history/{entry_id}")
async def delete_history_entry(entry_id: int, request: Request,
                                x_admin_token: str | None = Header(default=None),
                                x_member_token: str | None = Header(default=None)):
    """Xoá 1 lần trao thưởng đã đánh dấu nhầm — trả lại quyền xoay vòng cho người đó."""
    clan_id = get_clan_id(request)
    await _resolve_actor(clan_id, x_admin_token, x_member_token)
    sb = get_supabase()
    sb.table("medal_reward_log").delete().eq("id", entry_id).eq("clan_id", clan_id).execute()
    return {"ok": True}
