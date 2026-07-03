from fastapi import APIRouter, HTTPException, Request
from supabase_client import get_supabase
from clan_context import get_tag_for_request
from services.coc_api import get_current_war, get_war_log, get_cwl_group, get_cwl_war
import httpx
import json

router = APIRouter()

@router.get("/current")
async def current_war(request: Request):
    clan_id, tag = await get_tag_for_request(request)

    # Clan chính (id=1): dùng snapshot cache (poller cập nhật sẵn) cho nhanh.
    if clan_id == 1:
        sb = get_supabase()
        res = sb.table("snapshot_war").select("data,updated_at").order("id", desc=True).limit(1).execute()
        if res.data:
            return {**json.loads(res.data[0]["data"]), "_cached_at": res.data[0]["updated_at"]}

    # Clan khác (hoặc chưa có cache): gọi trực tiếp CoC API với đúng clan đang chọn.
    try:
        return await get_current_war(tag, clan_id=clan_id)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 403:
            # Lỗi RẤT phổ biến khi mới thêm clan: "Nhật ký chiến tranh" (War
            # Log) của clan đang để RIÊNG TƯ trong game — CoC API chặn hẳn,
            # không trả về gì cả (khác với việc thật sự không có war).
            return {
                "state": "notInWar",
                "error": "war_log_private",
                "message": "Nhật ký chiến tranh (War Log) của clan này đang để RIÊNG TƯ trong game. "
                            "Vào Clash of Clans → Clan → Cài đặt clan → bật 'Nhật ký chiến tranh công khai' "
                            "thì web mới lấy được dữ liệu war.",
            }
        raise HTTPException(e.response.status_code, f"Lỗi CoC API: {e.response.text[:200]}")

@router.get("/log")
async def war_log(request: Request):
    clan_id, tag = await get_tag_for_request(request)
    try:
        return {"items": await get_war_log(tag, clan_id=clan_id)}
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 403:
            return {"items": [], "error": "war_log_private"}
        raise HTTPException(e.response.status_code, f"Lỗi CoC API: {e.response.text[:200]}")

@router.get("/cwl")
async def cwl(request: Request):
    clan_id, tag = await get_tag_for_request(request)
    try:
        return await get_cwl_group(tag, clan_id=clan_id)
    except Exception:
        return {"error": "Không có CWL đang diễn ra"}


def _normalize_cwl_war(w: dict, tag: str, badge_map: dict):
    """Chuẩn hoá 1 war CWL: đảm bảo clan ta luôn ở key 'clan', gắn badge."""
    our_side = None
    if w.get("clan", {}).get("tag") == tag:
        our_side = "clan"
    elif w.get("opponent", {}).get("tag") == tag:
        our_side = "opponent"
    if not our_side:
        return None
    if our_side == "opponent":
        w["clan"], w["opponent"] = w["opponent"], w["clan"]
    w["clan"]["badgeUrl"] = badge_map.get(w["clan"]["tag"], "")
    w["opponent"]["badgeUrl"] = badge_map.get(w["opponent"]["tag"], "")
    w["isCWL"] = True
    return w


@router.get("/cwl/current")
async def cwl_current_war(request: Request):
    """Trả về war CWL HIỆN TẠI (đang đánh/vừa đấu xong) TÁCH RIÊNG khỏi war
    TIẾP THEO (vòng kế đã lên cặp đấu nhưng chưa tới ngày đánh) — tránh nhầm
    lẫn hiển thị dữ liệu vòng sau như thể đang là vòng đang diễn ra."""
    clan_id, tag = await get_tag_for_request(request)
    try:
        group = await get_cwl_group(tag, clan_id=clan_id)
    except Exception:
        return {"state": "notInWar", "isCWL": True, "current": None, "next": None}

    clans     = group.get("clans", [])
    rounds    = group.get("rounds", [])
    season    = group.get("season", "")
    badge_map = {c_["tag"]: c_.get("badgeUrls", {}).get("medium", "") for c_ in clans}

    # Thu thập TẤT CẢ các vòng có clan ta tham gia, theo đúng thứ tự vòng
    # (không đảo ngược) — mỗi phần tử biết rõ mình thuộc vòng thứ mấy.
    matches = []
    for round_index, round_data in enumerate(rounds):
        for war_tag in round_data.get("warTags", []):
            if war_tag == "#0":
                continue
            try:
                w = await get_cwl_war(war_tag, clan_id=clan_id)
            except Exception:
                continue
            normalized = _normalize_cwl_war(w, tag, badge_map)
            if normalized:
                matches.append({"round_index": round_index, "state": normalized.get("state"), "war": normalized})
                break  # chỉ có đúng 1 war của ta mỗi vòng

    if not matches:
        return {"state": "notInWar", "isCWL": True, "current": None, "next": None, "season": season}

    # Ưu tiên vòng đang "inWar" (đang đánh) làm HIỆN TẠI; nếu không có (giữa
    # các vòng, hoặc mùa đã hết) thì lấy vòng gần nhất theo thứ tự.
    current = next((m for m in matches if m["state"] == "inWar"), None) or matches[-1]
    current_idx_in_matches = matches.index(current)

    # Vòng TIẾP THEO: đúng vòng kế ngay sau vòng hiện tại (nếu đã có cặp đấu).
    nxt = None
    if current_idx_in_matches + 1 < len(matches):
        candidate = matches[current_idx_in_matches + 1]
        if candidate["round_index"] == current["round_index"] + 1:
            nxt = candidate

    current["war"]["season"] = season
    if nxt:
        nxt["war"]["season"] = season

    return {
        "isCWL": True,
        "season": season,
        "current": current["war"],
        "next": nxt["war"] if nxt else None,
        # Giữ tương thích ngược: nơi nào đọc thẳng field ở gốc vẫn có current
        **current["war"],
    }
