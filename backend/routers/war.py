from fastapi import APIRouter, HTTPException
from supabase_client import get_supabase
from clan_context import get_clan_id
from services.coc_api import get_current_war, get_war_log, get_cwl_group, get_cwl_war, get_coc_config
import json

router = APIRouter()

@router.get("/current")
async def current_war():
    sb = get_supabase()
    res = sb.table("snapshot_war").select("data,updated_at").order("id", desc=True).limit(1).execute()
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

@router.get("/cwl/current")
async def cwl_current_war():
    """Tìm và trả về war CWL hiện tại của clan (có cả badge + isCWL flag)."""
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag:
        raise HTTPException(400, "Chưa cấu hình clan tag")
    try:
        group = await get_cwl_group(tag)
    except Exception:
        return {"state": "notInWar", "isCWL": True}

    clans      = group.get("clans", [])
    rounds     = group.get("rounds", [])
    badge_map  = {c_["tag"]: c_.get("badgeUrls", {}).get("medium", "") for c_ in clans}

    # Duyệt các round từ mới nhất → tìm war active có clan ta
    for round_data in reversed(rounds):
        for war_tag in round_data.get("warTags", []):
            if war_tag == "#0":
                continue
            try:
                w = await get_cwl_war(war_tag)
            except Exception:
                continue
            our_side  = None
            their_side = None
            if w.get("clan", {}).get("tag") == tag:
                our_side, their_side = "clan", "opponent"
            elif w.get("opponent", {}).get("tag") == tag:
                our_side, their_side = "opponent", "clan"
            if not our_side:
                continue
            # Swap nếu cần để clan ta luôn ở key "clan"
            if our_side == "opponent":
                w["clan"], w["opponent"] = w["opponent"], w["clan"]
            # Gắn badge URL
            w["clan"]["badgeUrl"]     = badge_map.get(w["clan"]["tag"], "")
            w["opponent"]["badgeUrl"] = badge_map.get(w["opponent"]["tag"], "")
            w["isCWL"] = True
            w["season"] = group.get("season", "")
            return w

    return {"state": "notInWar", "isCWL": True}
