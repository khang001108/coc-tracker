from fastapi import APIRouter, HTTPException
from services.coc_api import get_clan, get_coc_config

router = APIRouter()

@router.get("/")
async def clan_games():
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình")
    clan = await get_clan(tag)
    members = clan.get("memberList", [])
    return {"members": [{"name": m.get("name"), "tag": m.get("tag"),
        "th": m.get("townHallLevel"), "role": m.get("role"),
        "donations": m.get("donations", 0),
        "donationsReceived": m.get("donationsReceived", 0)} for m in members]}
