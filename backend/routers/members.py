from fastapi import APIRouter, HTTPException, Query
from supabase_client import get_supabase
from services.coc_api import get_clan_members, get_player, get_coc_config

router = APIRouter()

@router.get("/")
async def members_list():
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình")
    items = await get_clan_members(tag)
    return {"items": items, "count": len(items)}

@router.get("/log")
async def member_log(limit: int = Query(50, le=200)):
    sb = get_supabase()
    res = sb.table("member_log").select("*").order("joined_at", desc=True).limit(limit).execute()
    return res.data

@router.get("/{player_tag}")
async def profile(player_tag: str):
    return await get_player(player_tag)
