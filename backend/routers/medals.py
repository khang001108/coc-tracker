"""
Trao thưởng huy chương CWL TRONG GAME — suất có giới hạn, xoay vòng công bằng.

CoC API KHÔNG trả về việc ai đã được trao huy chương trong game (đây là phần
thưởng Supercell tự động cấp theo league+sao, không phải thứ leader tự chọn
người nhận) — nên phần này là Đồng thủ lĩnh TỰ ĐÁNH DẤU sau khi đã trao thật
trong game.

PHÂN QUYỀN (theo yêu cầu người dùng):
  - Xác nhận ĐÃ TRAO (tích + lưu)  → CHỈ thành viên có vai trò Đồng thủ lĩnh
    trở lên (role leader/coLeader) — KHÔNG cho phép admin (mật khẩu web) tự
    bấm thay, để đảm bảo người xác nhận là 1 thành viên có thật trong clan,
    đúng người đã trao huy chương trong game.
  - SỬA/XOÁ 1 lượt đã xác nhận (đánh dấu nhầm) và đổi cấu hình số mùa khôi
    phục → CHỈ Admin (mật khẩu web) — để có 1 lớp kiểm soát/đối chiếu độc
    lập, tránh Đồng thủ lĩnh tự ý xoá lịch sử của nhau.

Sau khi được đánh dấu, người đó bị "tích và mờ" — tạm loại khỏi danh sách ưu
tiên nhận huy chương ở (các) mùa CWL kế tiếp, để nhường suất cho người khác.

ĐÁNH SỐ MÙA: dùng số tuần tự 1, 2, 3... (season_number) thay vì chuỗi
"YYYY-MM" thô của CoC API — vì lúc đang trao thưởng, clan có thể KHÔNG ở
trong mùa CWL nào (CoC không trả về season lúc đó), và bảng cwl_season_log
(mùa CWL thật đã hoàn thành — PART 23) có thể vẫn còn rỗng lúc mới dùng tính
năng này. season_number = số mùa CWL thật ĐÃ hoàn thành + 1, tức "đang ở mùa
thứ mấy kể từ khi bắt đầu dùng tính năng". Sau đủ số lần cấu hình ở Cài đặt
(medal_reward_reset_cwl_count, mặc định 3), người đó tự động đủ điều kiện
nhận lại (remaining = reset_count - (current_season_number - awarded_season_number)).
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Header, Query
from supabase_client import get_supabase
from clan_context import get_clan_id, get_tag_by_clan_id
from auth import verify_admin_token, require_admin
from member_auth import verify_member_token
from services.coc_api import get_clan_members

router = APIRouter()

LEADER_ROLES = {"leader", "coLeader"}


def _reset_count(sb) -> int:
    res = sb.table("settings").select("value").eq("key", "medal_reward_reset_cwl_count").execute()
    try:
        return max(1, int(res.data[0]["value"])) if res.data and res.data[0]["value"] else 3
    except (ValueError, TypeError):
        return 3


def _current_season_number(sb, clan_id: int) -> int:
    """Số mùa CWL thật đã hoàn thành (bảng cwl_season_log) + 1 = đang ở mùa
    thứ mấy. Chưa có mùa nào hoàn thành → đang ở Mùa 1."""
    res = sb.table("cwl_season_log").select("season").eq("clan_id", clan_id).execute()
    completed = len(res.data or [])
    return completed + 1


async def _get_member_role(clan_id: int, member_tag: str) -> str | None:
    tag = await get_tag_by_clan_id(clan_id)
    members = await get_clan_members(tag, clan_id=clan_id) if tag else []
    me = next((m for m in members if m["tag"] == member_tag), None)
    return me.get("role") if me else None


async def _require_leader_member(clan_id: int, x_member_token: str | None) -> str:
    """Chỉ member có vai trò Đồng thủ lĩnh trở lên mới được xác nhận trao
    huy chương — admin web KHÔNG được bấm thay (xem giải thích ở đầu file)."""
    member_tag = verify_member_token(x_member_token)
    if not member_tag:
        raise HTTPException(401, "Cần đăng nhập bằng tài khoản thành viên (Đồng thủ lĩnh trở lên) để xác nhận")
    role = await _get_member_role(clan_id, member_tag)
    if role not in LEADER_ROLES:
        raise HTTPException(403, "Chỉ Đồng thủ lĩnh trở lên mới được xác nhận trao huy chương")
    sb = get_supabase()
    acc = sb.table("member_accounts").select("player_name").eq("player_tag", member_tag).execute()
    return acc.data[0]["player_name"] if acc.data else "Thành viên"


@router.get("/my-permission")
async def my_permission(request: Request, x_admin_token: str | None = Header(default=None),
                         x_member_token: str | None = Header(default=None)):
    """Cho frontend biết người đang xem có quyền gì — để hiện đúng nút thao
    tác (tránh hiện nút rồi bị từ chối, gây khó hiểu)."""
    clan_id = get_clan_id(request)
    is_admin = verify_admin_token(x_admin_token)
    can_award = False
    member_tag = verify_member_token(x_member_token)
    if member_tag:
        role = await _get_member_role(clan_id, member_tag)
        can_award = role in LEADER_ROLES
    return {"is_admin": is_admin, "can_award": can_award}


@router.get("/eligibility")
async def get_eligibility(request: Request):
    """Danh sách thành viên hiện tại kèm trạng thái đủ điều kiện nhận huy
    chương (✅ đủ điều kiện / 🔒 đang bị giới hạn, còn bao nhiêu mùa nữa)."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    tag = await get_tag_by_clan_id(clan_id)
    members = await get_clan_members(tag, clan_id=clan_id) if tag else []
    reset_count = _reset_count(sb)
    current_season_number = _current_season_number(sb, clan_id)

    awards_res = (sb.table("medal_reward_log").select("*").eq("clan_id", clan_id)
                  .order("created_at", desc=True).execute())
    last_award_by_tag: dict = {}
    for a in (awards_res.data or []):
        if a["player_tag"] not in last_award_by_tag:  # đã sort desc — dòng đầu tiên là gần nhất
            last_award_by_tag[a["player_tag"]] = a

    result = []
    awarded_this_season = 0
    for m in members:
        tag_ = m["tag"]
        last = last_award_by_tag.get(tag_)
        if not last:
            result.append({"player_tag": tag_, "player_name": m["name"], "eligible": True,
                            "remaining_seasons": 0, "last_award": None, "awarded_this_season": False})
            continue
        last_season_number = last.get("season_number") or 1
        seasons_passed = current_season_number - last_season_number
        remaining = max(0, reset_count - seasons_passed)
        awarded_this_season_flag = last_season_number == current_season_number
        if awarded_this_season_flag:
            awarded_this_season += 1
        result.append({
            "player_tag": tag_, "player_name": m["name"],
            "eligible": remaining <= 0, "remaining_seasons": remaining,
            "last_award": {"season_number": last_season_number, "created_at": last["created_at"], "awarded_by": last.get("awarded_by")},
            "awarded_this_season": awarded_this_season_flag,
        })
    result.sort(key=lambda r: (r["eligible"] is False, -r["remaining_seasons"], r["player_name"]))
    return {
        "reset_cwl_count": reset_count,
        "current_season_number": current_season_number,
        "awarded_this_season": awarded_this_season,
        "members": result,
    }


