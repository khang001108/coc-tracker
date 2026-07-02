from fastapi import APIRouter, HTTPException, Request
from supabase_client import get_supabase
from services.coc_api import get_clan, get_coc_config
from clan_context import get_clan_id
import json

router = APIRouter()

@router.get("/")
async def clan_info(request: Request):
    clan_id = get_clan_id(request)
    sb = get_supabase()

    # Multi-clan: dùng snapshot theo clan_id nếu có column, fallback không filter
    if clan_id != 1:
        # Lấy config từ bảng clans
        clan_res = sb.table("clans").select("clan_tag, coc_api_key, clan_name").eq("id", clan_id).execute()
        if not clan_res.data:
            raise HTTPException(404, f"Clan {clan_id} không tồn tại")
        cfg = clan_res.data[0]
        tag = cfg.get("clan_tag", "")
        from services.coc_api import coc_get, encode_tag
        data = await coc_get(f"/clans/{encode_tag(tag)}", clan_id=clan_id)
        return data

    # Clan 1: dùng snapshot cache như cũ
    res = sb.table("snapshot_clan").select("data,updated_at").order("id", desc=True).limit(1).execute()
    if res.data:
        return {**json.loads(res.data[0]["data"]), "_cached_at": res.data[0]["updated_at"]}
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình clan tag")
    return await get_clan(tag)

@router.get("/refresh")
async def refresh():
    from schedulers.poller import poll_clan
    await poll_clan()
    return {"ok": True}
