"""
Clash of Clans API wrapper.
Reads API key + clan tag from Supabase settings table.
"""
import httpx
from supabase_client import get_supabase
from urllib.parse import quote

COC_BASE = "https://cocproxy.royaleapi.dev/v1"

async def get_coc_config() -> dict:
    """Load api_key and clan_tag from DB settings."""
    sb = get_supabase()
    res = sb.table("settings").select("key,value").in_("key", ["coc_api_key", "clan_tag"]).execute()
    config = {row["key"]: row["value"] for row in res.data}
    return config

async def coc_get(path: str, clan_id: int = 1) -> dict:
    """Gọi CoC API — API key luôn lấy từ bảng `clans` theo đúng clan_id (kể cả
    clan #1), để sửa key/tag ở màn 'Quản lý Clan' áp dụng cho MỌI clan nhất
    quán. Fallback về bảng settings (kiểu cũ) chỉ khi clan #1 chưa có key
    trong bảng clans (chưa chạy migration/chưa từng lưu qua Quản lý Clan)."""
    from supabase_client import get_supabase
    sb = get_supabase()
    res = sb.table("clans").select("coc_api_key").eq("id", clan_id).execute()
    api_key = (res.data[0].get("coc_api_key") or "") if res.data else ""
    if not api_key and clan_id == 1:
        config = await get_coc_config()
        api_key = config.get("coc_api_key", "")
    if not api_key:
        raise ValueError("CoC API key chưa được cấu hình.")
    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{COC_BASE}{path}", headers=headers)
        r.raise_for_status()
        return r.json()

def encode_tag(tag: str) -> str:
    return quote(tag, safe="")

# ── Clan ──────────────────────────────────────────────────────────────────────
async def get_clan(tag: str, clan_id: int = 1) -> dict:
    return await coc_get(f"/clans/{encode_tag(tag)}", clan_id=clan_id)

async def get_clan_members(tag: str, clan_id: int = 1) -> list:
    data = await coc_get(f"/clans/{encode_tag(tag)}/members", clan_id=clan_id)
    return data.get("items", [])

# ── War ───────────────────────────────────────────────────────────────────────
async def get_current_war(tag: str, clan_id: int = 1) -> dict:
    return await coc_get(f"/clans/{encode_tag(tag)}/currentwar", clan_id=clan_id)

async def get_war_log(tag: str, clan_id: int = 1) -> list:
    data = await coc_get(f"/clans/{encode_tag(tag)}/warlog?limit=20", clan_id=clan_id)
    return data.get("items", [])

async def get_cwl_war(war_tag: str, clan_id: int = 1) -> dict:
    """Lấy chi tiết 1 war trong CWL theo warTag."""
    return await coc_get(f"/clanwarleagues/wars/{encode_tag(war_tag)}", clan_id=clan_id)

async def get_cwl_group(tag: str, clan_id: int = 1) -> dict:
    return await coc_get(f"/clans/{encode_tag(tag)}/currentwar/leaguegroup", clan_id=clan_id)

# ── Capital ───────────────────────────────────────────────────────────────────
async def get_raid_seasons(tag: str, clan_id: int = 1) -> list:
    data = await coc_get(f"/clans/{encode_tag(tag)}/capitalraidseasons?limit=5", clan_id=clan_id)
    return data.get("items", [])

# ── Clan Games ────────────────────────────────────────────────────────────────
async def get_clan_info_for_games(tag: str, clan_id: int = 1) -> dict:
    """Clan Games points are inside member info."""
    return await coc_get(f"/clans/{encode_tag(tag)}", clan_id=clan_id)

# ── Player ────────────────────────────────────────────────────────────────────
async def get_player(player_tag: str, clan_id: int = 1) -> dict:
    return await coc_get(f"/players/{encode_tag(player_tag)}", clan_id=clan_id)
