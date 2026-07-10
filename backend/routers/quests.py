"""
Nhiệm vụ — Đồng thủ lĩnh trở lên (hoặc Admin) tạo ra, thưởng Danh vọng hoặc
Coins. Điều kiện hoàn thành LUÔN đối chiếu trực tiếp với dữ liệu THẬT lấy
từ CoC API (/players/{tag}) ngay tại thời điểm bấm nhận thưởng — không có
bước admin xác nhận thủ công như huy chương CWL, hệ thống tự chấm và trao
ngay nếu đủ điều kiện, tránh gian lận."""
from fastapi import APIRouter, HTTPException, Request, Header
from supabase_client import get_supabase
from clan_context import get_clan_id, get_tag_by_clan_id
from auth import verify_admin_token
from member_auth import verify_member_token
from services.coc_api import get_clan_members, get_player

router = APIRouter()

LEADER_ROLES = {"leader", "coLeader"}

# condition_type -> (nhãn hiển thị, field lấy từ /players/{tag}, mô tả)
CONDITIONS = {
    "trophies_reach":            {"label": "Đạt số Cúp hiện tại",         "field": "trophies"},
    "best_trophies_reach":       {"label": "Đạt Cúp cao nhất từng có",     "field": "bestTrophies"},
    "th_level_reach":            {"label": "Đạt cấp Town Hall",           "field": "townHallLevel"},
    "war_stars_reach":           {"label": "Đạt tổng War Stars (career)", "field": "warStars"},
    "attack_wins_reach":         {"label": "Đạt số trận thắng tấn công",  "field": "attackWins"},
    "defense_wins_reach":        {"label": "Đạt số trận thắng phòng thủ","field": "defenseWins"},
    "donations_reach":           {"label": "Đạt số quân donate hiện tại", "field": "donations"},
    "capital_contributions_reach": {"label": "Đạt tổng Gold góp Clan Capital (career)", "field": "clanCapitalContributions"},
}


async def _get_member_role(clan_id: int, member_tag: str) -> str | None:
    tag = await get_tag_by_clan_id(clan_id)
    members = await get_clan_members(tag, clan_id=clan_id) if tag else []
    me = next((m for m in members if m["tag"] == member_tag), None)
    return me.get("role") if me else None


async def _require_creator(clan_id: int, x_admin_token: str | None, x_member_token: str | None) -> str:
    """Admin hoặc Đồng thủ lĩnh trở lên mới được tạo/xoá nhiệm vụ (giống quyền tạo sự kiện)."""
    if verify_admin_token(x_admin_token):
        return "Admin"
    member_tag = verify_member_token(x_member_token)
    if not member_tag:
        raise HTTPException(401, "Cần đăng nhập Admin hoặc Đồng thủ lĩnh trở lên")
    role = await _get_member_role(clan_id, member_tag)
    if role not in LEADER_ROLES:
        raise HTTPException(403, "Chỉ Đồng thủ lĩnh trở lên hoặc Admin mới được tạo nhiệm vụ")
    sb = get_supabase()
    acc = sb.table("member_accounts").select("player_name").eq("player_tag", member_tag).execute()
    return acc.data[0]["player_name"] if acc.data else "Đồng thủ lĩnh"


@router.get("/conditions")
async def list_conditions():
    return [{"value": k, "label": v["label"]} for k, v in CONDITIONS.items()]


