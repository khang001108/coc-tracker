from fastapi import APIRouter, HTTPException, Request, Header, Depends
from supabase_client import get_supabase
from member_auth import hash_pin, create_member_token, verify_member_token
from services.coc_api import get_clan_members, get_coc_config
from auth import require_admin

router = APIRouter()


@router.get("/roster")
async def roster():
    """Danh sách thành viên trong clan kèm trạng thái đã có người nhận hay chưa,
    và icon lâu đài/pháo họ đang trang bị (để bản đồ chiến trường hiển thị)."""
    cfg = await get_coc_config()
    tag = cfg.get("clan_tag")
    if not tag:
        raise HTTPException(400, "Chưa cấu hình clan tag")
    members = await get_clan_members(tag)
    sb = get_supabase()
    res = sb.table("member_accounts").select("player_tag,player_name,equipped_castle,equipped_cannon").execute()
    claimed = {r["player_tag"]: r for r in res.data}
    return [
        {
            "tag": m["tag"], "name": m["name"], "role": m.get("role"), "townHallLevel": m.get("townHallLevel"),
            "claimed": m["tag"] in claimed,
            "equipped_castle": claimed.get(m["tag"], {}).get("equipped_castle") or "castle_classic",
            "equipped_cannon": claimed.get(m["tag"], {}).get("equipped_cannon") or "cannon_basic",
        }
        for m in members
    ]


@router.post("/claim")
async def claim(request: Request):
    body = await request.json()
    player_tag = (body.get("player_tag") or "").strip()
    player_name = (body.get("player_name") or "").strip()
    pin = (body.get("pin") or "").strip()
    if not player_tag or not player_name:
        raise HTTPException(400, "Thiếu thông tin người chơi")
    if not pin.isdigit() or not (4 <= len(pin) <= 8):
        raise HTTPException(400, "PIN phải là 4-8 chữ số")
    sb = get_supabase()
    existing = sb.table("member_accounts").select("player_tag").eq("player_tag", player_tag).execute()
    if existing.data:
        raise HTTPException(409, "Người chơi này đã có người khác nhận rồi")
    sb.table("member_accounts").insert({
        "player_tag": player_tag,
        "player_name": player_name,
        "pin_hash": hash_pin(pin, player_tag),
    }).execute()
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
    res = sb.table("member_accounts").select("player_tag,player_name").eq("player_tag", player_tag).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy tài khoản")
    return res.data[0]


@router.post("/release")
async def release(request: Request, _: bool = Depends(require_admin)):
    """Admin gỡ 1 player_tag đã bị nhận nhầm/sai, cho phép người khác nhận lại."""
    body = await request.json()
    player_tag = (body.get("player_tag") or "").strip()
    sb = get_supabase()
    sb.table("member_accounts").delete().eq("player_tag", player_tag).execute()
    return {"ok": True}
