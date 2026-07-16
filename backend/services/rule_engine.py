"""
Engine đối chiếu điều kiện Nội quy (clan_rule_conditions) với dữ liệu THẬT
của từng thành viên — dùng chung giữa API GET /api/rules/evaluate (routers/
rules.py) và job nền tự động ghi lịch sử (schedulers/poller.py).

evaluate_rules(): tính 5 danh sách elder/co_leader/demote_co_leader/
demote_elder/violation + snapshot mọi thành viên — logic gốc chuyển từ
routers/rules.py, không đổi hành vi.

sync_rule_auto_history(): so sánh danh sách được gắn cờ ở lần gọi TRƯỚC (lưu
trong bảng clan_rule_flags) với lần này — nếu 1 người RỚT KHỎI danh sách vì
đã thật sự được lên/hạ cấp hoặc bị loại khỏi clan trong game (không phải vì
chỉ số cải thiện tự nhiên), tự động ghi 1 dòng vào clan_rule_history, không
cần Admin bấm tay."""
from datetime import datetime, timedelta
from clan_context import get_tag_by_clan_id
from services.coc_api import get_clan_members_resilient, get_raid_seasons
from services.reputation import get_all_totals

_ALREADY_ELDER_UP = {"admin", "coLeader", "leader"}
_ALREADY_COLEADER_UP = {"coLeader", "leader"}

# target -> action ghi vào clan_rule_history khi phát hiện đã xảy ra thật
_TARGET_ACTION = {
    "elder": "promote_elder",
    "co_leader": "promote_co_leader",
    "demote_co_leader": "demote_co_leader",
    "demote_elder": "demote_elder",
    "violation": "expel",
}


async def evaluate_rules(sb, clan_id: int) -> dict:
    conds_res = sb.table("clan_rule_conditions").select("*").eq("clan_id", clan_id).execute()
    conditions = conds_res.data or []
    empty = {"elder": [], "co_leader": [], "demote_co_leader": [], "demote_elder": [], "violation": [], "all_members": []}
    if not conditions:
        return empty

    cfg_res = sb.table("clan_rules").select("war_weeks").eq("clan_id", clan_id).execute()
    war_weeks = (cfg_res.data[0]["war_weeks"] if cfg_res.data else None) or 4

    tag = await get_tag_by_clan_id(clan_id)
    members = await get_clan_members_resilient(tag, clan_id=clan_id) if tag else []

    rep_totals = get_all_totals(sb, clan_id)

    cutoff = (datetime.utcnow() - timedelta(weeks=war_weeks)).isoformat()
    war_rows = (sb.table("war_participation_log").select("player_tag,attacks_used,attacks_allowed")
                .eq("clan_id", clan_id).gte("created_at", cutoff).execute().data or [])
    war_agg: dict[str, list[int]] = {}
    for r in war_rows:
        acc = war_agg.setdefault(r["player_tag"], [0, 0])
        acc[0] += r["attacks_used"] or 0
        acc[1] += r["attacks_allowed"] or 0
    war_attendance = {t: (round(used / allowed * 100, 1) if allowed > 0 else None)
                       for t, (used, allowed) in war_agg.items()}

    capital_loot: dict[str, int] = {}
    try:
        seasons = await get_raid_seasons(tag, clan_id=clan_id) if tag else []
        if seasons:
            for m in seasons[0].get("members", []):
                capital_loot[m["tag"]] = m.get("capitalResourcesLooted", 0)
    except Exception:
        pass

    def metric_value(metric: str, m: dict):
        if metric == "donate":
            return m.get("donations") or 0
        if metric == "cup":
            return m.get("trophies") or 0
        if metric == "reputation":
            return rep_totals.get(m["tag"], {}).get("total", 0)
        if metric == "capital":
            return capital_loot.get(m["tag"], 0)
        if metric == "war_attendance":
            return war_attendance.get(m["tag"])
        return None

    def check(cond: dict, m: dict) -> bool:
        v = metric_value(cond["metric"], m)
        if v is None:
            return False
        return v >= cond["value"] if cond["op"] == "gte" else v <= cond["value"]

    by_target: dict[str, list] = {}
    for c in conditions:
        by_target.setdefault(c["target"], []).append(c)

    def snapshot(m: dict) -> dict:
        return {
            "tag": m["tag"], "name": m["name"], "role": m.get("role", "member"),
            "townHallLevel": m.get("townHallLevel"),
            "donate": m.get("donations") or 0, "cup": m.get("trophies") or 0,
            "reputation": rep_totals.get(m["tag"], {}).get("total", 0),
            "capital": capital_loot.get(m["tag"], 0),
            "war_attendance": war_attendance.get(m["tag"]),
        }

    result = {"elder": [], "co_leader": [], "demote_co_leader": [], "demote_elder": [], "violation": [], "all_members": []}
    for m in members:
        role = m.get("role", "member")
        result["all_members"].append(snapshot(m))

        elder_conds = by_target.get("elder", [])
        if elder_conds and role not in _ALREADY_ELDER_UP and all(check(c, m) for c in elder_conds):
            result["elder"].append(snapshot(m))

        co_conds = by_target.get("co_leader", [])
        if co_conds and role not in _ALREADY_COLEADER_UP and all(check(c, m) for c in co_conds):
            result["co_leader"].append(snapshot(m))

        # Hạ cấp: chỉ xét đúng người ĐANG ở cấp đó, chỉ cần dính 1 điều kiện là bị gắn cờ.
        demote_co_conds = by_target.get("demote_co_leader", [])
        if demote_co_conds and role == "coLeader" and any(check(c, m) for c in demote_co_conds):
            result["demote_co_leader"].append(snapshot(m))

        demote_elder_conds = by_target.get("demote_elder", [])
        if demote_elder_conds and role == "admin" and any(check(c, m) for c in demote_elder_conds):
            result["demote_elder"].append(snapshot(m))

        vio_conds = by_target.get("violation", [])
        if vio_conds and role != "leader" and any(check(c, m) for c in vio_conds):
            result["violation"].append(snapshot(m))

    return result


