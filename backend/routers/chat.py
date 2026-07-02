"""
Chat — 2 phòng:
  - 'clan': chỉ thành viên đã đăng nhập (claim danh tính) mới chat được,
            tin nhắn gắn tên thật + tag người chơi, giới hạn trong clan đang chọn.
  - 'global': chat LIÊN CLAN — thành viên bất kỳ clan nào cũng chat được với
            nhau. Nếu đăng nhập (X-Member-Token) thì tin nhắn gắn kèm huy hiệu
            hội (clan), TH, lâu đài + pháo đang trang bị; nếu không đăng nhập,
            vẫn cho chat với tên khách tạm (không có huy hiệu).

Dùng polling REST (không websocket) để đơn giản và ổn định trên hosting free
(free tier hay bị sleep, không phù hợp giữ kết nối websocket lâu dài).
"""
from fastapi import APIRouter, HTTPException, Request, Header, UploadFile, File, BackgroundTasks
from supabase_client import get_supabase
from clan_context import get_clan_id
from member_auth import verify_member_token
from services.push_service import send_push_to_clan, send_push_global
import uuid

router = APIRouter()

MAX_MSG_LEN = 1000


async def _sender_flair(sb, player_tag: str) -> dict:
    """Lấy huy hiệu hội (clan), TH, lâu đài + pháo đang trang bị của 1 thành
    viên đã đăng nhập — chụp lại tại thời điểm gửi tin (denormalized) để tin
    nhắn cũ vẫn hiển thị đúng ngay cả khi họ đổi trang bị/đổi clan sau này."""
    acc = sb.table("member_accounts").select(
        "player_name, clan_id, equipped_castle, equipped_cannon, equipped_effect, equipped_number_effect"
    ).eq("player_tag", player_tag).execute()
    if not acc.data:
        return {}
    a = acc.data[0]
    clan_id = a.get("clan_id") or 1
    clan_name = None
    clan_badge = None
    try:
        c = sb.table("clans").select("clan_name").eq("id", clan_id).execute()
        if c.data:
            clan_name = c.data[0].get("clan_name")
    except Exception:
        pass
    try:
        snap = sb.table("snapshot_clan").select("data").eq("clan_id", clan_id).order("id", desc=True).limit(1).execute()
        if snap.data:
            import json as _json
            data = _json.loads(snap.data[0]["data"])
            clan_badge = (data.get("badgeUrls") or {}).get("small") or (data.get("badgeUrls") or {}).get("medium")
            if data.get("name"):
                clan_name = data["name"]
    except Exception:
        pass
    th = 0
    try:
        log_res = sb.table("member_log").select("th_level").eq("player_tag", player_tag).order("id", desc=True).limit(1).execute()
        if log_res.data:
            th = log_res.data[0].get("th_level") or 0
    except Exception:
        pass
    return {
        "sender_name": a.get("player_name"),
        "sender_clan_id": clan_id,
        "sender_clan_name": clan_name,
        "sender_clan_badge": clan_badge,
        "sender_th": th,
        "sender_castle": a.get("equipped_castle") or "castle_classic",
        "sender_cannon": a.get("equipped_cannon") or "cannon_basic",
        "sender_effect": a.get("equipped_effect"),
        "sender_number_effect": a.get("equipped_number_effect"),
    }


@router.get("/messages")
async def get_messages(request: Request, room: str = "global", after_id: int = 0, limit: int = 50):
    if room not in ("clan", "global"):
        raise HTTPException(400, "room không hợp lệ")
    sb = get_supabase()
    clan_id = get_clan_id(request)
    if after_id:
        q = sb.table("chat_messages").select("*").eq("room", room)
        if room == "clan": q = q.eq("clan_id", clan_id)
        q = q.gt("id", after_id).order("id").limit(limit)
        res = q.execute()
    else:
        q = sb.table("chat_messages").select("*").eq("room", room)
        if room == "clan": q = q.eq("clan_id", clan_id)
        q = q.order("id", desc=True).limit(limit)
        res = q.execute()
        res.data = list(reversed(res.data or []))
    return res.data


