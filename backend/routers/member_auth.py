from fastapi import APIRouter, HTTPException, Request, Header, Depends
from supabase_client import get_supabase
from member_auth import hash_pin, create_member_token, verify_member_token
from services.coc_api import get_clan_members_resilient
from clan_context import get_tag_for_request, get_clan_id
from auth import require_admin
import os
from datetime import datetime

router = APIRouter()


@router.post("/equip-lookup")
async def equip_lookup(request: Request):
    """Tra cứu trang bị (lâu đài/pháo/hiệu ứng...) theo player_tag — KHÔNG
    lọc theo clan_id (tài khoản web là của người chơi, không phải của riêng
    1 clan). Dùng để bản đồ chiến trường War hiện ĐÚNG trang bị của CẢ 2 PHE
    khi đối thủ cũng là 1 clan đang được web theo dõi (vd 2 clan cùng hệ
    thống đấu giao hữu/thách đấu với nhau) — trước đây chỉ tra được trang bị
    của phe mình vì /roster chỉ trả về đúng 1 clan đang chọn xem."""
    body = await request.json()
    tags = body.get("tags") or []
    if not tags or not isinstance(tags, list):
        return {}
    sb = get_supabase()
    try:
        res = sb.table("member_accounts").select(
            "player_tag,equipped_castle,equipped_cannon,equipped_effect,equipped_number_effect,equipped_projectile,equipped_explosion"
        ).in_("player_tag", tags[:100]).execute()
    except Exception:
        try:
            res = sb.table("member_accounts").select(
                "player_tag,equipped_castle,equipped_cannon,equipped_effect,equipped_number_effect"
            ).in_("player_tag", tags[:100]).execute()
        except Exception:
            return {}
    return {r["player_tag"]: r for r in (res.data or [])}


@router.get("/roster")
async def roster(request: Request):
    """Danh sách thành viên trong clan (đúng clan đang chọn) kèm trạng thái đã có
    người nhận hay chưa, và icon lâu đài/pháo họ đang trang bị (để bản đồ chiến
    trường và chat hiển thị). Trạng thái "đã xác minh" là GLOBAL theo tag người
    chơi — không lọc theo clan_id, vì tài khoản web là của người chơi, không
    phải của riêng 1 clan (trước đây lọc theo clan_id khiến ai đó đổi từ clan A
    sang clan B trong cùng hệ thống bị hiện lại "chưa xác minh" dù đã đăng ký)."""
    clan_id, tag = await get_tag_for_request(request)
    members = await get_clan_members_resilient(tag, clan_id=clan_id)
    sb = get_supabase()
    try:
        res = sb.table("member_accounts").select(
            "player_tag,player_name,coins,equipped_castle,equipped_cannon,equipped_effect,equipped_number_effect,equipped_projectile,equipped_explosion,claimed_at"
        ).execute()
    except Exception:
        # Chưa chạy hết migration (thiếu cột equipped_projectile/equipped_explosion)
        # — thử lại không có 2 cột mới, để ít nhất castle/cannon/effect vẫn hiện
        # đúng thay vì cả API này lỗi 500 và MỌI trang bị đều rơi về mặc định.
        try:
            res = sb.table("member_accounts").select(
                "player_tag,player_name,coins,equipped_castle,equipped_cannon,equipped_effect,equipped_number_effect,claimed_at"
            ).execute()
        except Exception:
            res = sb.table("member_accounts").select(
                "player_tag,player_name,coins,equipped_castle,equipped_cannon,claimed_at"
            ).execute()
    claimed = {r["player_tag"]: r for r in res.data}
    return [
        {
            "tag": m["tag"], "name": m["name"], "role": m.get("role"), "townHallLevel": m.get("townHallLevel"),
            "claimed": m["tag"] in claimed,
            "claimed_at": claimed.get(m["tag"], {}).get("claimed_at"),
            "coins": claimed.get(m["tag"], {}).get("coins") or 0,
            "equipped_castle": claimed.get(m["tag"], {}).get("equipped_castle") or "castle_classic",
            "equipped_cannon": claimed.get(m["tag"], {}).get("equipped_cannon") or "cannon_basic",
            "equipped_effect": claimed.get(m["tag"], {}).get("equipped_effect"),
            "equipped_number_effect": claimed.get(m["tag"], {}).get("equipped_number_effect"),
            "equipped_projectile": claimed.get(m["tag"], {}).get("equipped_projectile"),
            "equipped_explosion": claimed.get(m["tag"], {}).get("equipped_explosion"),
        }
        for m in members
    ]


@router.get("/setup-code-required")
async def setup_code_required():
    return {"required": bool(os.environ.get("MEMBER_SETUP_CODE", "").strip())}


