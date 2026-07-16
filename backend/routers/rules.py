"""
Nội quy clan — nội dung tự do (rules_text) do Admin viết, kèm các điều kiện
đối chiếu với dữ liệu THẬT của từng thành viên để tự tính:
  - Ai đủ điều kiện lên Huynh trưởng / Đồng thủ lĩnh (PHẢI đạt HẾT các điều
    kiện trong nhóm — AND).
  - Ai không giữ được tiêu chuẩn Đồng thủ lĩnh / Huynh trưởng, nên bị hạ cấp
    (chỉ cần dính 1 điều kiện — OR, giống tinh thần "vi phạm").
  - Ai đang vi phạm, có nguy cơ bị loại khỏi clan (chỉ cần dính 1 điều kiện
    trong nhóm "violation" — OR).

Chỉ số hỗ trợ (metric): donate, war_attendance, reputation, capital, cup —
đều lấy từ dữ liệu đang có sẵn trong app (không cần bảng tích luỹ mới):
  - donate/cup   : lấy trực tiếp từ roster CoC API hiện tại (member.donations/trophies)
  - reputation   : tổng Danh vọng cộng dồn (services/reputation.get_all_totals)
  - capital      : Gold cướp được trong mùa Raid GẦN NHẤT (capitalResourcesLooted)
  - war_attendance: % lượt tấn công đã dùng / tổng lượt được phép trong N tuần
                    gần nhất (N cấu hình ở war_weeks), từ war_participation_log

Xem được công khai (mọi người, kể cả khách) — chỉ SỬA/ghi lịch sử mới cần Admin.

Lịch sử (clan_rule_history) có 2 nguồn ghi:
  - Admin TỰ TAY xác nhận đã xử lý (nút "Đánh dấu đã xử lý" — POST /history).
  - TỰ ĐỘNG: job nền poll_rule_auto_history (schedulers/poller.py) đối chiếu
    ai từng bị gắn cờ đủ điều kiện thăng/hạ/vi phạm với dữ liệu CoC API mới
    nhất — nếu điều đó ĐÃ THẬT SỰ xảy ra trong game (role đổi đúng hướng, hoặc
    rời/bị loại khỏi clan) thì tự ghi, không cần Admin xác nhận tay. Web vẫn
    KHÔNG tự đổi role qua CoC API (không có quyền đó) — chỉ tự phát hiện và
    ghi lại khi thấy Admin/leader đã tự làm điều đó trong game. Xem
    services/rule_engine.py::sync_rule_auto_history.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from supabase_client import get_supabase
from clan_context import get_clan_id
from auth import require_admin
from services.rule_engine import evaluate_rules

router = APIRouter()

METRICS = {"donate", "war_attendance", "reputation", "capital", "cup"}
TARGETS = {"elder", "co_leader", "demote_co_leader", "demote_elder", "violation"}
# elder/co_leader PHẢI đạt HẾT điều kiện (AND) — thăng chức. Các target còn
# lại chỉ cần dính 1 (OR) — hạ cấp/vi phạm, không giữ được 1 tiêu chuẩn nào
# đó là đủ để bị gắn cờ.
OPS = {"gte", "lte"}
# 5 action đầu = Admin tự tay xác nhận đã xử lý 1 người ngoài đời thật. 3 action
# sau = hệ thống TỰ ghi khi Admin sửa nội quy/điều kiện (không cần xác nhận).
ACTIONS = {"promote_elder", "promote_co_leader", "demote_co_leader", "demote_elder", "expel"}
SYSTEM_ACTIONS = {"rule_updated", "condition_added", "condition_updated", "condition_removed"}

_METRIC_LABELS_VI = {
    "donate": "Donate (mùa hiện tại)",
    "war_attendance": "Tỷ lệ tham chiến War (%)",
    "reputation": "Danh vọng (tổng)",
    "capital": "Capital Gold (mùa hiện tại)",
    "cup": "Cúp (hiện tại)",
}
_TARGET_LABELS_VI = {
    "elder": "Lên Huynh trưởng",
    "co_leader": "Lên Đồng thủ lĩnh",
    "demote_co_leader": "Hạ Đồng thủ lĩnh → Huynh trưởng",
    "demote_elder": "Hạ Huynh trưởng → Thành viên",
    "violation": "Vi phạm / có nguy cơ bị loại",
}


def _condition_sentence(c: dict) -> str:
    label = _METRIC_LABELS_VI.get(c["metric"], c["metric"])
    op = "≥" if c["op"] == "gte" else "≤"
    return f"{label} {op} {c['value']}"


def _log_system_history(sb, clan_id: int, action: str, detail: str):
    try:
        sb.table("clan_rule_history").insert({
            "clan_id": clan_id, "action": action, "detail": detail,
        }).execute()
    except Exception:
        pass  # chưa chạy migration PART 38 (thiếu cột detail/player_tag nullable) — bỏ qua, không chặn thao tác chính

@router.get("/")
async def get_rules(request: Request):
    clan_id = get_clan_id(request)
    sb = get_supabase()
    cfg_res = sb.table("clan_rules").select("*").eq("clan_id", clan_id).execute()
    cfg = cfg_res.data[0] if cfg_res.data else {"rules_text": "", "war_weeks": 4}
    conds_res = (sb.table("clan_rule_conditions").select("*")
                 .eq("clan_id", clan_id).order("target").order("position").execute())
    return {
        "rules_text": cfg.get("rules_text", ""),
        "war_weeks": cfg.get("war_weeks", 4),
        "conditions": conds_res.data or [],
    }


@router.put("/")
async def update_rules(request: Request, _: bool = Depends(require_admin)):
    clan_id = get_clan_id(request)
    body = await request.json()
    row = {
        "clan_id": clan_id,
        "rules_text": body.get("rules_text", ""),
        "war_weeks": max(1, min(52, int(body.get("war_weeks") or 4))),
    }
    sb = get_supabase()
    sb.table("clan_rules").upsert(row, on_conflict="clan_id").execute()
    _log_system_history(sb, clan_id, "rule_updated", "Cập nhật nội quy / số tuần tính War")
    return row


@router.post("/conditions")
async def add_condition(request: Request, _: bool = Depends(require_admin)):
    clan_id = get_clan_id(request)
    body = await request.json()
    target = body.get("target")
    metric = body.get("metric")
    op = body.get("op")
    if target not in TARGETS:
        raise HTTPException(400, "target không hợp lệ")
    if metric not in METRICS:
        raise HTTPException(400, "metric không hợp lệ")
    if op not in OPS:
        raise HTTPException(400, "op không hợp lệ")
    try:
        value = float(body.get("value"))
    except (TypeError, ValueError):
        raise HTTPException(400, "Cần nhập giá trị số")

    sb = get_supabase()
    pos_res = (sb.table("clan_rule_conditions").select("position").eq("clan_id", clan_id)
               .eq("target", target).order("position", desc=True).limit(1).execute())
    next_pos = (pos_res.data[0]["position"] + 1) if pos_res.data else 0
    row = {
        "clan_id": clan_id, "target": target, "metric": metric, "op": op,
        "value": value, "note": (body.get("note") or "").strip(), "position": next_pos,
    }
    res = sb.table("clan_rule_conditions").insert(row).execute()
    created = res.data[0]
    _log_system_history(sb, clan_id, "condition_added",
                         f"{_TARGET_LABELS_VI.get(target, target)}: {_condition_sentence(created)}")
    return created


@router.put("/conditions/{condition_id}")
async def update_condition(condition_id: int, request: Request, _: bool = Depends(require_admin)):
    clan_id = get_clan_id(request)
    body = await request.json()
    allowed = ["metric", "op", "value", "note"]
    update = {k: v for k, v in body.items() if k in allowed}
    if "metric" in update and update["metric"] not in METRICS:
        raise HTTPException(400, "metric không hợp lệ")
    if "op" in update and update["op"] not in OPS:
        raise HTTPException(400, "op không hợp lệ")
    if not update:
        raise HTTPException(400, "Không có gì để cập nhật")
    sb = get_supabase()
    res = sb.table("clan_rule_conditions").update(update).eq("id", condition_id).eq("clan_id", clan_id).execute()
    if not res.data:
        raise HTTPException(404, "Không tìm thấy điều kiện")
    updated = res.data[0]
    _log_system_history(sb, clan_id, "condition_updated",
                         f"{_TARGET_LABELS_VI.get(updated['target'], updated['target'])}: {_condition_sentence(updated)}")
    return updated


@router.delete("/conditions/{condition_id}")
async def delete_condition(condition_id: int, request: Request, _: bool = Depends(require_admin)):
    clan_id = get_clan_id(request)
    sb = get_supabase()
    existing = sb.table("clan_rule_conditions").select("*").eq("id", condition_id).eq("clan_id", clan_id).execute()
    sb.table("clan_rule_conditions").delete().eq("id", condition_id).eq("clan_id", clan_id).execute()
    if existing.data:
        c = existing.data[0]
        _log_system_history(sb, clan_id, "condition_removed",
                             f"{_TARGET_LABELS_VI.get(c['target'], c['target'])}: {_condition_sentence(c)}")
    return {"ok": True}


@router.get("/evaluate")
async def evaluate(request: Request):
    """Đối chiếu điều kiện đã cấu hình với dữ liệu thật — trả về 5 danh sách:
    elder/co_leader (đủ điều kiện thăng), demote_co_leader/demote_elder (không
    giữ được tiêu chuẩn, nên hạ cấp), violation (vi phạm, nguy cơ bị loại).
    Kèm `all_members` — snapshot chỉ số của TẤT CẢ thành viên (kể cả người
    chưa rơi vào danh sách nào) để FE tự đối chiếu khi tra cứu 1 người cụ thể.
    Công khai — ai xem cũng được. Ngoài phần này, job nền `poll_rule_auto_history`
    (schedulers/poller.py) còn tự đối chiếu 5 danh sách này với dữ liệu CoC API
    mới nhất để tự ghi lịch sử khi 1 người ĐÃ THẬT SỰ được thăng/hạ/loại khỏi
    clan trong game — xem services/rule_engine.py::sync_rule_auto_history."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    return await evaluate_rules(sb, clan_id)


