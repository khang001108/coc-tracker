from fastapi import APIRouter, HTTPException, Request, Depends
from supabase_client import get_supabase
from auth import require_admin, create_token, verify_password
import httpx
from urllib.parse import quote

router = APIRouter()

ALLOWED_KEYS = [
    "coc_api_key", "clan_tag",
    "discord_webhook",
    "telegram_bot_token", "telegram_chat_id",
    "notify_war", "notify_raid", "notify_donate", "notify_member",
]

@router.post("/login")
async def login(request: Request):
    body = await request.json()
    password = body.get("password", "")
    if not verify_password(password):
        raise HTTPException(401, "Sai mật khẩu")
    return {"token": create_token()}

@router.get("/")
async def get_settings(_: bool = Depends(require_admin)):
    try:
        sb = get_supabase()
        res = sb.table("settings").select("key,value").execute()
        return {row["key"]: row["value"] for row in res.data}
    except Exception as e:
        raise HTTPException(500, f"DB error: {str(e)}")

@router.post("/")
async def upsert_setting(request: Request, _: bool = Depends(require_admin)):
    try:
        body = await request.json()
        key = body.get("key", "")
        value = body.get("value", "")
        if key not in ALLOWED_KEYS:
            raise HTTPException(400, f"Key '{key}' không hợp lệ")
        sb = get_supabase()
        sb.table("settings").upsert({"key": key, "value": value}).execute()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Lỗi lưu: {str(e)}")

@router.post("/test-clan")
async def test_clan_connection(request: Request, _: bool = Depends(require_admin)):
    try:
        body = await request.json()
        api_key = body.get("api_key", "").strip()
        clan_tag = body.get("clan_tag", "").strip()
        if not api_key or not clan_tag:
            raise HTTPException(400, "Cần cả api_key và clan_tag")
        tag_enc = quote(clan_tag, safe="")
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"https://cocproxy.royaleapi.dev/v1/clans/{tag_enc}",
                headers={"Authorization": f"Bearer {api_key}"}
            )
        if r.status_code == 200:
            data = r.json()
            return {"ok": True, "clan_name": data.get("name"), "members": data.get("members"), "tag": data.get("tag")}
        elif r.status_code == 403:
            raise HTTPException(403, "API key không hợp lệ hoặc IP server chưa được whitelist trong CoC Developer")
        elif r.status_code == 404:
            raise HTTPException(404, "Không tìm thấy clan với tag này. Kiểm tra lại #TAG")
        else:
            raise HTTPException(r.status_code, f"CoC API lỗi {r.status_code}: {r.text[:200]}")
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(504, "Timeout — CoC API không phản hồi")
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/test-discord")
async def test_discord(request: Request, _: bool = Depends(require_admin)):
    try:
        body = await request.json()
        webhook = body.get("webhook_url", "").strip()
        if not webhook:
            raise HTTPException(400, "Cần webhook_url")
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(webhook, json={"content": "✅ CoC Tracker kết nối Discord thành công! 🏰"})
        if r.status_code in (200, 204):
            return {"ok": True}
        raise HTTPException(r.status_code, f"Discord lỗi: {r.text[:200]}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/test-telegram")
async def test_telegram(request: Request, _: bool = Depends(require_admin)):
    try:
        body = await request.json()
        token = body.get("bot_token", "").strip()
        chat_id = body.get("chat_id", "").strip()
        if not token or not chat_id:
            raise HTTPException(400, "Cần bot_token và chat_id")
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json={
                "chat_id": chat_id,
                "text": "✅ CoC Tracker kết nối Telegram thành công! 🏰"
            })
        data = r.json()
        if data.get("ok"):
            return {"ok": True}
        raise HTTPException(400, data.get("description", "Telegram lỗi"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