@router.post("/claim")
async def claim(request: Request):
    body = await request.json()
    player_tag = (body.get("player_tag") or "").strip()
    player_name = (body.get("player_name") or "").strip()
    pin = (body.get("pin") or "").strip()
    setup_code = (body.get("setup_code") or "").strip()
    if not player_tag or not player_name:
        raise HTTPException(400, "Thiếu thông tin người chơi")
    if not pin.isdigit() or not (4 <= len(pin) <= 8):
        raise HTTPException(400, "PIN phải là 4-8 chữ số")

    required_code = os.environ.get("MEMBER_SETUP_CODE", "").strip()
    if required_code and setup_code != required_code:
        raise HTTPException(
            403,
            "Mã xác minh không đúng. Đây là mã bảo mật do thủ lĩnh/admin web cấp — "
            "liên hệ thủ lĩnh clan hoặc admin website để lấy mã trước khi nhận tài khoản.",
        )

    clan_id = get_clan_id(request)
    sb = get_supabase()
    existing = sb.table("member_accounts").select("player_tag").eq("player_tag", player_tag).execute()
    if existing.data:
        raise HTTPException(409, "Người chơi này đã có người khác nhận rồi")
    row = {
        "player_tag": player_tag,
        "player_name": player_name,
        "pin_hash": hash_pin(pin, player_tag),
    }
    try:
        sb.table("member_accounts").insert({**row, "clan_id": clan_id}).execute()
    except Exception:
        sb.table("member_accounts").insert(row).execute()
    return {"token": create_member_token(player_tag), "player_tag": player_tag, "player_name": player_name}


@router.post("/login")
async def login(request: Request):
    body = await request.json()
    player_tag = (body.get("player_tag") or "").strip()
    pin = (body.get("pin") or "").strip()
    sb = get_supabase()
    res = sb.table("member_accounts").select("*").eq("player_tag", player_tag).execute()
    if not res.data:
        raise HTTPException(404, "Người chơi này chưa được ai nhận. Hãy nhận trước khi đăng nhập.")
    row = res.data[0]
    if row["pin_hash"] != hash_pin(pin, player_tag):
        raise HTTPException(401, "Sai PIN")
    return {"token": create_member_token(player_tag), "player_tag": player_tag, "player_name": row["player_name"]}


@router.get("/me")
async def me(x_member_token: str | None = Header(default=None)):
    player_tag = verify_member_token(x_member_token)
    if not player_tag:
        raise HTTPException(401, "Chưa đăng nhập")
    sb = get_supabase()
    res = sb.table("member_accounts").select("player_tag,player_name,coins,equipped_castle,equipped_cannon,equipped_effect,equipped_number_effect,assets_cleared").eq("player_tag", player_tag).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy tài khoản")
    row = res.data[0]

    # Kiểm tra xem người này đã rời clan chưa — nếu có, tính còn bao nhiêu
    # ngày trước khi Coins/vật phẩm bị xoá, để nhắc họ khi quay lại web.
    row["leave_info"] = None
    try:
        log_res = sb.table("member_log").select("status,left_at,clan_id").eq("player_tag", player_tag).order("id", desc=True).limit(1).execute()
        if log_res.data and log_res.data[0]["status"] == "left" and not row.get("assets_cleared"):
            cfg = sb.table("settings").select("value").eq("key", "asset_cleanup_days").execute()
            cleanup_days = int(cfg.data[0]["value"]) if cfg.data and cfg.data[0]["value"].isdigit() else 7
            left_at_str = log_res.data[0]["left_at"].replace("Z", "+00:00")
            left_at = datetime.fromisoformat(left_at_str)
            now = datetime.utcnow().replace(tzinfo=left_at.tzinfo) if left_at.tzinfo else datetime.utcnow()
            days_since = (now - left_at).days

            # Sự kiện đang tham gia sẽ KHÔNG được xét thưởng nữa vì đã rời clan
            # (leaderboard chỉ tính người còn trong clan) — báo cho họ biết luôn,
            # tránh trường hợp cứ tưởng vẫn còn được xét top.
            at_risk_events: list[str] = []
            try:
                parts = sb.table("event_participants").select("event_id").eq("player_tag", player_tag).execute()
                event_ids = [p["event_id"] for p in (parts.data or [])]
                if event_ids:
                    evs = sb.table("events").select("id,title,status").in_("id", event_ids).eq("status", "active").execute()
                    at_risk_events = [e["title"] for e in (evs.data or [])]
            except Exception:
                pass

            row["leave_info"] = {
                "days_since_left": days_since,
                "days_until_wipe": max(0, cleanup_days - days_since),
                "cleanup_days": cleanup_days,
                "at_risk_events": at_risk_events,
            }
    except Exception:
        pass

    return row


@router.post("/release")
async def release(request: Request, _: bool = Depends(require_admin)):
    """Admin gỡ 1 player_tag đã bị nhận nhầm/sai, cho phép người khác nhận lại."""
    body = await request.json()
    player_tag = (body.get("player_tag") or "").strip()
    sb = get_supabase()
    sb.table("member_accounts").delete().eq("player_tag", player_tag).execute()
    return {"ok": True}
