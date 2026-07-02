"""
Quản lý nhạc nền: upload nhiều bài, chọn chế độ phát (tất cả / 1 bài chỉ định).
Endpoint /config và /tracks là public (ai vào web cũng nghe được nhạc),
chỉ upload/xoá/đổi cấu hình mới cần admin.
"""
from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from supabase_client import get_supabase
from auth import require_admin
import uuid

router = APIRouter()

MUSIC_KEYS = ["music_enabled", "music_mode", "music_selected_id"]
MAX_SIZE = 20 * 1024 * 1024  # 20MB mỗi bài


@router.get("/tracks")
async def list_tracks():
    sb = get_supabase()
    try:
        res = sb.table("soundtracks").select("*").order("sort_order", nullsfirst=False).order("created_at").execute()
    except Exception:
        # Cột sort_order chưa tồn tại (chưa chạy migration) — fallback thứ tự cũ
        res = sb.table("soundtracks").select("*").order("created_at").execute()
    return res.data


@router.put("/tracks/reorder")
async def reorder_tracks(request: Request, _: bool = Depends(require_admin)):
    """Lưu lại thứ tự phát nhạc sau khi kéo-thả sắp xếp trong Cài đặt."""
    body = await request.json()
    ids = body.get("order") or []
    if not isinstance(ids, list) or not ids:
        raise HTTPException(400, "Cần danh sách order (mảng id bài hát theo thứ tự mới)")
    sb = get_supabase()
    try:
        for i, track_id in enumerate(ids):
            sb.table("soundtracks").update({"sort_order": i}).eq("id", track_id).execute()
    except Exception as e:
        raise HTTPException(500, f"Chưa chạy migration cột sort_order: {str(e)}")
    return {"ok": True}


@router.post("/tracks")
async def upload_track(
    file: UploadFile = File(...),
    title: str = "",
    _: bool = Depends(require_admin),
):
    allowed = {"audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/x-m4a", "audio/mp4", "audio/aac"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Chỉ chấp nhận file nhạc MP3, WAV, OGG, M4A, AAC")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File nhạc tối đa 20MB")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "mp3"
    path = f"{uuid.uuid4().hex}.{ext}"
    sb = get_supabase()
    try:
        sb.storage.from_("soundtracks").upload(path, content, {"content-type": file.content_type})
    except Exception as e:
        raise HTTPException(500, f"Lỗi tải nhạc lên: {str(e)}")
    public_url = sb.storage.from_("soundtracks").get_public_url(path)
    track_title = title.strip() or (file.filename or "Untitled").rsplit(".", 1)[0]
    res = sb.table("soundtracks").insert({
        "title": track_title, "file_url": public_url, "storage_path": path
    }).execute()
    return res.data[0]


@router.delete("/tracks/{track_id}")
async def delete_track(track_id: int, _: bool = Depends(require_admin)):
    sb = get_supabase()
    row = sb.table("soundtracks").select("storage_path").eq("id", track_id).single().execute()
    if not row.data:
        raise HTTPException(404, "Không tìm thấy bài hát")
    try:
        sb.storage.from_("soundtracks").remove([row.data["storage_path"]])
    except Exception:
        pass
    sb.table("soundtracks").delete().eq("id", track_id).execute()
    return {"ok": True}


@router.get("/config")
async def get_config():
    sb = get_supabase()
    res = sb.table("settings").select("key,value").in_("key", MUSIC_KEYS).execute()
    cfg = {row["key"]: row["value"] for row in res.data}
    enabled = cfg.get("music_enabled", "false") == "true"
    mode = cfg.get("music_mode", "all")
    selected_id = cfg.get("music_selected_id", "")
    return {"enabled": enabled, "mode": mode, "selected_id": selected_id}


@router.post("/config")
async def update_config(request: Request, _: bool = Depends(require_admin)):
    body = await request.json()
    sb = get_supabase()
    rows = []
    if "enabled" in body:
        rows.append({"key": "music_enabled", "value": "true" if body["enabled"] else "false"})
    if "mode" in body:
        if body["mode"] not in ("all", "single"):
            raise HTTPException(400, "mode không hợp lệ")
        rows.append({"key": "music_mode", "value": body["mode"]})
    if "selected_id" in body:
        rows.append({"key": "music_selected_id", "value": str(body["selected_id"] or "")})
    if rows:
        sb.table("settings").upsert(rows).execute()
    return {"ok": True}
