from fastapi import APIRouter, Request
from supabase_client import get_supabase
from clan_context import get_tag_for_request
from services.coc_api import get_raid_seasons
import json

router = APIRouter()

@router.get("/raids")
async def raid_seasons(request: Request):
    clan_id, tag = await get_tag_for_request(request)

    # Clan chính (id=1): dùng snapshot cache cho nhanh.
    if clan_id == 1:
        sb = get_supabase()
        res = sb.table("snapshot_raid").select("data,updated_at").eq("clan_id", 1).order("id", desc=True).limit(1).execute()
        if res.data:
            return {**json.loads(res.data[0]["data"]), "_cached_at": res.data[0]["updated_at"]}

    # Clan khác (hoặc chưa có cache): gọi trực tiếp CoC API với đúng clan đang chọn.
    seasons = await get_raid_seasons(tag, clan_id=clan_id)
    return seasons[0] if seasons else {}
