from fastapi import APIRouter, HTTPException
from supabase_client import get_supabase
from services.coc_api import get_current_war, get_war_log, get_cwl_group, get_coc_config
import json

router = APIRouter()

@router.get("/current")
async def current_war():
    sb = get_supabase()
    res = sb.table("snapshot_war").select("data,updated_at").limit(1).execute()
    if res.data:
        return {**json.loads(res.data[0]["data"]), "_cached_at": res.data[0]["updated_at"]}
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình clan tag")
    return await get_current_war(tag)

@router.get("/log")
async def war_log():
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình")
    return {"items": await get_war_log(tag)}

@router.get("/cwl")
async def cwl():
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình")
    try:
        return await get_cwl_group(tag)
    except Exception:
        return {"error": "Không có CWL đang diễn ra"}
