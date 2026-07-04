from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from supabase_client import get_supabase
from auth import require_admin, create_token, verify_password
from clan_context import get_clan_id
from services.notify_service import notify_donate_coins, notify_war_coins
import httpx
import uuid
from urllib.parse import quote

router = APIRouter()

ALLOWED_KEYS = [
    "coc_api_key", "clan_tag",
    "discord_webhook",
    "telegram_bot_token", "telegram_chat_id",
    "notify_war", "notify_raid", "notify_donate", "notify_member", "notify_war_coins", "notify_cwl",
    "war_reminder_hours", "raid_reminder_hours",
    "asset_cleanup_days", "coins_per_war_star", "stats_retention_days", "chat_retention_days",
    "chat_background_image", "overview_show_war", "overview_show_cwl", "overview_show_capital", "ember_color", "page_banners",
]

@router.post("/login")
async def login(request: Request):
    body = await request.json()
    password = body.get("password", "")
    if not verify_password(password):
        raise HTTPException(401, "Sai mật khẩu")
    return {"token": create_token()}

@router.post("/upload-image")
async def upload_settings_image(file: UploadFile = File(...), _: bool = Depends(require_admin)):
    """Tải ảnh từ thư viện máy lên — dùng cho ảnh nền Chat / ảnh nền từng
    mục trong Cài đặt (dùng chung storage bucket với ảnh sự kiện)."""
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Chỉ chấp nhận ảnh JPEG, PNG, WEBP hoặc GIF")
    content = await file.read()
    if len(content) > 6 * 1024 * 1024:
        raise HTTPException(400, "Ảnh tối đa 6MB")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    path = f"banners/{uuid.uuid4().hex}.{ext}"
    sb = get_supabase()
    try:
        sb.storage.from_("event-rewards").upload(path, content, {"content-type": file.content_type})
    except Exception as e:
        raise HTTPException(500, f"Lỗi tải ảnh lên: {str(e)}")
    public_url = sb.storage.from_("event-rewards").get_public_url(path)
    return {"url": public_url}


@router.get("/verify-token")
async def verify_token(_: bool = Depends(require_admin)):
    """Kiểm tra token admin hiện tại còn hợp lệ không — dùng lúc mở trang để
    tự đăng xuất nếu ADMIN_PASSWORD đã bị đổi (token cũ ký bằng mật khẩu cũ
    sẽ không khớp chữ ký nữa, tự động vô hiệu, không cần lưu blacklist)."""
    return {"ok": True}

@router.post("/cleanup-stats-now")
async def cleanup_stats_now(_: bool = Depends(require_admin)):
    """Xoá ngay dữ liệu thống kê tích luỹ (lượt tham chiến war, lịch sử
    donate) theo số ngày cấu hình ở stats_retention_days — dùng khi admin
    bấm nút 'Xoá ngay' thay vì đợi job chạy tự động."""
    from schedulers.poller import poll_stats_cleanup
    await poll_stats_cleanup()
    return {"ok": True}

@router.get("/public")
async def get_public_settings():
    """Vài cấu hình hiển thị KHÔNG nhạy cảm (vd ảnh nền chat, ẩn/hiện thẻ ở
    Tổng quan) — cho mọi người xem được, không cần đăng nhập admin (khác
    với GET / ở trên)."""
    sb = get_supabase()
    keys = ["chat_background_image", "overview_show_war", "overview_show_cwl", "overview_show_capital", "ember_color", "page_banners"]
    try:
        res = sb.table("settings").select("key,value").in_("key", keys).execute()
        return {row["key"]: row["value"] for row in res.data}
    except Exception:
        return {}

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
            return {"ok": True, "clan_name": data.get("name"), "members": data.get("members"),
                    "tag": data.get("tag"), "badgeUrls": data.get("badgeUrls") or {}}
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


@router.post("/clear-cache")
async def clear_cache():
    """Xoá cache tạm CWL trong bộ nhớ server — ai cũng bấm được (không cần
    admin) vì đây là thao tác an toàn, không đụng tới dữ liệu thật, chỉ ép
    tải lại từ CoC API thay vì đợi tối đa 3 phút để tự hết hạn."""
    from services.coc_api import clear_cwl_caches
    n = clear_cwl_caches()
    return {"ok": True, "cleared": n}


@router.post("/test-notify-sample")
async def test_notify_sample(request: Request, _: bool = Depends(require_admin)):
    """Gửi thử 2 loại thông báo mới (Donate nhận Coins / War nhận Coins) qua
    đúng kênh Discord/Telegram đã lưu của clan đang chọn — để admin xem có
    hoạt động không mà không cần đợi có donate/war thật."""
    clan_id = get_clan_id(request)
    try:
        await notify_donate_coins("Ví dụ - Thành Viên A", 5, 120, 5, clan_id=clan_id)
        await notify_war_coins("Ví dụ - Thành Viên B", 3, 300, clan_id=clan_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/telegram-detect-chats")
async def telegram_detect_chats(request: Request, _: bool = Depends(require_admin)):
    """Tự tìm Chat ID thay vì bắt admin tự vào trình duyệt gõ URL getUpdates
    thủ công — đọc các tin nhắn gần nhất bot nhận được, trả về danh sách
    nhóm/kênh/phiên chat kèm tên để admin chọn đúng cái mình cần."""
    body = await request.json()
    token = (body.get("bot_token") or "").strip()
    if not token:
        raise HTTPException(400, "Cần dán Bot Token vào ô Bot Token trước")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"https://api.telegram.org/bot{token}/getUpdates")
        data = r.json()
    except Exception as e:
        raise HTTPException(500, f"Không gọi được Telegram: {str(e)}")
    if not data.get("ok"):
        raise HTTPException(400, data.get("description", "Bot Token không hợp lệ"))

    seen: dict[str, dict] = {}
    for update in data.get("result", []):
        msg = update.get("message") or update.get("channel_post") or update.get("my_chat_member", {}).get("chat")
        chat = msg.get("chat") if isinstance(msg, dict) and "chat" in msg else msg
        if not chat or "id" not in chat:
            continue
        cid = str(chat["id"])
        name = chat.get("title") or " ".join(filter(None, [chat.get("first_name"), chat.get("last_name")])) or chat.get("username") or cid
        seen[cid] = {"chat_id": cid, "name": name, "type": chat.get("type", "?")}

    if not seen:
        return {
            "chats": [],
            "hint": "Chưa thấy tin nhắn nào — hãy gửi 1 tin bất kỳ cho bot (hoặc trong group đã thêm bot) rồi bấm lại nút này.",
        }
    return {"chats": list(seen.values())}
