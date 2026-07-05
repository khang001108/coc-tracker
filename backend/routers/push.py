"""
Đăng ký/huỷ nhận thông báo đẩy (Web Push) — thành viên bất kỳ (kể cả chưa
đăng nhập, chỉ là khách xem app) đều có thể bật, không cần quyền admin,
vì đây là lựa chọn của từng trình duyệt/thiết bị, không phải cấu hình clan.
"""
from fastapi import APIRouter, HTTPException, Request, Header
from supabase_client import get_supabase
from clan_context import get_clan_id
from member_auth import verify_member_token
from services.push_service import VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, push_enabled, _looks_like_raw_key

router = APIRouter()


@router.get("/vapid-public-key")
async def vapid_public_key():
    reason = None
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
        reason = "Server chưa cấu hình VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY"
    elif not _looks_like_raw_key(VAPID_PUBLIC_KEY):
        reason = "VAPID_PUBLIC_KEY đang ở sai định dạng (PEM) — cần chuỗi base64url gọn, xem lại hướng dẫn"
    return {"key": VAPID_PUBLIC_KEY, "enabled": push_enabled(), "reason": reason}


@router.get("/my-subscription")
async def my_subscription(endpoint: str):
    """Lấy lại đúng cấu hình đã lưu (loại thông báo + clan đã chọn) của 1
    subscription — để hiện lại đúng trạng thái khi tải lại trang, thay vì
    web tưởng nhầm về mặc định ban đầu (đây là lỗi đã gặp: tick chọn clan
    xong tải lại trang bị mất tick vì trước đó không có cách đọc lại)."""
    sb = get_supabase()
    res = sb.table("push_subscriptions").select("notify_chat,notify_event,notify_war,notify_raid,clan_ids,clan_id").eq("endpoint", endpoint).execute()
    if not res.data:
        return None
    return res.data[0]


@router.post("/subscribe")
async def subscribe(
    request: Request,
    x_member_token: str | None = Header(default=None),
):
    body = await request.json()
    sub = body.get("subscription") or {}
    endpoint = sub.get("endpoint")
    keys = sub.get("keys") or {}
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")
    if not endpoint or not p256dh or not auth:
        raise HTTPException(400, "Subscription không hợp lệ")

    clan_id = get_clan_id(request)
    player_tag = verify_member_token(x_member_token)
    clan_ids = body.get("clan_ids")  # danh sách clan muốn nhận thông báo — None = mặc định đúng clan đang xem
    if not clan_ids:
        clan_ids = [clan_id]

    row = {
        "endpoint": endpoint,
        "p256dh": p256dh,
        "auth": auth,
        "clan_id": clan_id,
        "clan_ids": clan_ids,
        "player_tag": player_tag,
        "notify_chat": bool(body.get("notify_chat", True)),
        "notify_event": bool(body.get("notify_event", True)),
        "notify_war": bool(body.get("notify_war", True)),
        "notify_raid": bool(body.get("notify_raid", True)),
    }
    sb = get_supabase()
    try:
        sb.table("push_subscriptions").upsert(row, on_conflict="endpoint").execute()
    except Exception:
        # Chưa chạy đủ migration (thiếu cột notify_war/notify_raid/clan_ids) —
        # thử lại bỏ dần các cột mới để không chặn hẳn tính năng push.
        row.pop("clan_ids", None)
        try:
            sb.table("push_subscriptions").upsert(row, on_conflict="endpoint").execute()
        except Exception:
            row.pop("notify_war", None)
            row.pop("notify_raid", None)
            try:
                sb.table("push_subscriptions").upsert(row, on_conflict="endpoint").execute()
            except Exception as e:
                raise HTTPException(500, f"Lỗi lưu đăng ký thông báo: {str(e)}")
    return {"ok": True}


@router.post("/unsubscribe")
async def unsubscribe(request: Request):
    body = await request.json()
    endpoint = body.get("endpoint")
    if not endpoint:
        raise HTTPException(400, "Cần endpoint")
    sb = get_supabase()
    sb.table("push_subscriptions").delete().eq("endpoint", endpoint).execute()
    return {"ok": True}


@router.put("/preferences")
async def update_preferences(request: Request):
    """Bật/tắt riêng từng loại thông báo, và/hoặc đổi danh sách clan muốn
    nhận thông báo, cho 1 subscription."""
    body = await request.json()
    endpoint = body.get("endpoint")
    if not endpoint:
        raise HTTPException(400, "Cần endpoint")
    update = {k: v for k, v in body.items() if k in ("notify_chat", "notify_event", "notify_war", "notify_raid", "clan_ids")}
    if not update:
        raise HTTPException(400, "Không có gì để cập nhật")
    sb = get_supabase()
    try:
        sb.table("push_subscriptions").update(update).eq("endpoint", endpoint).execute()
    except Exception:
        update.pop("clan_ids", None)
        sb.table("push_subscriptions").update(update).eq("endpoint", endpoint).execute()
    return {"ok": True}
