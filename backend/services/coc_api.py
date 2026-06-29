"""
Clash of Clans API wrapper.
Reads API key + clan tag from Supabase settings table.
"""
import os
import httpx
from supabase_client import get_supabase
from urllib.parse import quote

# Mặc định dùng proxy miễn phí của RoyaleAPI (https://docs.royaleapi.com/proxy)
# vì Render free/standard không cấp 1 IP tĩnh duy nhất, mà CoC API lại yêu cầu
# whitelist đúng 1 IP. Whitelist IP 45.79.218.79 trong CoC dev portal là đủ.
# Nếu sau này có IP tĩnh thật (Render Dedicated IP, QuotaGuard...), set biến môi
# trường COC_BASE_URL=https://api.clashofclans.com/v1 để gọi trực tiếp.
COC_BASE = os.environ.get("COC_BASE_URL", "https://cocproxy.royaleapi.dev/v1")

async def get_coc_config() -> dict:
    """Load api_key and clan_tag from DB settings."""
    sb = get_supabase()
    res = sb.table("settings").select("key,value").in_("key", ["coc_api_key", "clan_tag"]).execute()
    config = {row["key"]: row["value"] for row in res.data}
    return config

async def coc_get(path: str) -> dict:
    config = await get_coc_config()
    api_key = config.get("coc_api_key", "")
    if not api_key:
        raise ValueError("CoC API key chưa được cấu hình. Vào Settings để thêm.")
    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{COC_BASE}{path}", headers=headers)
        r.raise_for_status()
        return r.json()

def encode_tag(tag: str) -> str:
    return quote(tag.replace("#", "%23"), safe="")

# ── Clan ──────────────────────────────────────────────────────────────────────
async def get_clan(tag: str) -> dict:
    return await coc_get(f"/clans/{encode_tag(tag)}")

async def get_clan_members(tag: str) -> list:
    data = await coc_get(f"/clans/{encode_tag(tag)}/members")
    return data.get("items", [])

# ── War ───────────────────────────────────────────────────────────────────────
async def get_current_war(tag: str) -> dict:
    return await coc_get(f"/clans/{encode_tag(tag)}/currentwar")

async def get_war_log(tag: str) -> list:
    data = await coc_get(f"/clans/{encode_tag(tag)}/warlog?limit=20")
    return data.get("items", [])

async def get_cwl_group(tag: str) -> dict:
    return await coc_get(f"/clans/{encode_tag(tag)}/currentwar/leaguegroup")

# ── Capital ───────────────────────────────────────────────────────────────────
async def get_raid_seasons(tag: str) -> list:
    data = await coc_get(f"/clans/{encode_tag(tag)}/capitalraidseasons?limit=5")
    return data.get("items", [])

# ── Clan Games ────────────────────────────────────────────────────────────────
async def get_clan_info_for_games(tag: str) -> dict:
    """Clan Games points are inside member info."""
    return await coc_get(f"/clans/{encode_tag(tag)}")

# ── Player ────────────────────────────────────────────────────────────────────
async def get_player(player_tag: str) -> dict:
    return await coc_get(f"/players/{encode_tag(player_tag)}")