@router.post("/award")
async def award_medal(request: Request, x_member_token: str | None = Header(default=None)):
    """Đồng thủ lĩnh đánh dấu 1 người ĐÃ được trao huy chương thật trong
    game — ghi lại số mùa hiện tại làm mốc xoay vòng."""
    clan_id = get_clan_id(request)
    actor_name = await _require_leader_member(clan_id, x_member_token)
    body = await request.json()
    player_tag = (body.get("player_tag") or "").strip()
    player_name = (body.get("player_name") or "").strip()
    note = (body.get("note") or "").strip() or None
    if not player_tag or not player_name:
        raise HTTPException(400, "Thiếu player_tag/player_name")

    sb = get_supabase()
    season_number = _current_season_number(sb, clan_id)

    # Chuỗi season thô của CoC (nếu có) — chỉ để tham khảo, không dùng để tính toán
    raw_season = None
    try:
        from services.coc_api import get_cwl_group
        tag = await get_tag_by_clan_id(clan_id)
        group = await get_cwl_group(tag, clan_id=clan_id) if tag else {}
        raw_season = group.get("season")
    except Exception:
        pass

    row = {"clan_id": clan_id, "player_tag": player_tag, "player_name": player_name,
           "season": raw_season or f"season-{season_number}", "season_number": season_number,
           "awarded_by": actor_name, "note": note}
    sb.table("medal_reward_log").insert(row).execute()
    return {"ok": True}


@router.get("/history")
async def get_history(request: Request, limit: int = Query(50, le=200)):
    clan_id = get_clan_id(request)
    sb = get_supabase()
    res = (sb.table("medal_reward_log").select("*").eq("clan_id", clan_id)
           .order("created_at", desc=True).limit(limit).execute())
    return res.data or []


