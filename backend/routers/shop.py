from fastapi import APIRouter, HTTPException, Request, Header, Depends
from supabase_client import get_supabase
from member_auth import verify_member_token
from auth import require_admin

router = APIRouter()


@router.get("/items")
async def list_items():
    sb = get_supabase()
    res = sb.table("shop_items").select("*").order("price_coins").execute()
    return res.data


@router.get("/my-inventory")
async def my_inventory(x_member_token: str | None = Header(default=None)):
    tag = verify_member_token(x_member_token)
    if not tag:
        raise HTTPException(401, "Cần đăng nhập")
    sb = get_supabase()
    inv = sb.table("member_inventory").select("item_id").eq("player_tag", tag).execute()
    try:
        acc = sb.table("member_accounts").select("coins,equipped_castle,equipped_cannon,equipped_effect,equipped_number_effect,equipped_projectile,equipped_explosion").eq("player_tag", tag).execute()
    except Exception:
        acc = sb.table("member_accounts").select("coins,equipped_castle,equipped_cannon,equipped_effect,equipped_number_effect").eq("player_tag", tag).execute()
    if not acc.data:
        raise HTTPException(404, "Không tìm thấy tài khoản")
    return {
        "owned_item_ids": [r["item_id"] for r in inv.data],
        "coins": acc.data[0].get("coins") or 0,
        "equipped_castle": acc.data[0].get("equipped_castle") or "castle_classic",
        "equipped_cannon": acc.data[0].get("equipped_cannon") or "cannon_basic",
        "equipped_effect": acc.data[0].get("equipped_effect"),
        "equipped_number_effect": acc.data[0].get("equipped_number_effect"),
        "equipped_projectile": acc.data[0].get("equipped_projectile"),
        "equipped_explosion": acc.data[0].get("equipped_explosion"),
    }


@router.put("/items/{item_id}/price")
async def update_price(item_id: int, request: Request, _: bool = Depends(require_admin)):
    body = await request.json()
    price = body.get("price_coins")
    if price is None or int(price) < 0:
        raise HTTPException(400, "Giá không hợp lệ")
    sb = get_supabase()
    res = sb.table("shop_items").update({"price_coins": int(price)}).eq("id", item_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy vật phẩm")
    return res.data[0]


@router.put("/items/{item_id}/unlock-reputation")
async def update_unlock_reputation(item_id: int, request: Request, _: bool = Depends(require_admin)):
    """Admin đặt ngưỡng Danh vọng cần có để mở khoá mua vật phẩm này (0 = không yêu cầu)."""
    body = await request.json()
    unlock_reputation = body.get("unlock_reputation")
    if unlock_reputation is None or int(unlock_reputation) < 0:
        raise HTTPException(400, "Ngưỡng Danh vọng không hợp lệ")
    sb = get_supabase()
    res = sb.table("shop_items").update({"unlock_reputation": int(unlock_reputation)}).eq("id", item_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy vật phẩm")
    return res.data[0]


@router.post("/buy/{item_id}")
async def buy_item(item_id: int, x_member_token: str | None = Header(default=None)):
    tag = verify_member_token(x_member_token)
    if not tag:
        raise HTTPException(401, "Cần đăng nhập")
    sb = get_supabase()
    item = sb.table("shop_items").select("*").eq("id", item_id).execute()
    if not item.data:
        raise HTTPException(404, "Không tìm thấy vật phẩm")
    price = item.data[0]["price_coins"]
    unlock_rep = item.data[0].get("unlock_reputation", 0) or 0

    if unlock_rep > 0:
        acc_clan = sb.table("member_accounts").select("clan_id").eq("player_tag", tag).execute()
        clan_id = (acc_clan.data[0].get("clan_id") or 1) if acc_clan.data else 1
        from services.reputation import get_total_reputation
        my_rep = get_total_reputation(sb, clan_id, tag)
        if my_rep < unlock_rep:
            raise HTTPException(403, f"Cần {unlock_rep} Danh vọng để mở khoá vật phẩm này (hiện có {my_rep})")

    acc = sb.table("member_accounts").select("coins,clan_id,player_name").eq("player_tag", tag).execute()
    if not acc.data:
        raise HTTPException(404, "Không tìm thấy tài khoản")
    coins = acc.data[0].get("coins") or 0
    clan_id = acc.data[0].get("clan_id") or 1
    player_name = acc.data[0].get("player_name") or tag
    if coins < price:
        raise HTTPException(400, f"Không đủ Coins (cần {price}, hiện có {coins})")

    existing = sb.table("member_inventory").select("id").eq("player_tag", tag).eq("item_id", item_id).execute()
    if existing.data:
        raise HTTPException(409, "Bạn đã sở hữu vật phẩm này rồi")

    sb.table("member_inventory").insert({"player_tag": tag, "item_id": item_id}).execute()
    from services.coins import add_coins
    remaining = add_coins(sb, clan_id, tag, player_name, "shop_purchase", -price, note=item.data[0].get("name"))
    return {"ok": True, "remaining_coins": remaining}


@router.post("/equip")
async def equip_item(request: Request, x_member_token: str | None = Header(default=None)):
    tag = verify_member_token(x_member_token)
    if not tag:
        raise HTTPException(401, "Cần đăng nhập")
    body = await request.json()
    item_type = body.get("item_type")
    svg_key = body.get("svg_key")
    if item_type not in ("castle", "cannon", "effect", "number_effect", "projectile", "explosion"):
        raise HTTPException(400, "item_type không hợp lệ")

    sb = get_supabase()
    if svg_key:
        item = sb.table("shop_items").select("id").eq("svg_key", svg_key).eq("item_type", item_type).execute()
        if not item.data:
            raise HTTPException(404, "Vật phẩm không hợp lệ")
        owned = sb.table("member_inventory").select("id").eq("player_tag", tag).eq("item_id", item.data[0]["id"]).execute()
        # Vật phẩm giá 0 (mặc định) luôn được dùng kể cả chưa "mua"
        item_price = sb.table("shop_items").select("price_coins").eq("id", item.data[0]["id"]).execute()
        is_free = item_price.data and item_price.data[0]["price_coins"] == 0
        if not owned.data and not is_free:
            raise HTTPException(403, "Bạn chưa sở hữu vật phẩm này")

    field = {"castle": "equipped_castle", "cannon": "equipped_cannon", "effect": "equipped_effect", "number_effect": "equipped_number_effect", "projectile": "equipped_projectile", "explosion": "equipped_explosion"}[item_type]
    sb.table("member_accounts").update({field: svg_key}).eq("player_tag", tag).execute()
    return {"ok": True}
