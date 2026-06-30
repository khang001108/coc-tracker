from fastapi import APIRouter, HTTPException
from supabase_client import get_supabase
from services.coc_api import get_raid_seasons, get_coc_config
import json

router = APIRouter()

@router.get("/raids")
async def raid_seasons():
    sb = get_supabase()
    res = sb.table("snapshot_raid").select("data,updated_at").order("id", desc=True).limit(1).execute()
    if res.data:
        return {**json.loads(res.data[0]["data"]), "_cached_at": res.data[0]["updated_at"]}
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình")
    seasons = await get_raid_seasons(tag)
    return seasons[0] if seasons else {}