@router.get("/")
async def list_quests(request: Request, x_member_token: str | None = Header(default=None)):
    """Danh sách nhiệm vụ đang mở — nếu người xem đã đăng nhập thành viên,
    kèm luôn tiến độ hiện tại (lấy trực tiếp từ CoC API) + đã nhận chưa."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    res = (sb.table("quests").select("*").eq("clan_id", clan_id).eq("status", "active")
           .order("created_at", desc=True).execute())
    quests = res.data or []

    member_tag = verify_member_token(x_member_token)
    my_claims: set = set()
    my_player = None
    if member_tag:
        claims = sb.table("quest_claims").select("quest_id").eq("player_tag", member_tag).execute()
        my_claims = {c["quest_id"] for c in (claims.data or [])}
        try:
            my_player = await get_player(member_tag, clan_id=clan_id)
        except Exception:
            my_player = None

    out = []
    for q in quests:
        cond = CONDITIONS.get(q["condition_type"], {})
        item = {**q, "condition_label": cond.get("label", q["condition_type"])}
        if member_tag:
            item["claimed"] = q["id"] in my_claims
            if my_player is not None and not item["claimed"]:
                current = my_player.get(cond.get("field", ""), 0) or 0
                item["my_progress"] = current
                item["my_progress_met"] = current >= q["target_value"]
        out.append(item)
    return out


@router.post("/")
async def create_quest(request: Request, x_admin_token: str | None = Header(default=None),
                        x_member_token: str | None = Header(default=None)):
    clan_id = get_clan_id(request)
    actor = await _require_creator(clan_id, x_admin_token, x_member_token)
    body = await request.json()
    title = (body.get("title") or "").strip()
    condition_type = body.get("condition_type")
    target_value = body.get("target_value")
    reward_type = body.get("reward_type")
    reward_amount = body.get("reward_amount")

    if not title:
        raise HTTPException(400, "Thiếu tiêu đề")
    if condition_type not in CONDITIONS:
        raise HTTPException(400, "Điều kiện không hợp lệ")
    if reward_type not in ("reputation", "coins"):
        raise HTTPException(400, "Loại thưởng không hợp lệ")
    try:
        target_value = int(target_value)
        reward_amount = int(reward_amount)
    except (TypeError, ValueError):
        raise HTTPException(400, "target_value/reward_amount phải là số")
    if target_value <= 0 or reward_amount <= 0:
        raise HTTPException(400, "target_value/reward_amount phải > 0")

    sb = get_supabase()
    row = {
        "clan_id": clan_id, "title": title, "description": (body.get("description") or "").strip() or None,
        "condition_type": condition_type, "target_value": target_value,
        "reward_type": reward_type, "reward_amount": reward_amount,
        "created_by": actor,
    }
    res = sb.table("quests").insert(row).execute()
    return res.data[0]


@router.delete("/{quest_id}")
async def delete_quest(quest_id: int, request: Request, x_admin_token: str | None = Header(default=None),
                        x_member_token: str | None = Header(default=None)):
    clan_id = get_clan_id(request)
    await _require_creator(clan_id, x_admin_token, x_member_token)
    sb = get_supabase()
    sb.table("quests").update({"status": "closed"}).eq("id", quest_id).eq("clan_id", clan_id).execute()
    return {"ok": True}


@router.post("/{quest_id}/claim")
async def claim_quest(quest_id: int, request: Request, x_member_token: str | None = Header(default=None)):
    """Đối chiếu TRỰC TIẾP với CoC API tại thời điểm bấm — đủ điều kiện mới
    trao thưởng, không có bước xác nhận thủ công nào ở giữa."""
    clan_id = get_clan_id(request)
    member_tag = verify_member_token(x_member_token)
    if not member_tag:
        raise HTTPException(401, "Cần đăng nhập thành viên để nhận nhiệm vụ")

    sb = get_supabase()
    q = sb.table("quests").select("*").eq("id", quest_id).eq("clan_id", clan_id).execute()
    if not q.data:
        raise HTTPException(404, "Không tìm thấy nhiệm vụ")
    quest = q.data[0]
    if quest["status"] != "active":
        raise HTTPException(400, "Nhiệm vụ đã đóng")

    existing = sb.table("quest_claims").select("id").eq("quest_id", quest_id).eq("player_tag", member_tag).execute()
    if existing.data:
        raise HTTPException(400, "Bạn đã nhận thưởng nhiệm vụ này rồi")

    cond = CONDITIONS.get(quest["condition_type"])
    if not cond:
        raise HTTPException(500, "Điều kiện nhiệm vụ không hợp lệ")
    try:
        player = await get_player(member_tag, clan_id=clan_id)
    except Exception:
        raise HTTPException(502, "Không lấy được dữ liệu từ CoC API — thử lại sau")
    current = player.get(cond["field"], 0) or 0
    if current < quest["target_value"]:
        raise HTTPException(400, f"Chưa đủ điều kiện — hiện tại {current}/{quest['target_value']}")

    acc = sb.table("member_accounts").select("player_name").eq("player_tag", member_tag).execute()
    player_name = acc.data[0]["player_name"] if acc.data else player.get("name", "?")

    # Ghi nhận đã nhận TRƯỚC — tránh race condition nhận trùng nếu bấm 2 lần liên tiếp
    try:
        sb.table("quest_claims").insert({"quest_id": quest_id, "player_tag": member_tag, "player_name": player_name}).execute()
    except Exception:
        raise HTTPException(400, "Bạn đã nhận thưởng nhiệm vụ này rồi")

    if quest["reward_type"] == "reputation":
        from services.reputation import add_reputation
        add_reputation(sb, clan_id, member_tag, player_name, "manual",
                        ref_key=f"quest-{quest_id}", note=f"Nhiệm vụ: {quest['title']}", points=quest["reward_amount"])
    else:
        current_coins = sb.table("member_accounts").select("coins").eq("player_tag", member_tag).execute()
        coins_now = (current_coins.data[0]["coins"] if current_coins.data else 0) or 0
        sb.table("member_accounts").update({"coins": coins_now + quest["reward_amount"]}).eq("player_tag", member_tag).execute()

    return {"ok": True, "reward_type": quest["reward_type"], "reward_amount": quest["reward_amount"]}
