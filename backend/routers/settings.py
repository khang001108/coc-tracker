from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase_client import get_supabase
from services.coc_api import get_clan, COC_BASE

router = APIRouter()

class SettingUpdate(BaseModel):
    key: str
    value: str

ALLOWED_KEYS = [
    "coc_api_key", "clan_tag",
    "discord_webhook",
    "telegram_bot_token", "telegram_chat_id",
    "notify_war", "notify_raid", "notify_donate", "notify_member",
]

@router.get("/")
async def get_settings():
    sb = get_supabase()
    res = sb.table("settings").select("key,value").execute()
    data = {row["key"]: row["value"] for row in res.data}
    # Mask sensitive keys partially
    if "coc_api_key" in data and len(data["coc_api_key"]) > 8:
        data["coc_api_key_masked"] = data["coc_api_key"][:6] + "••••••"
    return data

@router.post("/")
async def upsert_setting(body: SettingUpdate):
    if body.key not in ALLOWED_KEYS:
        raise HTTPException(400, f"Key '{body.key}' không hợp lệ")
    sb = get_supabase()
    sb.table("settings").upsert({"key": body.key, "value": body.value}).execute()
    return {"ok": True}

@router.post("/test-clan")
async def test_clan_connection(body: dict):
    """Test API key + clan tag before saving."""
    import httpx
    api_key = body.get("api_key", "")
    clan_tag = body.get("clan_tag", "")
    if not api_key or not clan_tag:
        raise HTTPException(400, "Cần cả api_key và clan_tag")
    try:
        from urllib.parse import quote
        tag_enc = quote(clan_tag.replace("#", "%23"), safe="")
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{COC_BASE}/clans/{tag_enc}",
                headers={"Authorization": f"Bearer {api_key}"}
            )
        if r.status_code == 200:
            data = r.json()
            return {"ok": True, "clan_name": data.get("name"), "members": data.get("members")}
        elif r.status_code == 403:
            raise HTTPException(403, "API key không hợp lệ hoặc IP bị chặn")
        elif r.status_code == 404:
            raise HTTPException(404, "Không tìm thấy clan với tag này")
        else:
            raise HTTPException(r.status_code, f"CoC API lỗi: {r.text}")
    except httpx.TimeoutException:
        raise HTTPException(504, "Timeout kết nối CoC API")

@router.post("/test-discord")
async def test_discord(body: dict):
    import httpx
    webhook = body.get("webhook_url", "")
    if not webhook:
        raise HTTPException(400, "Cần webhook_url")
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(webhook, json={"content": "✅ CoC Tracker kết nối thành công!"})
    if r.status_code in (200, 204):
        return {"ok": True}
    raise HTTPException(r.status_code, f"Discord lỗi: {r.text}")

@router.post("/test-telegram")
async def test_telegram(body: dict):
    import httpx
    token = body.get("bot_token", "")
    chat_id = body.get("chat_id", "")
    if not token or not chat_id:
        raise HTTPException(400, "Cần bot_token và chat_id")
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, json={"chat_id": chat_id, "text": "✅ CoC Tracker kết nối thành công!"})
    data = r.json()
    if data.get("ok"):
        return {"ok": True}
    raise HTTPException(400, data.get("description", "Telegram lỗi"))
