"""
Web Push — gửi thông báo trình duyệt/PWA ra NGOÀI app (kể cả khi tắt app),
dùng chuẩn Web Push + VAPID (không cần Firebase).

Cần 2 biến môi trường trên backend:
  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  (tạo bằng: `vapid --gen` của pywebpush,
  hoặc web-push-codelab.glitch.me) và VAPID_SUBJECT (mailto:you@example.com).

Nếu chưa cấu hình VAPID, mọi hàm ở đây sẽ tự bỏ qua (không lỗi, không gửi)
để không chặn các tính năng khác (chat/sự kiện vẫn hoạt động bình thường).
"""
import os
import json
import logging
from supabase_client import get_supabase

log = logging.getLogger("push")

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com")


def push_enabled() -> bool:
    return bool(VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY and _looks_like_raw_key(VAPID_PUBLIC_KEY))


def _looks_like_raw_key(key: str) -> bool:
    """VAPID key phải là 1 chuỗi base64url gọn (không phải PEM có
    -----BEGIN-----/xuống dòng) — nếu dán nhầm PEM vào thì báo sai định dạng
    thay vì để trình duyệt vỡ lỗi atob() khó hiểu."""
    return "-----BEGIN" not in key and "\n" not in key.strip()


def _send_one(sub: dict, payload: dict) -> bool:
    """Gửi 1 push tới 1 subscription. Trả về False nếu subscription đã hết hạn
    (410/404) để caller có thể tự xoá khỏi DB."""
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        log.warning("pywebpush chưa được cài (pip install pywebpush)")
        return True

    try:
        webpush(
            subscription_info={
                "endpoint": sub["endpoint"],
                "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
            },
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
        )
        return True
    except Exception as e:
        code = getattr(getattr(e, "response", None), "status_code", None)
        if code in (404, 410):
            return False  # subscription hết hạn — caller sẽ dọn
        log.error(f"push error: {e}")
        return True  # lỗi tạm thời khác — giữ lại subscription


async def send_push_to_clan(
    clan_id: int,
    title: str,
    body: str,
    url: str = "/",
    kind: str = "chat",  # "chat" | "event" — khớp cột notify_chat/notify_event
    exclude_tag: str | None = None,
):
    """Gửi push cho mọi subscription của 1 clan (đã bật loại thông báo tương ứng)."""
    if not push_enabled():
        return
    sb = get_supabase()
    col = "notify_chat" if kind == "chat" else "notify_event"
    try:
        q = sb.table("push_subscriptions").select("*").eq("clan_id", clan_id).eq(col, True)
        res = q.execute()
    except Exception as e:
        log.error(f"send_push_to_clan query error: {e}")
        return

    stale_ids = []
    for sub in (res.data or []):
        if exclude_tag and sub.get("player_tag") == exclude_tag:
            continue
        ok = _send_one(sub, {"title": title, "body": body, "url": url})
        if not ok:
            stale_ids.append(sub["id"])

    if stale_ids:
        try:
            sb.table("push_subscriptions").delete().in_("id", stale_ids).execute()
        except Exception:
            pass


async def send_push_global(title: str, body: str, url: str = "/", exclude_tag: str | None = None):
    """Gửi push liên clan (dùng cho Chat Toàn Cầu) — mọi subscription đã bật notify_chat."""
    if not push_enabled():
        return
    sb = get_supabase()
    try:
        res = sb.table("push_subscriptions").select("*").eq("notify_chat", True).execute()
    except Exception as e:
        log.error(f"send_push_global query error: {e}")
        return

    stale_ids = []
    for sub in (res.data or []):
        if exclude_tag and sub.get("player_tag") == exclude_tag:
            continue
        ok = _send_one(sub, {"title": title, "body": body, "url": url})
        if not ok:
            stale_ids.append(sub["id"])

    if stale_ids:
        try:
            sb.table("push_subscriptions").delete().in_("id", stale_ids).execute()
        except Exception:
            pass
