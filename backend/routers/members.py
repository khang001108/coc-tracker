from fastapi import APIRouter, HTTPException, Query, Request
from supabase_client import get_supabase
from clan_context import get_tag_for_request, get_clan_id
from services.coc_api import get_clan_members, get_player
import json

router = APIRouter()

@router.get("/")
async def members_list(request: Request):
    clan_id, tag = await get_tag_for_request(request)

    # Clan chính (id=1): dùng snapshot cache cho nhanh — đồng thời sống sót
    # qua lúc CoC API/proxy trung gian bị sập tạm thời (xem games.py cho lý
    # do tương tự). memberList trong snapshot_clan cùng cấu trúc với /members.
    if clan_id == 1:
        sb = get_supabase()
        res = sb.table("snapshot_clan").select("data").eq("clan_id", 1).order("id", desc=True).limit(1).execute()
        if res.data:
            items = json.loads(res.data[0]["data"]).get("memberList", [])
            return {"items": items, "count": len(items)}

    items = await get_clan_members(tag, clan_id=clan_id)
    return {"items": items, "count": len(items)}

@router.get("/log")
async def member_log(request: Request, limit: int = Query(50, le=200)):
    clan_id = get_clan_id(request)
    sb = get_supabase()
    try:
        res = sb.table("member_log").select("*").eq("clan_id", clan_id).order("id", desc=True).limit(500).execute()
    except Exception:
        # Bảng chưa có cột clan_id (chưa chạy migration multi-clan) — chỉ hỗ trợ clan #1
        res = sb.table("member_log").select("*").order("id", desc=True).limit(500).execute()
    rows = res.data or []
    # Sắp theo mốc thời gian GẦN NHẤT của mỗi dòng (rời clan thì tính theo
    # left_at, còn đang ở thì tính theo joined_at) — trước đây chỉ sắp theo
    # joined_at nên khi ai đó rời clan, dòng của họ vẫn nằm ở vị trí cũ (theo
    # ngày họ VÀO clan) thay vì nổi lên đầu theo ngày họ VỪA rời, nhìn như
    # "không có gì thay đổi" dù dữ liệu đã cập nhật đúng.
    rows.sort(key=lambda r: r.get("left_at") or r.get("joined_at") or "", reverse=True)
    return rows[:limit]

@router.get("/{player_tag}")
async def profile(player_tag: str, request: Request):
    clan_id, _ = await get_tag_for_request(request)
    return await get_player(player_tag, clan_id=clan_id)
