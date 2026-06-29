"""All CoC data routers - reads from snapshots or live API."""
from fastapi import APIRouter, HTTPException, Query
from supabase_client import get_supabase
from services.coc_api import (
    get_clan, get_current_war, get_war_log, get_cwl_group,
    get_raid_seasons, get_clan_members, get_player, get_coc_config
)
from services.notify_service import notify_all
import json

# ── Clan ──────────────────────────────────────────────────────────────────────
router_clan = APIRouter()

@router_clan.get("/")
async def clan_info():
    sb = get_supabase()
    res = sb.table("snapshot_clan").select("data,updated_at").limit(1).execute()
    if res.data:
        return {**json.loads(res.data[0]["data"]), "_cached_at": res.data[0]["updated_at"]}
    # fallback live
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình clan tag")
    return await get_clan(tag)

@router_clan.get("/refresh")
async def clan_refresh():
    from schedulers.poller import poll_clan
    await poll_clan()
    return {"ok": True}

# ── War ───────────────────────────────────────────────────────────────────────
router_war = APIRouter()

@router_war.get("/current")
async def current_war():
    sb = get_supabase()
    res = sb.table("snapshot_war").select("data,updated_at").limit(1).execute()
    if res.data:
        return {**json.loads(res.data[0]["data"]), "_cached_at": res.data[0]["updated_at"]}
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình clan tag")
    return await get_current_war(tag)

@router_war.get("/log")
async def war_log():
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình clan tag")
    return await get_war_log(tag)

@router_war.get("/cwl")
async def cwl_group():
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình clan tag")
    try:
        return await get_cwl_group(tag)
    except Exception:
        return {"error": "Không có CWL đang diễn ra"}

# ── Capital ───────────────────────────────────────────────────────────────────
router_capital = APIRouter()

@router_capital.get("/raids")
async def raid_seasons():
    sb = get_supabase()
    res = sb.table("snapshot_raid").select("data,updated_at").limit(1).execute()
    if res.data:
        return {**json.loads(res.data[0]["data"]), "_cached_at": res.data[0]["updated_at"]}
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình clan tag")
    seasons = await get_raid_seasons(tag)
    return seasons[0] if seasons else {}

# ── Games ─────────────────────────────────────────────────────────────────────
router_games = APIRouter()

@router_games.get("/")
async def clan_games():
    """Clan Games points via member list."""
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình clan tag")
    clan = await get_clan(tag)
    members = clan.get("memberList", [])
    games_data = [
        {
            "name": m.get("name"),
            "tag": m.get("tag"),
            "th": m.get("townHallLevel"),
            "role": m.get("role"),
            "donations": m.get("donations", 0),
            "donationsReceived": m.get("donationsReceived", 0),
        }
        for m in members
    ]
    return {"members": games_data, "total": len(games_data)}

# ── Members ───────────────────────────────────────────────────────────────────
router_members = APIRouter()

@router_members.get("/")
async def members_list():
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag: raise HTTPException(400, "Chưa cấu hình clan tag")
    members = await get_clan_members(tag)
    return {"items": members, "count": len(members)}

@router_members.get("/log")
async def member_log(limit: int = Query(50, le=200)):
    sb = get_supabase()
    res = sb.table("member_log").select("*").order("joined_at", desc=True).limit(limit).execute()
    return res.data

@router_members.get("/{player_tag}")
async def member_profile(player_tag: str):
    return await get_player(player_tag)

# ── Notify ────────────────────────────────────────────────────────────────────
router_notify = APIRouter()

class NotifyPayload:
    def __init__(self, message: str, title: str = ""):
        self.message = message
        self.title = title

@router_notify.post("/send")
async def send_notification(body: dict):
    msg = body.get("message", "")
    title = body.get("title", "")
    if not msg:
        raise HTTPException(400, "message không được trống")
    await notify_all(msg, title=title)
    return {"ok": True}