@router.delete("/history/{entry_id}")
async def delete_history_entry(entry_id: int, request: Request, _: bool = Depends(require_admin)):
    """Xoá 1 lần trao thưởng đã đánh dấu nhầm — CHỈ Admin — trả lại quyền
    xoay vòng cho người đó."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    sb.table("medal_reward_log").delete().eq("id", entry_id).eq("clan_id", clan_id).execute()
    return {"ok": True}


@router.get("/suggestions")
async def get_suggestions(request: Request, weeks: int = Query(8, le=26)):
    """Gợi ý ứng viên tiềm năng cho mùa CWL kế tiếp — dựa vào số lần lọt Top 5
    'tốt' của Báo cáo tuần (War, Donate, Capital, Tấn công/Phòng thủ anh
    dũng, Coins) trong N tuần gần nhất, CỘNG Danh vọng hiện có. Tính LẠI TỪ
    ĐẦU mỗi lần gọi (không cache/không đợi lịch tuần) nên luôn phản ánh đúng
    hiện tại. KHÔNG gợi ý người đang bị giới hạn (vừa được thưởng, còn trong
    thời gian chờ khôi phục) và KHÔNG gợi ý người đã rời clan (dù server
    chưa tới hạn dọn tài khoản 7 ngày — họ không thể dự CWL mùa sau nữa)."""
    clan_id = get_clan_id(request)
    sb = get_supabase()

    reset_count = _reset_count(sb)
    current_season_number = _current_season_number(sb, clan_id)
    awards_res = (sb.table("medal_reward_log").select("*").eq("clan_id", clan_id)
                  .order("created_at", desc=True).execute())
    last_award_by_tag: dict = {}
    for a in (awards_res.data or []):
        if a["player_tag"] not in last_award_by_tag:
            last_award_by_tag[a["player_tag"]] = a
    limited_tags = set()
    for tag_, last in last_award_by_tag.items():
        last_season_number = last.get("season_number") or 1
        seasons_passed = current_season_number - last_season_number
        if max(0, reset_count - seasons_passed) > 0:
            limited_tags.add(tag_)

    reports_res = (sb.table("weekly_report_log").select("report,created_at").eq("clan_id", clan_id)
                   .order("created_at", desc=True).limit(weeks).execute())
    POINTS = [5, 4, 3, 2, 1]
    score_by_tag: dict = {}
    for row in (reports_res.data or []):
        report = row.get("report") or {}
        for cat_key, cat in report.items():
            for i, e in enumerate((cat or {}).get("good", [])[:5]):
                tag_ = e.get("player_tag")
                if not tag_ or tag_ in limited_tags:
                    continue
                entry = score_by_tag.setdefault(tag_, {
                    "player_tag": tag_, "player_name": e.get("player_name"), "score": 0, "highlights": 0,
                })
                entry["score"] += POINTS[i]
                entry["highlights"] += 1

    ranked_candidates = list(score_by_tag.values())

    # Danh vọng càng cao càng được ưu tiên — cộng thêm điểm Danh vọng (quy đổi
    # 1/10, làm tròn) vào điểm gợi ý. Người có Danh vọng cao nhưng chưa lọt
    # Top 5 tuần nào cũng được xét (không chỉ dựa vào Báo cáo tuần), để Danh
    # vọng thực sự có vai trò ưu tiên set thưởng mùa sau.
    from services.reputation import get_all_totals
    rep_totals = get_all_totals(sb, clan_id)
    by_tag = {e["player_tag"]: e for e in ranked_candidates}
    for tag_, info in rep_totals.items():
        if tag_ in limited_tags or info["total"] <= 0:
            continue
        if tag_ not in by_tag:
            by_tag[tag_] = {"player_tag": tag_, "player_name": info["player_name"], "score": 0, "highlights": 0}
        by_tag[tag_]["reputation"] = info["total"]
        by_tag[tag_]["score"] += round(info["total"] / 10)

    # Chỉ gợi ý người HIỆN CÒN trong clan — ai đã rời clan (dù chưa tới hạn
    # dọn tài khoản 7 ngày) sẽ không thể tham gia mùa CWL kế tiếp nên loại
    # khỏi danh sách, tránh gợi ý nhầm người đã nghỉ.
    try:
        from clan_context import get_tag_by_clan_id
        from services.coc_api import get_clan_members
        tag = await get_tag_by_clan_id(clan_id)
        current_tags = {m["tag"] for m in (await get_clan_members(tag, clan_id=clan_id) if tag else [])}
        by_tag = {t: e for t, e in by_tag.items() if t in current_tags}
    except Exception:
        pass  # lỗi gọi CoC API — thà hiện dư còn hơn lỗi cả tính năng

    ranked = sorted(by_tag.values(), key=lambda e: -e["score"])
    return {"weeks_considered": len(reports_res.data or []), "candidates": ranked[:10]}
