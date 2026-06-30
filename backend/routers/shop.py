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

    acc = sb.table("member_accounts").select("coins").eq("player_tag", tag).execute()
    if not acc.data:
        raise HTTPException(404, "Không tìm thấy tài khoản")
    coins = acc.data[0].get("coins") or 0
    if coins < price:
        raise HTTPException(400, f"Không đủ Coins (cần {price}, hiện có {coins})")

    existing = sb.table("member_inventory").select("id").eq("player_tag", tag).eq("item_id", item_id).execute()
    if existing.data:
        raise HTTPException(409, "Bạn đã sở hữu vật phẩm này rồi")

    sb.table("member_inventory").insert({"player_tag": tag, "item_id": item_id}).execute()
    sb.table("member_accounts").update({"coins": coins - price}).eq("player_tag", tag).execute()
    return {"ok": True, "remaining_coins": coins - price}


@router.post("/equip")
async def equip_item(request: Request, x_member_token: str | None = Header(default=None)):
    tag = verify_member_token(x_member_token)
    if not tag:
        raise HTTPException(401, "Cần đăng nhập")
    body = await request.json()
    item_type = body.get("item_type")
    svg_key = body.get("svg_key")
    if item_type not in ("castle", "cannon", "effect", "number_effect"):
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

    field = {"castle": "equipped_castle", "cannon": "equipped_cannon", "effect": "equipped_effect", "number_effect": "equipped_number_effect"}[item_type]
    sb.table("member_accounts").update({field: svg_key}).eq("player_tag", tag).execute()
    return {"ok": True}
