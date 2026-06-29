from fastapi import APIRouter, HTTPException
from supabase_client import get_supabase
from services.coc_api import get_clan, get_coc_config
import json

router = APIRouter()

@router.get("/")
async def clan_info():
    sb = get_supabase()
    res = sb.table("snapshot_clan").select("data,updated_at").limit(1).execute()
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
