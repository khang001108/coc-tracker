"""
Chat — 2 phòng:
  - 'clan': chỉ thành viên đã đăng nhập (claim danh tính) mới chat được,
            tin nhắn gắn tên thật + tag người chơi.
  - 'global': ai cũng chat được, chỉ cần đặt tên hiển thị tạm (không cần đăng nhập).

Dùng polling REST (không websocket) để đơn giản và ổn định trên hosting free
(free tier hay bị sleep, không phù hợp giữ kết nối websocket lâu dài).
"""
from fastapi import APIRouter, HTTPException, Request, Header, UploadFile, File
from supabase_client import get_supabase
from member_auth import verify_member_token
import uuid

router = APIRouter()

MAX_MSG_LEN = 1000


@router.get("/messages")
async def get_messages(room: str = "global", after_id: int = 0, limit: int = 50):
    if room not in ("clan", "global"):
        raise HTTPException(400, "room không hợp lệ")
    sb = get_supabase()
    if after_id:
        # Poll: lấy tin mới hơn after_id, thứ tự tăng dần
        q = sb.table("chat_messages").select("*").eq("room", room).gt("id", after_id).order("id").limit(limit)
        res = q.execute()
    else:
        # Initial load: lấy 50 tin MỚI NHẤT rồi đảo thứ tự tăng dần để hiển thị
        q = sb.table("chat_messages").select("*").eq("room", room).order("id", desc=True).limit(limit)
        res = q.execute()
        res.data = list(reversed(res.data or []))
    return res.data


@router.post("/messages")
async def send_message(request: Request, x_member_token: str | None = Header(default=None)):
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

    if room == "clan":
        sender_tag = verify_member_token(x_member_token)
        if not sender_tag:
            raise HTTPException(401, "Cần đăng nhập thành viên để chat trong clan")
        acc = sb.table("member_accounts").select("player_name").eq("player_tag", sender_tag).execute()
        sender_name = acc.data[0]["player_name"] if acc.data else "Thành viên"
    else:
        sender_name = sender_name[:30] or "Khách"

    row = {
        "room": room, "sender_name": sender_name, "sender_tag": sender_tag,
        "message": message, "image_url": image_url, "is_system": False,
    }
    res = sb.table("chat_messages").insert(row).execute()
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