@router.post("/messages")
async def send_message(request: Request, background_tasks: BackgroundTasks, x_member_token: str | None = Header(default=None)):
    body = await request.json()
    room = body.get("room", "global")
    message = (body.get("message") or "").strip()
    image_url = body.get("image_url") or None
    display_name = (body.get("sender_name") or "").strip()

    if room not in ("clan", "global"):
        raise HTTPException(400, "room không hợp lệ")
    if not message and not image_url:
        raise HTTPException(400, "Tin nhắn trống")
    if len(message) > MAX_MSG_LEN:
        raise HTTPException(400, f"Tin nhắn tối đa {MAX_MSG_LEN} ký tự")

    sb = get_supabase()
    sender_tag = None
    sender_name = display_name or "Khách"
    flair: dict = {}

    if room == "clan":
        sender_tag = verify_member_token(x_member_token)
        if not sender_tag:
            raise HTTPException(401, "Cần đăng nhập thành viên để chat trong clan")
        flair = await _sender_flair(sb, sender_tag)
        sender_name = flair.get("sender_name") or "Thành viên"
    else:
        # Chat Toàn Cầu (liên clan): đăng nhập thì gắn huy hiệu clan/TH/lâu đài/pháo,
        # chưa đăng nhập thì vẫn cho chat với tên khách tạm.
        maybe_tag = verify_member_token(x_member_token)
        if maybe_tag:
            sender_tag = maybe_tag
            flair = await _sender_flair(sb, sender_tag)
            sender_name = flair.get("sender_name") or sender_name
        else:
            sender_name = sender_name[:30] or "Khách"

    row = {
        "room": room, "sender_name": sender_name, "sender_tag": sender_tag,
        "message": message, "image_url": image_url, "is_system": False,
        "sender_clan_id": flair.get("sender_clan_id"),
        "sender_clan_name": flair.get("sender_clan_name"),
        "sender_clan_badge": flair.get("sender_clan_badge"),
        "sender_th": flair.get("sender_th"),
        "sender_castle": flair.get("sender_castle"),
        "sender_cannon": flair.get("sender_cannon"),
        "sender_effect": flair.get("sender_effect"),
        "sender_number_effect": flair.get("sender_number_effect"),
    }
    if room == "clan":
        row["clan_id"] = get_clan_id(request)
    try:
        res = sb.table("chat_messages").insert(row).execute()
    except Exception:
        # Cột sender_clan_id/... chưa tồn tại (chưa chạy migration) — bỏ các
        # cột mới, gửi tin nhắn theo kiểu cũ để không chặn chat.
        basic_row = {k: v for k, v in row.items() if k in (
            "room", "sender_name", "sender_tag", "message", "image_url", "is_system", "clan_id")}
        res = sb.table("chat_messages").insert(basic_row).execute()

    # Thông báo đẩy (ngoài app) — chạy nền, không chặn phản hồi chat.
    preview = message[:80] if message else ("[Hình ảnh]" if image_url else "")
    if room == "clan":
        background_tasks.add_task(
            send_push_to_clan, row.get("clan_id", get_clan_id(request)),
            f"💬 {sender_name}", preview, "/chat", "chat", sender_tag,
        )
    else:
        background_tasks.add_task(
            send_push_global, f"🌐 {sender_name}", preview, "/chat", sender_tag,
        )

    return res.data[0]


@router.post("/upload-image")
async def upload_chat_image(file: UploadFile = File(...)):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Chỉ chấp nhận ảnh JPEG, PNG, WEBP, GIF")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "Ảnh tối đa 5MB")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    path = f"{uuid.uuid4().hex}.{ext}"
    sb = get_supabase()
    try:
        sb.storage.from_("chat-images").upload(path, content, {"content-type": file.content_type})
    except Exception as e:
        raise HTTPException(500, f"Lỗi tải ảnh lên: {str(e)}")
    url = sb.storage.from_("chat-images").get_public_url(path)
    return {"url": url}
