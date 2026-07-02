"""
Quản lý nhiều clan — tạo/sửa/xoá clan, lấy danh sách.
Mỗi clan có admin_token riêng để xác thực.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from supabase_client import get_supabase
from auth import require_admin
import secrets
import json

router = APIRouter()


# ─── List all clans ───────────────────────────────────────────────────────────

@router.get("/")
async def list_clans():
    """Danh sách clan (id, tên, tag, cờ) — công khai cho MỌI người dùng (không
    chỉ admin) vì đây chỉ là để hiển thị/chuyển đổi giữa các clan, không lộ
    thông tin nhạy cảm (admin_token, API key... vẫn chỉ admin xem được qua
    GET /{clan_id})."""
    sb = get_supabase()
    res = sb.table("clans").select("id, clan_tag, clan_name, created_at").order("id").execute()
    clans = res.data or []

    # Gắn thêm cờ/huy hiệu + tên thật (lấy từ snapshot cache của từng clan,
    # không gọi CoC API trực tiếp ở đây để tránh chậm/rate-limit) — fallback
    # về clan_name đã lưu nếu chưa có snapshot.
    for c in clans:
        c["badge_url"] = None
        try:
            snap = sb.table("snapshot_clan").select("data").eq("clan_id", c["id"]).order("id", desc=True).limit(1).execute()
        except Exception:
            snap = sb.table("snapshot_clan").select("data").order("id", desc=True).limit(1).execute() if c["id"] == 1 else None
        if snap and snap.data:
            try:
                data = json.loads(snap.data[0]["data"])
                c["badge_url"] = (data.get("badgeUrls") or {}).get("small") or (data.get("badgeUrls") or {}).get("medium")
                if data.get("name"):
                    c["clan_name"] = data["name"]
            except Exception:
                pass

    return clans


# ─── Create clan ──────────────────────────────────────────────────────────────

@router.post("/")
async def create_clan(request: Request, _: bool = Depends(require_admin)):
    body = await request.json()
    clan_tag = (body.get("clan_tag") or "").strip().upper()
    if not clan_tag:
        raise HTTPException(400, "Cần clan_tag")
    if not clan_tag.startswith("#"):
        clan_tag = "#" + clan_tag

    sb = get_supabase()
    row = {
        "clan_tag":          clan_tag,
        "clan_name":         body.get("clan_name", "Clan mới"),
        "admin_token":       secrets.token_hex(24),
        "coc_api_key":       body.get("coc_api_key", ""),
        "discord_webhook":   body.get("discord_webhook", ""),
        "telegram_bot_token": body.get("telegram_bot_token", ""),
        "telegram_chat_id":  body.get("telegram_chat_id", ""),
    }
    try:
        res = sb.table("clans").insert(row).execute()
    except Exception as e:
        raise HTTPException(400, f"Clan tag đã tồn tại hoặc lỗi: {str(e)}")
    return res.data[0]


# ─── Get / Update clan ────────────────────────────────────────────────────────

@router.get("/{clan_id}")
async def get_clan(clan_id: int, _: bool = Depends(require_admin)):
    sb = get_supabase()
    res = sb.table("clans").select("*").eq("id", clan_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy clan")
    return res.data[0]


@router.put("/{clan_id}")
async def update_clan(clan_id: int, request: Request, _: bool = Depends(require_admin)):
    body = await request.json()
    allowed = ["clan_name", "coc_api_key", "discord_webhook",
               "telegram_bot_token", "telegram_chat_id",
               "notify_war", "notify_raid", "notify_join_leave"]
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        raise HTTPException(400, "Không có gì để cập nhật")
    sb = get_supabase()
    res = sb.table("clans").update(update).eq("id", clan_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy clan")
    return res.data[0]


@router.delete("/{clan_id}")
async def delete_clan(clan_id: int, _: bool = Depends(require_admin)):
    if clan_id == 1:
        raise HTTPException(400, "Không thể xoá clan chính (id=1)")
    sb = get_supabase()
    sb.table("clans").delete().eq("id", clan_id).execute()
    return {"ok": True}


# ─── Regenerate admin token ───────────────────────────────────────────────────

@router.post("/{clan_id}/regen-token")
async def regen_token(clan_id: int, _: bool = Depends(require_admin)):
    sb = get_supabase()
    new_token = secrets.token_hex(24)
    sb.table("clans").update({"admin_token": new_token}).eq("id", clan_id).execute()
    return {"admin_token": new_token}
