"""
Chỉ số hoạt động — theo dõi xem thành viên có THẬT SỰ chơi mỗi ngày không,
dựa vào các chỉ số lẽ ra phải thay đổi liên tục khi online:
  - Donate (donations, từ roster CoC API — reset hàng tuần nhưng tăng dần
    trong tuần khi họ donate)
  - War attacks (tổng lượt tấn công War/CWL cộng dồn TỪ TRƯỚC TỚI NAY, từ
    war_participation_log — chỉ tăng khi có war MỚI kết thúc)
  - Capital Gold (capitalResourcesLooted mùa Raid GẦN NHẤT — chỉ đổi trong
    những ngày có Raid Weekend diễn ra)

Mỗi ngày, so YÊM NAY với HÔM QUA: CHỈ CẦN 1 trong 3 chỉ số trên tăng lên là
tính "có hoạt động" ngày đó. Không thì tính "không hoạt động".

percent (0-100): +100/N mỗi ngày có hoạt động, -100/N mỗi ngày không (N =
settings key activity_days_to_full, mặc định 6) — đủ N ngày liên tục hoạt
động là đạt 100%.
  - Đang giữ ≥100%: +2 Danh vọng MỖI NGÀY (chỉ 1 lần/ngày).
  - Tụt XUỐNG dưới ngưỡng (settings key activity_penalty_threshold, mặc
    định 20%): -3 Danh vọng (chỉ 1 lần/lần tụt — reset cờ khi vượt lại
    ngưỡng, để nếu tụt xuống lần nữa vẫn bị trừ tiếp).
"""
from datetime import datetime, date, timedelta


def get_activity_settings(sb) -> tuple[int, float]:
    """(days_to_full, penalty_threshold_percent) — admin chỉnh được ở Cài đặt."""
    try:
        res = sb.table("settings").select("key,value").in_(
            "key", ["activity_days_to_full", "activity_penalty_threshold"]
        ).execute()
        vals = {r["key"]: r["value"] for r in (res.data or [])}
        days = int(vals.get("activity_days_to_full", 6) or 6)
        threshold = float(vals.get("activity_penalty_threshold", 20) or 20)
        return max(1, days), max(0.0, min(100.0, threshold))
    except Exception:
        return 6, 20.0


async def run_daily_activity_update(sb, clan_id: int):
    """Chạy 1 lần/ngày (xem schedulers/poller.py::poll_activity_index) — chụp
    snapshot hôm nay, so với hôm qua, cập nhật % hoạt động + cộng/trừ Danh
    vọng theo ngưỡng."""
    from clan_context import get_tag_by_clan_id
    from services.coc_api import get_clan_members_resilient, get_raid_seasons
    from services.reputation import add_reputation

    tag = await get_tag_by_clan_id(clan_id)
    if not tag:
        return
    members = await get_clan_members_resilient(tag, clan_id=clan_id)
    if not members:
        return

    today = date.today()
    yesterday = today - timedelta(days=1)

    # Capital Gold mùa Raid gần nhất
    capital_loot: dict[str, int] = {}
    try:
        seasons = await get_raid_seasons(tag, clan_id=clan_id)
        if seasons:
            for m in seasons[0].get("members", []):
                capital_loot[m["tag"]] = m.get("capitalResourcesLooted", 0)
    except Exception:
        pass

    # War attacks cộng dồn ALL-TIME theo từng người (1 query, group ở Python)
    war_totals: dict[str, int] = {}
    try:
        start = 0
        page_size = 1000
        while True:
            batch = (sb.table("war_participation_log").select("player_tag,attacks_used")
                     .eq("clan_id", clan_id).range(start, start + page_size - 1).execute()).data or []
            for r in batch:
                war_totals[r["player_tag"]] = war_totals.get(r["player_tag"], 0) + (r["attacks_used"] or 0)
            if len(batch) < page_size:
                break
            start += page_size
    except Exception:
        pass

    # Snapshot hôm qua (để so sánh) — 1 query cho cả clan
    prev_by_tag: dict[str, dict] = {}
    try:
        prev_res = (sb.table("activity_daily_snapshot").select("*").eq("clan_id", clan_id)
                    .eq("snapshot_date", yesterday.isoformat()).execute())
        for r in (prev_res.data or []):
            prev_by_tag[r["player_tag"]] = r
    except Exception:
        pass

    # Trạng thái activity_index hiện có — 1 query cho cả clan
    idx_by_tag: dict[str, dict] = {}
    try:
        idx_res = sb.table("activity_index").select("*").eq("clan_id", clan_id).execute()
        for r in (idx_res.data or []):
            idx_by_tag[r["player_tag"]] = r
    except Exception:
        pass

    days_to_full, threshold = get_activity_settings(sb)
    step = 100.0 / days_to_full

    for m in members:
        tag_, name_ = m["tag"], m["name"]
        donations = m.get("donations") or 0
        war_attacks = war_totals.get(tag_, 0)
        gold = capital_loot.get(tag_, 0)

        # Ghi snapshot hôm nay (idempotent — UNIQUE constraint tự chặn trùng)
        try:
            sb.table("activity_daily_snapshot").upsert({
                "clan_id": clan_id, "player_tag": tag_, "player_name": name_,
                "snapshot_date": today.isoformat(),
                "donations": donations, "war_attacks": war_attacks, "capital_gold": gold,
            }, on_conflict="clan_id,player_tag,snapshot_date").execute()
        except Exception:
            continue

        idx = idx_by_tag.get(tag_)
        if idx and idx.get("last_updated_date") == today.isoformat():
            continue  # đã tính cho hôm nay rồi (job chạy lại nhiều lần trong ngày không tính 2 lần)

        prev = prev_by_tag.get(tag_)
        if prev is None:
            # Chưa có dữ liệu hôm qua để so sánh (mới bắt đầu theo dõi) — bỏ
            # qua ngày đầu tiên, không cộng/trừ, chỉ lưu snapshot làm mốc.
            continue

        active_today = (donations > (prev.get("donations") or 0)
                         or war_attacks > (prev.get("war_attacks") or 0)
                         or gold > (prev.get("capital_gold") or 0))

        current_percent = float(idx["percent"]) if idx else 0.0
        new_percent = min(100.0, current_percent + step) if active_today else max(0.0, current_percent - step)

        below_flag = bool(idx["below_penalty_flag"]) if idx else False
        last_full_date = idx.get("last_full_reward_date") if idx else None

        # Đạt/duy trì ≥100% — thưởng +2 Danh vọng/ngày (chỉ 1 lần/ngày)
        if new_percent >= 100.0 and last_full_date != today.isoformat():
            add_reputation(sb, clan_id, tag_, name_, "daily_activity", 2, note="Hoạt động đều mỗi ngày")
            last_full_date = today.isoformat()

        # Tụt xuống dưới ngưỡng — phạt -3 Danh vọng (chỉ 1 lần/lần tụt)
        if new_percent < threshold and not below_flag:
            add_reputation(sb, clan_id, tag_, name_, "activity_drop", -3, note=f"Chỉ số hoạt động tụt dưới {threshold:.0f}%")
            below_flag = True
        elif new_percent >= threshold:
            below_flag = False  # vượt lại ngưỡng — reset cờ để lần tụt SAU vẫn bị phạt tiếp

        sb.table("activity_index").upsert({
            "player_tag": tag_, "clan_id": clan_id, "player_name": name_,
            "percent": round(new_percent, 1), "last_updated_date": today.isoformat(),
            "last_full_reward_date": last_full_date, "below_penalty_flag": below_flag,
        }, on_conflict="player_tag").execute()
