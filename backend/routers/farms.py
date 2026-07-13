"""
Nông trại — bản THU GỌN để test ý tưởng "mỗi thành viên có 1 farm riêng,
trang trí + hoạt động chặt cây/câu cá/trồng trọt ra Coins, có thể ghé thăm
farm người khác". KHÔNG có di chuyển thời gian thực / gặp nhau trực tiếp —
đó là phần cần hạ tầng multiplayer riêng, chưa làm ở bản test này.

Grid: 8 cột x 5 hàng = 40 ô, mỗi ô lưu dạng:
  { "type": null | "tree1" | "cow" | ... | "crop", "crop_key": str|null,
    "planted_at": iso|null, "chopped_at": iso|null }
"""
import datetime
import random
from fastapi import APIRouter, HTTPException, Request, Header
from supabase_client import get_supabase
from clan_context import get_clan_id
from member_auth import verify_member_token

router = APIRouter()

GRID_SIZE = 40

# Vật trang trí — mua 1 lần là đặt luôn (không có kho đồ, mua bao nhiêu đặt
# bấy nhiêu ô trống). "choppable": có thể chặt lấy Coins, hồi lại sau N phút.
DECOR_ITEMS = {
    "tree1":         {"label": "Cây (kiểu 1)", "price": 200, "choppable": True,  "chop_cooldown_min": 240, "chop_yield": (30, 60)},
    "tree2":         {"label": "Cây (kiểu 2)", "price": 220, "choppable": True,  "chop_cooldown_min": 240, "chop_yield": (30, 60)},
    "cow":           {"label": "Bò",           "price": 400, "choppable": False},
    "pig":           {"label": "Lợn",          "price": 350, "choppable": False},
    "sheep":         {"label": "Cừu",          "price": 350, "choppable": False},
    "chicken":       {"label": "Gà",           "price": 250, "choppable": False},
    "duck":          {"label": "Vịt",          "price": 250, "choppable": False},
    "mushroom_blue": {"label": "Nấm Xanh",     "price": 120, "choppable": False},
    "mushroom_red":  {"label": "Nấm Đỏ",       "price": 120, "choppable": False},
    "windmill":      {"label": "Cối Xay Gió",  "price": 900, "choppable": False},
}

# Cây trồng — trả tiền hạt giống, chờ lớn, thu hoạch ra Coins.
CROP_ITEMS = {
    "carrot":      {"label": "Cà rốt",     "seed_price": 20, "grow_minutes": 30, "yield": (35, 50)},
    "beetroot":    {"label": "Củ dền",     "seed_price": 25, "grow_minutes": 45, "yield": (45, 60)},
    "cabbage":     {"label": "Bắp cải",    "seed_price": 30, "grow_minutes": 60, "yield": (60, 80)},
    "kale":        {"label": "Cải xoăn",   "seed_price": 20, "grow_minutes": 40, "yield": (40, 55)},
    "cauliflower": {"label": "Súp lơ",     "seed_price": 35, "grow_minutes": 90, "yield": (75, 100)},
}

FISH_COOLDOWN_MIN = 120
FISH_YIELD = (20, 60)


def _now_iso() -> str:
    return datetime.datetime.utcnow().isoformat()


def _minutes_since(iso: str | None) -> float:
    if not iso:
        return 1e9
    try:
        dt = datetime.datetime.fromisoformat(iso)
        return (datetime.datetime.utcnow() - dt).total_seconds() / 60
    except Exception:
        return 1e9


def _empty_grid() -> list:
    return [{"type": None, "crop_key": None, "planted_at": None, "chopped_at": None} for _ in range(GRID_SIZE)]


def _require_member(x_member_token: str | None) -> str:
    tag = verify_member_token(x_member_token)
    if not tag:
        raise HTTPException(401, "Cần đăng nhập thành viên")
    return tag


async def _get_or_create_farm(sb, clan_id: int, player_tag: str) -> dict:
    res = sb.table("farms").select("*").eq("player_tag", player_tag).execute()
    if res.data:
        return res.data[0]
    acc = sb.table("member_accounts").select("player_name").eq("player_tag", player_tag).execute()
    name = acc.data[0]["player_name"] if acc.data else "?"
    row = {"player_tag": player_tag, "clan_id": clan_id, "player_name": name, "grid": _empty_grid()}
    ins = sb.table("farms").insert(row).execute()
    return ins.data[0]


def _get_coins(sb, tag: str) -> int:
    acc = sb.table("member_accounts").select("coins").eq("player_tag", tag).execute()
    return (acc.data[0].get("coins") or 0) if acc.data else 0


