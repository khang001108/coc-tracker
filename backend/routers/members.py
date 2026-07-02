from fastapi import APIRouter, HTTPException, Query, Request
from supabase_client import get_supabase
from clan_context import get_tag_for_request
from services.coc_api import get_clan_members, get_player

router = APIRouter()

@router.get("/")
async def members_list(request: Request):
    clan_id, tag = await get_tag_for_request(request)
    items = await get_clan_members(tag, clan_id=clan_id)
    return {"items": items, "count": len(items)}

@router.get("/log")
async def member_log(limit: int = Query(50, le=200)):
    # Lưu ý: bảng member_log hiện chưa có cột clan_id (chỉ theo dõi clan chính),
    # nên nhật ký vào/rời clan chỉ áp dụng cho clan #1.
    sb = get_supabase()
    res = sb.table("member_log").select("*").order("joined_at", desc=True).limit(limit).execute()
    return res.data

@router.get("/{player_tag}")
async def profile(player_tag: str, request: Request):
    clan_id, _ = await get_tag_for_request(request)
    return await get_player(player_tag, clan_id=clan_id)
