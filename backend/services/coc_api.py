"""
Clash of Clans API wrapper.
Reads API key + clan tag from Supabase settings table.
"""
import httpx
import time
from supabase_client import get_supabase
from urllib.parse import quote

COC_BASE = "https://cocproxy.royaleapi.dev/v1"

async def get_coc_config() -> dict:
    """Load api_key and clan_tag from DB settings."""
    sb = get_supabase()
    res = sb.table("settings").select("key,value").in_("key", ["coc_api_key", "clan_tag"]).execute()
    config = {row["key"]: row["value"] for row in res.data}
    return config

async def coc_get(path: str, clan_id: int = 1) -> dict:
    """Gọi CoC API — API key luôn lấy từ bảng `clans` theo đúng clan_id (kể cả
    clan #1), để sửa key/tag ở màn 'Quản lý Clan' áp dụng cho MỌI clan nhất
    quán. Fallback về bảng settings (kiểu cũ) chỉ khi clan #1 chưa có key
    trong bảng clans (chưa chạy migration/chưa từng lưu qua Quản lý Clan)."""
    from supabase_client import get_supabase
    sb = get_supabase()
    res = sb.table("clans").select("coc_api_key").eq("id", clan_id).execute()
    api_key = (res.data[0].get("coc_api_key") or "") if res.data else ""
    if not api_key and clan_id == 1:
        config = await get_coc_config()
        api_key = config.get("coc_api_key", "")
    if not api_key:
        raise ValueError("CoC API key chưa được cấu hình.")
    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{COC_BASE}{path}", headers=headers)
        r.raise_for_status()
        return r.json()

def encode_tag(tag: str) -> str:
    return quote(tag, safe="")

# ── Clan ──────────────────────────────────────────────────────────────────────
async def get_clan(tag: str, clan_id: int = 1) -> dict:
    return await coc_get(f"/clans/{encode_tag(tag)}", clan_id=clan_id)

async def get_clan_members(tag: str, clan_id: int = 1) -> list:
    data = await coc_get(f"/clans/{encode_tag(tag)}/members", clan_id=clan_id)
    return data.get("items", [])

async def get_clan_members_resilient(tag: str, clan_id: int = 1) -> list:
    """Như get_clan_members(), nhưng khi CoC API/proxy trung gian lỗi (vd
    cocproxy.royaleapi.dev sập tạm thời — đã xảy ra thực tế, làm trắng xoá
    hàng loạt trang) thì fallback về memberList trong snapshot_clan cache gần
    nhất (poller cập nhật mỗi 15 phút cho MỌI clan) thay vì crash 500. Dùng
    cho các trang xếp hạng/hiển thị (Danh vọng, Huy chương CWL, Top Cúp...)
    nơi dữ liệu hơi cũ vẫn tốt hơn nhiều so với trắng trang."""
    try:
        return await get_clan_members(tag, clan_id=clan_id)
    except httpx.HTTPError:
        # Bắt luôn cả lỗi status (500/503...) lẫn lỗi kết nối/timeout — mọi
        # kiểu sự cố phía CoC API/proxy đều nên fallback về cache thay vì crash.
        import json
        sb = get_supabase()
        res = sb.table("snapshot_clan").select("data").eq("clan_id", clan_id).order("id", desc=True).limit(1).execute()
        if res.data:
            return json.loads(res.data[0]["data"]).get("memberList", [])
        raise

# ── War ───────────────────────────────────────────────────────────────────────
async def get_current_war(tag: str, clan_id: int = 1) -> dict:
    return await coc_get(f"/clans/{encode_tag(tag)}/currentwar", clan_id=clan_id)

async def get_war_log(tag: str, clan_id: int = 1) -> list:
    data = await coc_get(f"/clans/{encode_tag(tag)}/warlog?limit=20", clan_id=clan_id)
    return data.get("items", [])

_cwl_war_cache: dict[str, tuple[float, dict]] = {}

async def get_cwl_war(war_tag: str, clan_id: int = 1) -> dict:
    """Lấy chi tiết 1 war trong CWL theo warTag — cache ~3 phút vì đây là lệnh
    gọi bị lặp lại NHIỀU NHẤT (mỗi vòng x mỗi clan), dùng chung bởi cả
    /cwl/current, /cwl/standings, /cwl/top-warriors."""
    cache_key = f"{clan_id}:{war_tag}"
    cached = _cwl_war_cache.get(cache_key)
    if cached and (time.time() - cached[0]) < _CWL_CACHE_TTL:
        return cached[1]
    data = await coc_get(f"/clanwarleagues/wars/{encode_tag(war_tag)}", clan_id=clan_id)
    _cwl_war_cache[cache_key] = (time.time(), data)
    return data

_cwl_group_cache: dict[int, tuple[float, dict]] = {}

async def get_cwl_group(tag: str, clan_id: int = 1) -> dict:
    cached = _cwl_group_cache.get(clan_id)
    if cached and (time.time() - cached[0]) < _CWL_CACHE_TTL:
        return cached[1]
    data = await coc_get(f"/clans/{encode_tag(tag)}/currentwar/leaguegroup", clan_id=clan_id)
    _cwl_group_cache[clan_id] = (time.time(), data)
    return data


_cwl_rounds_cache: dict[int, tuple[float, list]] = {}
_CWL_CACHE_TTL = 180  # giây — 3 phút


