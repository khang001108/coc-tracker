from fastapi import APIRouter, Request
from supabase_client import get_supabase
from clan_context import get_tag_for_request
from services.coc_api import get_clan
import json

router = APIRouter()

@router.get("/")
async def clan_games(request: Request):
    clan_id, tag = await get_tag_for_request(request)

    # Clan chính (id=1): dùng snapshot cache cho nhanh — đồng thời sống sót
    # qua lúc CoC API/proxy trung gian bị sập tạm thời (trước đây gọi live
    # trực tiếp, hễ proxy lỗi là cả trang trắng xoá, không có dữ liệu dự phòng).
    if clan_id == 1:
        sb = get_supabase()
        res = sb.table("snapshot_clan").select("data").eq("clan_id", 1).order("id", desc=True).limit(1).execute()
        if res.data:
            clan = json.loads(res.data[0]["data"])
            members = clan.get("memberList", [])
            return {"members": [{"name": m.get("name"), "tag": m.get("tag"),
                "th": m.get("townHallLevel"), "role": m.get("role"),
                "donations": m.get("donations", 0),
                "donationsReceived": m.get("donationsReceived", 0)} for m in members]}

    clan = await get_clan(tag, clan_id=clan_id)
    members = clan.get("memberList", [])
    return {"members": [{"name": m.get("name"), "tag": m.get("tag"),
        "th": m.get("townHallLevel"), "role": m.get("role"),
        "donations": m.get("donations", 0),
        "donationsReceived": m.get("donationsReceived", 0)} for m in members]}