def _add_coins(sb, tag: str, delta: int):
    coins = _get_coins(sb, tag)
    sb.table("member_accounts").update({"coins": coins + delta}).eq("player_tag", tag).execute()


@router.get("/catalog")
async def get_catalog():
    return {
        "decor": [{"key": k, **v} for k, v in DECOR_ITEMS.items()],
        "crops": [{"key": k, **v} for k, v in CROP_ITEMS.items()],
        "fish_cooldown_min": FISH_COOLDOWN_MIN, "fish_yield": FISH_YIELD,
    }


@router.get("/list")
async def list_farms(request: Request):
    """Danh sách farm trong clan hiện tại — để ghé thăm."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    res = sb.table("farms").select("player_tag,player_name,grid,updated_at").eq("clan_id", clan_id).execute()
    out = []
    for f in (res.data or []):
        placed = sum(1 for c in (f.get("grid") or []) if c.get("type"))
        out.append({"player_tag": f["player_tag"], "player_name": f["player_name"], "item_count": placed, "updated_at": f.get("updated_at")})
    out.sort(key=lambda f: -f["item_count"])
    return out


@router.get("/me")
async def get_my_farm(request: Request, x_member_token: str | None = Header(default=None)):
    tag = _require_member(x_member_token)
    clan_id = get_clan_id(request)
    sb = get_supabase()
    farm = await _get_or_create_farm(sb, clan_id, tag)
    farm["coins"] = _get_coins(sb, tag)
    farm["fish_ready"] = _minutes_since(farm.get("last_fish_at")) >= FISH_COOLDOWN_MIN
    return farm


@router.get("/{player_tag}")
async def view_farm(player_tag: str, request: Request):
    """Xem farm người khác (chỉ đọc — dùng cho tính năng 'ghé thăm')."""
    sb = get_supabase()
    res = sb.table("farms").select("player_tag,player_name,grid,updated_at").eq("player_tag", player_tag).execute()
    if not res.data:
        raise HTTPException(404, "Người này chưa có farm")
    return res.data[0]


@router.post("/place")
async def place_item(request: Request, x_member_token: str | None = Header(default=None)):
    tag = _require_member(x_member_token)
    clan_id = get_clan_id(request)
    body = await request.json()
    index, item_key = body.get("index"), body.get("item_key")
    if item_key not in DECOR_ITEMS:
        raise HTTPException(400, "Vật phẩm không hợp lệ")
    if not isinstance(index, int) or not (0 <= index < GRID_SIZE):
        raise HTTPException(400, "Vị trí không hợp lệ")

    sb = get_supabase()
    farm = await _get_or_create_farm(sb, clan_id, tag)
    grid = farm["grid"]
    if grid[index]["type"] is not None:
        raise HTTPException(400, "Ô này đã có đồ rồi")

    price = DECOR_ITEMS[item_key]["price"]
    coins = _get_coins(sb, tag)
    if coins < price:
        raise HTTPException(400, f"Không đủ Coins (cần {price}, có {coins})")

    grid[index] = {"type": item_key, "crop_key": None, "planted_at": None, "chopped_at": None}
    sb.table("farms").update({"grid": grid, "updated_at": _now_iso()}).eq("player_tag", tag).execute()
    _add_coins(sb, tag, -price)
    return {"ok": True, "grid": grid, "coins": coins - price}


@router.post("/remove")
async def remove_item(request: Request, x_member_token: str | None = Header(default=None)):
    tag = _require_member(x_member_token)
    body = await request.json()
    index = body.get("index")
    if not isinstance(index, int) or not (0 <= index < GRID_SIZE):
        raise HTTPException(400, "Vị trí không hợp lệ")

    sb = get_supabase()
    res = sb.table("farms").select("grid").eq("player_tag", tag).execute()
    if not res.data:
        raise HTTPException(404, "Chưa có farm")
    grid = res.data[0]["grid"]
    grid[index] = {"type": None, "crop_key": None, "planted_at": None, "chopped_at": None}
    sb.table("farms").update({"grid": grid, "updated_at": _now_iso()}).eq("player_tag", tag).execute()
    return {"ok": True, "grid": grid}


@router.post("/plant")
async def plant_crop(request: Request, x_member_token: str | None = Header(default=None)):
    tag = _require_member(x_member_token)
    clan_id = get_clan_id(request)
    body = await request.json()
    index, crop_key = body.get("index"), body.get("crop_key")
    if crop_key not in CROP_ITEMS:
        raise HTTPException(400, "Loại cây không hợp lệ")
    if not isinstance(index, int) or not (0 <= index < GRID_SIZE):
        raise HTTPException(400, "Vị trí không hợp lệ")

    sb = get_supabase()
    farm = await _get_or_create_farm(sb, clan_id, tag)
    grid = farm["grid"]
    if grid[index]["type"] is not None:
        raise HTTPException(400, "Ô này đã có đồ/cây rồi")

    price = CROP_ITEMS[crop_key]["seed_price"]
    coins = _get_coins(sb, tag)
    if coins < price:
        raise HTTPException(400, f"Không đủ Coins (cần {price}, có {coins})")

    grid[index] = {"type": "crop", "crop_key": crop_key, "planted_at": _now_iso(), "chopped_at": None}
    sb.table("farms").update({"grid": grid, "updated_at": _now_iso()}).eq("player_tag", tag).execute()
    _add_coins(sb, tag, -price)
    return {"ok": True, "grid": grid, "coins": coins - price}


@router.post("/harvest")
async def harvest_crop(request: Request, x_member_token: str | None = Header(default=None)):
    tag = _require_member(x_member_token)
    body = await request.json()
    index = body.get("index")
    if not isinstance(index, int) or not (0 <= index < GRID_SIZE):
        raise HTTPException(400, "Vị trí không hợp lệ")

    sb = get_supabase()
    res = sb.table("farms").select("grid").eq("player_tag", tag).execute()
    if not res.data:
        raise HTTPException(404, "Chưa có farm")
    grid = res.data[0]["grid"]
    cell = grid[index]
    if cell["type"] != "crop":
        raise HTTPException(400, "Ô này không có cây trồng")
    crop = CROP_ITEMS.get(cell["crop_key"])
    if not crop:
        raise HTTPException(400, "Loại cây không hợp lệ")
    elapsed = _minutes_since(cell["planted_at"])
    if elapsed < crop["grow_minutes"]:
        raise HTTPException(400, f"Cây chưa lớn — còn {round(crop['grow_minutes'] - elapsed)} phút")

    reward = random.randint(*crop["yield"])
    grid[index] = {"type": None, "crop_key": None, "planted_at": None, "chopped_at": None}
    sb.table("farms").update({"grid": grid, "updated_at": _now_iso()}).eq("player_tag", tag).execute()
    _add_coins(sb, tag, reward)
    return {"ok": True, "reward": reward, "grid": grid, "coins": _get_coins(sb, tag)}


@router.post("/chop")
async def chop_tree(request: Request, x_member_token: str | None = Header(default=None)):
    tag = _require_member(x_member_token)
    body = await request.json()
    index = body.get("index")
    if not isinstance(index, int) or not (0 <= index < GRID_SIZE):
        raise HTTPException(400, "Vị trí không hợp lệ")

    sb = get_supabase()
    res = sb.table("farms").select("grid").eq("player_tag", tag).execute()
    if not res.data:
        raise HTTPException(404, "Chưa có farm")
    grid = res.data[0]["grid"]
    cell = grid[index]
    item = DECOR_ITEMS.get(cell["type"])
    if not item or not item.get("choppable"):
        raise HTTPException(400, "Ô này không có cây để chặt")
    elapsed = _minutes_since(cell.get("chopped_at"))
    if elapsed < item["chop_cooldown_min"]:
        raise HTTPException(400, f"Cây chưa hồi — còn {round(item['chop_cooldown_min'] - elapsed)} phút")

    reward = random.randint(*item["chop_yield"])
    cell["chopped_at"] = _now_iso()
    grid[index] = cell
    sb.table("farms").update({"grid": grid, "updated_at": _now_iso()}).eq("player_tag", tag).execute()
    _add_coins(sb, tag, reward)
    return {"ok": True, "reward": reward, "grid": grid, "coins": _get_coins(sb, tag)}


@router.post("/fish")
async def go_fish(request: Request, x_member_token: str | None = Header(default=None)):
    tag = _require_member(x_member_token)
    clan_id = get_clan_id(request)
    sb = get_supabase()
    farm = await _get_or_create_farm(sb, clan_id, tag)
    elapsed = _minutes_since(farm.get("last_fish_at"))
    if elapsed < FISH_COOLDOWN_MIN:
        raise HTTPException(400, f"Chưa thể câu tiếp — còn {round(FISH_COOLDOWN_MIN - elapsed)} phút")

    reward = random.randint(*FISH_YIELD)
    sb.table("farms").update({"last_fish_at": _now_iso(), "updated_at": _now_iso()}).eq("player_tag", tag).execute()
    _add_coins(sb, tag, reward)
    return {"ok": True, "reward": reward, "coins": _get_coins(sb, tag)}
