"""
Xác định clan_id từ request — dùng chung cho tất cả router.

Ưu tiên:
  1. Header X-Clan-ID (số nguyên)
  2. Query param ?clan_id=
  3. Mặc định = 1 (backward compatible với clan cũ)

Hàm get_clan_config() thay thế get_coc_config() cũ,
trả về config của đúng clan đang được request.
"""
from fastapi import Request, HTTPException
from supabase_client import get_supabase


def get_clan_id(request: Request) -> int:
    """Lấy clan_id từ header hoặc query param."""
    try:
        cid = request.headers.get("X-Clan-ID") or request.query_params.get("clan_id")
        return int(cid) if cid else 1
    except (ValueError, TypeError):
        return 1


async def get_clan_config(clan_id: int = 1) -> dict:
    """Lấy config của clan theo id (clan_tag, coc_api_key, v.v.)"""
    sb = get_supabase()
    res = sb.table("clans").select("*").eq("id", clan_id).execute()
    if not res.data:
        raise HTTPException(404, f"Clan id={clan_id} không tồn tại")
    return res.data[0]


async def resolve_clan(request: Request) -> dict:
    """Shortcut: lấy clan_id từ request rồi trả về config clan."""
    clan_id = get_clan_id(request)
    return await get_clan_config(clan_id)