async def get_cwl_season_rounds(tag: str, clan_id: int = 1) -> list:
    """Lấy TẤT CẢ war của clan trong mùa CWL hiện tại (mọi vòng đã bắt đầu,
    không chỉ vòng mới nhất) — trả về list các war đã chuẩn hoá (clan ta luôn
    ở key 'clan'), kèm round_index. Dùng để tổng hợp thống kê cả mùa CWL
    (7 ngày) thay vì chỉ nhìn 1 vòng.

    Cache trong bộ nhớ ~3 phút — đây là phần TỐN THỜI GIAN NHẤT của cả app
    (phải gọi CoC API riêng cho từng war trong mùa, có thể 20-30 lượt gọi),
    và được DÙNG CHUNG bởi cả 3 endpoint (/cwl/current, /cwl/standings,
    /cwl/top-warriors) — không cache thì mở 1 tab CWL đã tự nhân 3 lần gọi
    giống hệt nhau cùng lúc."""
    cached = _cwl_rounds_cache.get(clan_id)
    if cached and (time.time() - cached[0]) < _CWL_CACHE_TTL:
        return cached[1]

    try:
        group = await get_cwl_group(tag, clan_id=clan_id)
    except Exception:
        return []
    clans = group.get("clans", [])
    badge_map = {c.get("tag"): c.get("badgeUrls", {}).get("medium", "") for c in clans}
    rounds_out = []
    for round_index, round_data in enumerate(group.get("rounds", [])):
        for war_tag in round_data.get("warTags", []):
            if war_tag == "#0":
                continue
            try:
                w = await get_cwl_war(war_tag, clan_id=clan_id)
            except Exception:
                continue
            our_side = None
            if w.get("clan", {}).get("tag") == tag:
                our_side = "clan"
            elif w.get("opponent", {}).get("tag") == tag:
                our_side = "opponent"
            if not our_side:
                continue
            if our_side == "opponent":
                w["clan"], w["opponent"] = w["opponent"], w["clan"]
            w["clan"]["badgeUrl"] = badge_map.get(w["clan"]["tag"], "")
            w["opponent"]["badgeUrl"] = badge_map.get(w["opponent"]["tag"], "")
            w["round_index"] = round_index
            w["isCWL"] = True
            w["season"] = group.get("season", "")
            rounds_out.append(w)

    _cwl_rounds_cache[clan_id] = (time.time(), rounds_out)
    return rounds_out


def summarize_cwl_season_members(rounds: list) -> list:
    """Cộng dồn thống kê từng thành viên qua TẤT CẢ vòng CWL đã đánh trong
    mùa: tổng sao, số war tham gia, đòn đánh tốt nhất (sao cao nhất → % phá
    huỷ cao nhất → nhanh nhất — công thức 'anh dũng nhất')."""
    agg: dict[str, dict] = {}
    for w in rounds:
        for m in w.get("clan", {}).get("members", []):
            tag = m.get("tag")
            a = agg.setdefault(tag, {
                "tag": tag, "name": m.get("name", "?"), "wars": 0, "attacks_used": 0,
                "total_stars": 0, "best_destruction": 0, "best_stars": 0,
                "best_attack": None,
            })
            a["name"] = m.get("name", "?")
            a["wars"] += 1
            attacks = m.get("attacks", [])
            a["attacks_used"] += len(attacks)
            for att in attacks:
                a["total_stars"] += att.get("stars", 0)
                a["best_destruction"] = max(a["best_destruction"], att.get("destructionPercentage", 0))
                a["best_stars"] = max(a["best_stars"], att.get("stars", 0))
                key = (att.get("stars", 0), att.get("destructionPercentage", 0), -att.get("duration", 99999))
                cur_key = (a["best_attack"]["stars"], a["best_attack"]["destruction"], -a["best_attack"]["duration"]) if a["best_attack"] else (-1, -1, -99999)
                if key > cur_key:
                    a["best_attack"] = {
                        "stars": att.get("stars", 0), "destruction": att.get("destructionPercentage", 0),
                        "duration": att.get("duration", 0),
                        "opponent": next((om.get("name") for om in w.get("opponent", {}).get("members", []) if om.get("tag") == att.get("defenderTag")), "?"),
                        "round": w.get("round_index", 0) + 1,
                    }
    return list(agg.values())

# ── Capital ───────────────────────────────────────────────────────────────────
async def get_raid_seasons(tag: str, clan_id: int = 1) -> list:
    data = await coc_get(f"/clans/{encode_tag(tag)}/capitalraidseasons?limit=5", clan_id=clan_id)
    return data.get("items", [])

# ── Clan Games ────────────────────────────────────────────────────────────────
async def get_clan_info_for_games(tag: str, clan_id: int = 1) -> dict:
    """Clan Games points are inside member info."""
    return await coc_get(f"/clans/{encode_tag(tag)}", clan_id=clan_id)

# ── Player ────────────────────────────────────────────────────────────────────
async def get_player(player_tag: str, clan_id: int = 1) -> dict:
    return await coc_get(f"/players/{encode_tag(player_tag)}", clan_id=clan_id)

def clear_cwl_caches() -> int:
    """Xoá sạch cache tạm (CWL group/war/season) trong bộ nhớ — dùng khi admin
    bấm 'Xoá cache' trong Cài đặt vì thấy dữ liệu có vẻ cũ, không muốn đợi
    tối đa 3 phút để tự hết hạn. Trả về số mục đã xoá."""
    n = len(_cwl_war_cache) + len(_cwl_group_cache) + len(_cwl_rounds_cache)
    _cwl_war_cache.clear()
    _cwl_group_cache.clear()
    _cwl_rounds_cache.clear()
    return n