@router.get("/history")
async def list_history(request: Request):
    """Lịch sử Admin đã xác nhận xử lý (thăng/hạ/loại) — công khai xem được."""
    clan_id = get_clan_id(request)
    sb = get_supabase()
    res = (sb.table("clan_rule_history").select("*").eq("clan_id", clan_id)
           .order("created_at", desc=True).limit(200).execute())
    return res.data or []


@router.post("/history")
async def add_history(request: Request, _: bool = Depends(require_admin)):
    clan_id = get_clan_id(request)
    body = await request.json()
    action = body.get("action")
    if action not in ACTIONS:
        raise HTTPException(400, "action không hợp lệ")
    player_tag = (body.get("player_tag") or "").strip()
    player_name = (body.get("player_name") or "").strip()
    if not player_tag or not player_name:
        raise HTTPException(400, "Cần tag và tên người chơi")
    row = {
        "clan_id": clan_id, "action": action, "player_tag": player_tag,
        "player_name": player_name, "note": (body.get("note") or "").strip(),
    }
    sb = get_supabase()
    res = sb.table("clan_rule_history").insert(row).execute()
    return res.data[0]


@router.delete("/history/{entry_id}")
async def delete_history(entry_id: int, request: Request, _: bool = Depends(require_admin)):
    clan_id = get_clan_id(request)
    sb = get_supabase()
    sb.table("clan_rule_history").delete().eq("id", entry_id).eq("clan_id", clan_id).execute()
    return {"ok": True}
