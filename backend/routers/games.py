from fastapi import APIRouter, Request
from clan_context import get_tag_for_request
from services.coc_api import get_clan_members_resilient

router = APIRouter()

@router.get("/")
async def clan_games(request: Request):
    clan_id, tag = await get_tag_for_request(request)
    members = await get_clan_members_resilient(tag, clan_id=clan_id)
    return {"members": [{"name": m.get("name"), "tag": m.get("tag"),
        "th": m.get("townHallLevel"), "role": m.get("role"),
        "donations": m.get("donations", 0),
        "donationsReceived": m.get("donationsReceived", 0)} for m in members]}
