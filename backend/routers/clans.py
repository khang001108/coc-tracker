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
    try:
        res = sb.table("clans").select("id, clan_tag, clan_name, created_at, public_editable").order("id").execute()
    except Exception:
        res = sb.table("clans").select("id, clan_tag, clan_name, created_at").order("id").execute()
    clans = res.data or []

    # Gắn thêm cờ/huy hiệu + tên thật (ưu tiên lấy từ snapshot cache cho
    # nhanh; nếu clan vừa mới thêm — chưa có snapshot lần nào — thì gọi
    # thẳng CoC API 1 lần để có ngay, khỏi phải đợi tới chu kỳ poll tiếp theo).
    for c in clans:
        c["badge_url"] = None
        data = None
        try:
            snap = sb.table("snapshot_clan").select("data").eq("clan_id", c["id"]).order("id", desc=True).limit(1).execute()
        except Exception:
            snap = sb.table("snapshot_clan").select("data").order("id", desc=True).limit(1).execute() if c["id"] == 1 else None
        if snap and snap.data:
            try:
                data = json.loads(snap.data[0]["data"])
            except Exception:
                data = None
        if not data and c.get("clan_tag"):
            try:
                from services.coc_api import get_clan as fetch_clan_live
                data = await fetch_clan_live(c["clan_tag"], clan_id=c["id"])
            except Exception:
                data = None
        if data:
            c["badge_url"] = (data.get("badgeUrls") or {}).get("small") or (data.get("badgeUrls") or {}).get("medium")
            if data.get("name"):
                c["clan_name"] = data["name"]

    return clans


# ─── Create clan ──────────────────────────────────────────────────────────────

@router.get("/public-slot")
async def public_slot():
    """Clan nao dang duoc admin danh dau 'cong khai cho phep doi Tag' (neu
    co) -- tra ve Tag/ten/co hien tai, KHONG tra ve API Key. Nguoi ngoai chi
    doi duoc Tag cua dung clan nay (dung lai API Key da cau hinh san), khong
    tao clan moi."""
    sb = get_supabase()
    res = sb.table("clans").select("id, clan_tag, clan_name").eq("public_editable", True).limit(1).execute()
    if not res.data:
        return {"enabled": False}
    row = res.data[0]
    badge_url = None
    try:
        snap = sb.table("snapshot_clan").select("data").eq("clan_id", row["id"]).order("id", desc=True).limit(1).execute()
        if snap.data:
            badge_url = json.loads(snap.data[0]["data"]).get("badgeUrls", {}).get("medium")
    except Exception:
        pass
    return {"enabled": True, "clan_id": row["id"], "clan_tag": row["clan_tag"], "clan_name": row["clan_name"], "badge_url": badge_url}


@router.post("/public-slot/update")
async def public_slot_update(request: Request):
    """Nguoi dung thuong doi Tag cua dung clan da duoc admin danh dau cong
    khai -- dung lai API Key da luu san cua clan do (khong lo ra ngoai), tu
    kiem tra ket noi truoc khi luu."""
    sb = get_supabase()
    slot = sb.table("clans").select("id, coc_api_key").eq("public_editable", True).limit(1).execute()
    if not slot.data:
        raise HTTPException(403, "Admin chua bat clan nao cho phep doi Tag cong khai")
    clan_id = slot.data[0]["id"]
    api_key = slot.data[0].get("coc_api_key") or ""
    if not api_key:
        raise HTTPException(400, "Clan nay chua duoc admin gan API Key - bao admin truoc")

    body = await request.json()
    clan_tag = (body.get("clan_tag") or "").strip().upper()
    if not clan_tag:
        raise HTTPException(400, "Can nhap Tag clan")
    if not clan_tag.startswith("#"):
        clan_tag = "#" + clan_tag

    from services.coc_api import get_clan as fetch_clan_live
    try:
        live = await fetch_clan_live(clan_tag, clan_id=clan_id)
    except Exception as e:
        raise HTTPException(400, f"Khong ket noi duoc voi Tag nay (kiem tra lai Tag, hoac bao admin kiem tra API Key): {str(e)}")

    sb.table("clans").update({"clan_tag": clan_tag, "clan_name": live.get("name", "Clan moi")}).eq("id", clan_id).execute()
    try:
        sb.table("snapshot_clan").delete().eq("clan_id", clan_id).execute()
        sb.table("snapshot_war").delete().eq("clan_id", clan_id).execute()
        sb.table("snapshot_raid").delete().eq("clan_id", clan_id).execute()
    except Exception:
        pass
    from schedulers.poller import upsert_snapshot
    upsert_snapshot("snapshot_clan", live, clan_id=clan_id)

    return {"ok": True, "clan_name": live.get("name"), "badge_url": (live.get("badgeUrls") or {}).get("medium")}


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

    created = res.data[0]
    # Lấy ngay dữ liệu clan (tên thật, cờ/huy hiệu...) để cache lại — khỏi
    # phải đợi tới chu kỳ poll nền tiếp theo (tối đa 15 phút) mới có.
    try:
        from services.coc_api import get_clan as fetch_clan_live
        from schedulers.poller import upsert_snapshot
        live = await fetch_clan_live(clan_tag, clan_id=created["id"])
        upsert_snapshot("snapshot_clan", live, clan_id=created["id"])
    except Exception:
        pass  # không sao — list_clans() vẫn tự fallback gọi live nếu cache trống

    return created


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
    allowed = ["clan_name", "clan_tag", "coc_api_key", "discord_webhook",
               "telegram_bot_token", "telegram_chat_id",
               "notify_war", "notify_raid", "notify_join_leave", "public_editable"]
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        raise HTTPException(400, "Không có gì để cập nhật")

    if "clan_tag" in update:
        tag = (update["clan_tag"] or "").strip().upper()
        if not tag:
            raise HTTPException(400, "Clan Tag không được để trống")
        if not tag.startswith("#"):
            tag = "#" + tag
        update["clan_tag"] = tag

    sb = get_supabase()
    # Chỉ 1 clan được đánh dấu "công khai đổi Tag" tại 1 thời điểm — tick clan
    # này thì tự bỏ tick clan khác (giống radio button).
    if update.get("public_editable") is True:
        try:
            sb.table("clans").update({"public_editable": False}).neq("id", clan_id).execute()
        except Exception:
            pass

    try:
        res = sb.table("clans").update(update).eq("id", clan_id).execute()
    except Exception as e:
        raise HTTPException(400, f"Clan Tag đã được dùng cho clan khác hoặc lỗi: {str(e)}")
    if not res.data:
        raise HTTPException(404, "Không tìm thấy clan")

    # Đổi tag = đổi sang 1 clan CoC khác hẳn — xoá cache cũ (snapshot/tracker)
    # để không hiện lẫn dữ liệu clan trước đó, rồi lấy lại dữ liệu mới ngay.
    if "clan_tag" in update:
        try:
            sb.table("snapshot_clan").delete().eq("clan_id", clan_id).execute()
            sb.table("snapshot_war").delete().eq("clan_id", clan_id).execute()
            sb.table("snapshot_raid").delete().eq("clan_id", clan_id).execute()
        except Exception:
            pass
        try:
            from services.coc_api import get_clan as fetch_clan_live
            from schedulers.poller import upsert_snapshot
            live = await fetch_clan_live(update["clan_tag"], clan_id=clan_id)
            upsert_snapshot("snapshot_clan", live, clan_id=clan_id)
        except Exception:
            pass

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