async def sync_rule_auto_history(sb, clan_id: int):
    """Chạy định kỳ (xem poller.py) — phát hiện những người TỪNG bị gắn cờ
    (đủ điều kiện thăng/hạ/vi phạm) mà giờ dữ liệu CoC API cho thấy điều đó
    ĐÃ THẬT SỰ xảy ra trong game, rồi tự ghi vào clan_rule_history."""
    result = await evaluate_rules(sb, clan_id)
    roster_by_tag = {m["tag"]: m for m in result.get("all_members", [])}
    if not roster_by_tag:
        # Không lấy được roster nào — do chưa cấu hình điều kiện, hoặc CoC
        # API/proxy đang lỗi và cũng chưa có cache (xem get_clan_members_
        # resilient). TUYỆT ĐỐI không xử lý tiếp trong trường hợp này, vì nếu
        # không sẽ hiểu nhầm "mọi người đã rời clan" và tự ghi khai trừ hàng
        # loạt sai be bét. Bỏ qua chu kỳ này, cờ cũ vẫn giữ nguyên để đối
        # chiếu lại ở lần poll kế tiếp khi có dữ liệu thật.
        return

    prev_res = sb.table("clan_rule_flags").select("target,player_tag,player_name").eq("clan_id", clan_id).execute()
    prev_by_target: dict[str, dict[str, str]] = {}
    for row in (prev_res.data or []):
        prev_by_target.setdefault(row["target"], {})[row["player_tag"]] = row["player_name"]

    new_rows = []
    for target, action in _TARGET_ACTION.items():
        current = {m["tag"]: m["name"] for m in result.get(target, [])}
        previous = prev_by_target.get(target, {})

        for tag, name in previous.items():
            if tag in current:
                continue  # vẫn đang bị gắn cờ y như cũ, chưa có gì thay đổi
            member = roster_by_tag.get(tag)

            if target == "violation":
                confirmed = member is None  # không còn trong clan nữa = đã bị loại thật
            elif target == "demote_co_leader":
                confirmed = member is not None and member["role"] != "coLeader"
            elif target == "demote_elder":
                confirmed = member is not None and member["role"] != "admin"
            elif target == "elder":
                confirmed = member is not None and member["role"] in _ALREADY_ELDER_UP
            else:  # co_leader
                confirmed = member is not None and member["role"] in _ALREADY_COLEADER_UP

            if confirmed:
                try:
                    sb.table("clan_rule_history").insert({
                        "clan_id": clan_id, "action": action,
                        "player_tag": tag, "player_name": name,
                        "note": "Tự động ghi nhận theo dữ liệu CoC API",
                    }).execute()
                except Exception:
                    pass
            # Dù xác nhận được hay không (vd rời clan rồi vào lại, chỉ số tự
            # cải thiện...), người này đã rớt khỏi danh sách gắn cờ nên không
            # đưa vào new_rows — vòng gắn cờ tiếp theo sẽ tự thêm lại nếu vẫn
            # còn đủ điều kiện.

        for tag, name in current.items():
            new_rows.append({"clan_id": clan_id, "target": target, "player_tag": tag, "player_name": name})

    sb.table("clan_rule_flags").delete().eq("clan_id", clan_id).execute()
    if new_rows:
        sb.table("clan_rule_flags").insert(new_rows).execute()
