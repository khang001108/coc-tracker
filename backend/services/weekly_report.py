"""
Báo cáo thống kê TUẦN — Top 5 "tốt" và Top 5 "xấu" (ngược lại) theo 6 tiêu chí:
  1. war        — War/CWL giỏi nhất (3 sao, đánh nhà ngang/cao hơn mình, thời gian nhanh)
  2. donate     — Donate nhiều nhất hiện tại (CoC tự reset hàng tuần nên dùng số hiện tại)
  3. capital    — Kiếm được Gold Clan Capital nhiều nhất (raid weekend gần nhất)
  4. best_attack  — Tấn công anh dũng nhất (đòn đánh chất lượng nhất trong tuần)
  5. best_defense — Phòng thủ anh dũng nhất (giữ được ít sao/ít % phá huỷ nhất)
  6. coins      — Kiếm Coins (tiền tệ trong app) nhiều nhất trong tuần

Mỗi tiêu chí đều có 2 chiều: "tốt" (xếp đầu) và "xấu" (ngược lại — xếp cuối/tệ nhất),
lấy Top 5 mỗi bên. Chạy tự động hàng tuần (xem schedulers/poller.py), lưu lại lịch sử
vào weekly_report_log để xem lại trong app, và gửi thông báo web + Telegram/Discord.
"""
import datetime
import logging
from supabase_client import get_supabase
from clan_context import get_tag_by_clan_id
from services.coc_api import get_clan_members, get_raid_seasons
from services.notify_service import notify_all
from services.push_service import send_push_to_clan

log = logging.getLogger("weekly_report")

CATEGORY_LABELS = {
    "war":          ("⚔️", "War/CWL giỏi nhất"),
    "donate":       ("💎", "Donate nhiều nhất"),
    "capital":      ("🏰", "Kiếm Capital nhiều nhất"),
    "best_attack":  ("💥", "Tấn công anh dũng nhất"),
    "best_defense": ("🛡️", "Phòng thủ anh dũng nhất"),
    "coins":        ("🪙", "Kiếm Coins nhiều nhất"),
}


async def _war_category(sb, clan_id: int, period_start_iso: str) -> dict:
    res = (sb.table("war_participation_log").select("*")
           .eq("clan_id", clan_id).gte("created_at", period_start_iso).execute())
    rows = res.data or []
    agg: dict = {}
    for r in rows:
        tag = r["player_tag"]
        e = agg.setdefault(tag, {"player_tag": tag, "player_name": r["player_name"],
                                  "stars": 0, "three_star": 0, "good_th": 0, "duration": 0, "attacks": 0})
        e["stars"]      += r.get("stars_earned", 0) or 0
        e["three_star"] += r.get("three_star_count", 0) or 0
        e["good_th"]    += r.get("good_th_attack_count", 0) or 0
        e["duration"]   += r.get("attack_duration_total", 0) or 0
        e["attacks"]    += r.get("attacks_used", 0) or 0
    entries = list(agg.values())
    for e in entries:
        e["avg_duration"] = (e["duration"] / e["attacks"]) if e["attacks"] else 9999

    def fmt(e):
        parts = [f"{e['stars']}⭐"]
        if e["three_star"] > 0:
            parts.append(f"{e['three_star']} lần 3⭐")
        if e["good_th"] > 0:
            parts.append(f"{e['good_th']} đòn ngang/cao hơn")
        if e["attacks"] > 0:
            mins = round(e["avg_duration"] / 60, 1)
            if mins > 0:
                parts.append(f"TB {mins}p")
        return {"player_tag": e["player_tag"], "player_name": e["player_name"], "value": " · ".join(parts)}

    good = sorted(entries, key=lambda e: (-e["stars"], -e["three_star"], -e["good_th"], e["avg_duration"]))
    bad  = sorted(entries, key=lambda e: (e["stars"], e["three_star"], e["good_th"], -e["avg_duration"]))
    return {"good": [fmt(e) for e in good[:5]], "bad": [fmt(e) for e in bad[:5]]}


async def _donate_category(sb, clan_id: int, week_ref: str) -> dict:
    tag = await get_tag_by_clan_id(clan_id)
    if not tag:
        return {"good": [], "bad": []}
    members = await get_clan_members(tag, clan_id=clan_id)
    good = sorted(members, key=lambda m: -(m.get("donations", 0) or 0))
    bad  = sorted(members, key=lambda m: (m.get("donations", 0) or 0))

    # Danh vọng: donate đủ 500/tuần (+2 mỗi người đạt) + Top đóng góp tuần (+10 cho #1)
    try:
        from services.reputation import add_reputation
        for m in members:
            if (m.get("donations", 0) or 0) >= 500:
                add_reputation(sb, clan_id, m["tag"], m["name"], "donate_500", ref_key=week_ref)
        if good and (good[0].get("donations", 0) or 0) > 0:
            add_reputation(sb, clan_id, good[0]["tag"], good[0]["name"], "top_weekly_donor", ref_key=week_ref)
    except Exception as e:
        log.error(f"donate reputation error (clan_id={clan_id}): {e}")

    def fmt(m):
        return {"player_tag": m["tag"], "player_name": m["name"], "value": f"{m.get('donations', 0)} donate"}
    return {"good": [fmt(m) for m in good[:5]], "bad": [fmt(m) for m in bad[:5]]}


async def _capital_category(sb, clan_id: int) -> dict:
    tag = await get_tag_by_clan_id(clan_id)
    if not tag:
        return {"good": [], "bad": []}
    try:
        seasons = await get_raid_seasons(tag, clan_id=clan_id)
    except Exception:
        return {"good": [], "bad": []}
    if not seasons:
        return {"good": [], "bad": []}
    members = seasons[0].get("members", [])
    good = sorted(members, key=lambda m: -(m.get("capitalResourcesLooted", 0) or 0))
    bad  = sorted(members, key=lambda m: (m.get("capitalResourcesLooted", 0) or 0))

    # Danh vọng: tham gia Raid Weekend (+3) — mỗi raid weekend chỉ tính 1 lần
    # nhờ ref_key = endTime của mùa raid đó. Có tên trong danh sách raid (tức
    # đang là thành viên clan lúc đó) nhưng KHÔNG tấn công lần nào → bị phạt.
    raid_ref = seasons[0].get("endTime") or seasons[0].get("startTime")
    if raid_ref:
        try:
            from services.reputation import add_reputation
            for m in members:
                if (m.get("attacks", 0) or 0) > 0:
                    add_reputation(sb, clan_id, m["tag"], m["name"], "raid_weekend", ref_key=raid_ref)
                else:
                    add_reputation(sb, clan_id, m["tag"], m["name"], "raid_registered_no_attack", ref_key=raid_ref)
        except Exception as e:
            log.error(f"raid reputation error (clan_id={clan_id}): {e}")

    def fmt(m):
        return {"player_tag": m["tag"], "player_name": m["name"], "value": f"{m.get('capitalResourcesLooted', 0)} gold"}
    return {"good": [fmt(m) for m in good[:5]], "bad": [fmt(m) for m in bad[:5]]}


async def _heroic_category(sb, clan_id: int, period_start_iso: str, kind: str) -> dict:
    """kind = 'attack' (tấn công anh dũng nhất) hoặc 'defense' (phòng thủ anh dũng nhất)."""
    res = (sb.table("war_participation_log").select("*")
           .eq("clan_id", clan_id).gte("created_at", period_start_iso).execute())
    rows = res.data or []
    best_by_tag: dict = {}
    for r in rows:
        tag = r["player_tag"]
        if kind == "attack":
            stars, destr = r.get("best_attack_stars"), r.get("best_attack_destruction")
            dur, opp = r.get("best_attack_duration"), r.get("best_attack_opponent")
            if stars is None:
                continue
            key = (stars, destr or 0, -(dur or 99999))
            cur = best_by_tag.get(tag)
            if not cur or key > cur["key"]:
                best_by_tag[tag] = {"key": key, "player_tag": tag, "player_name": r["player_name"],
                                     "value": f"{stars}⭐ {destr}% phá huỷ"}
        else:
            stars, destr, atk = r.get("best_defense_stars"), r.get("best_defense_destruction"), r.get("best_defense_attacker")
            if stars is None:
                continue
            # Phòng thủ tốt = đối phương đạt CÀNG ÍT sao/% phá huỷ càng tốt
            key = (-stars, -(destr or 0))
            cur = best_by_tag.get(tag)
            if not cur or key > cur["key"]:
                best_by_tag[tag] = {"key": key, "player_tag": tag, "player_name": r["player_name"],
                                     "value": f"Chỉ mất {stars}⭐ {destr}%"}
    entries = list(best_by_tag.values())
    ranked = sorted(entries, key=lambda e: e["key"], reverse=True)
    good = ranked[:5]
    bad = list(reversed(ranked))[:5]
    strip = lambda es: [{"player_tag": e["player_tag"], "player_name": e["player_name"], "value": e["value"]} for e in es]
    return {"good": strip(good), "bad": strip(bad)}


async def _coins_category(sb, clan_id: int) -> dict:
    res = sb.table("member_accounts").select("player_tag, player_name, coins").eq("clan_id", clan_id).execute()
    accounts = res.data or []
    base_res = sb.table("coin_weekly_baseline").select("player_tag, coins").eq("clan_id", clan_id).execute()
    baseline_by_tag = {b["player_tag"]: b.get("coins", 0) or 0 for b in (base_res.data or [])}

    entries = []
    for a in accounts:
        tag = a["player_tag"]
        cur = a.get("coins", 0) or 0
        base = baseline_by_tag.get(tag)
        # Chưa có mốc tuần trước (lần chạy đầu tiên) — bỏ qua, không tính được delta
        if base is None:
            continue
        earned = max(0, cur - base)
        entries.append({"player_tag": tag, "player_name": a.get("player_name", "?"), "earned": earned})

    good = sorted(entries, key=lambda e: -e["earned"])
    bad  = sorted(entries, key=lambda e: e["earned"])

    def fmt(e):
        return {"player_tag": e["player_tag"], "player_name": e["player_name"], "value": f"+{e['earned']} Coins"}

    # Cập nhật mốc coins hiện tại làm baseline cho tuần kế tiếp
    if accounts:
        rows = [{"clan_id": clan_id, "player_tag": a["player_tag"], "coins": a.get("coins", 0) or 0,
                  "updated_at": datetime.datetime.utcnow().isoformat()} for a in accounts]
        try:
            sb.table("coin_weekly_baseline").upsert(rows, on_conflict="clan_id,player_tag").execute()
        except Exception as e:
            log.error(f"coin baseline upsert error (clan_id={clan_id}): {e}")

    return {"good": [fmt(e) for e in good[:5]], "bad": [fmt(e) for e in bad[:5]]}


def _reputation_weekly_summary(sb, clan_id: int, period_start_iso: str) -> dict:
    """Tổng Danh vọng CỘNG và TRỪ riêng trong tuần (chỉ tính các dòng phát
    sinh trong kỳ báo cáo) — dùng cho tin nhắn Telegram/Discord."""
    res = (sb.table("member_reputation_log").select("player_tag,player_name,points")
           .eq("clan_id", clan_id).gte("created_at", period_start_iso).execute())
    gained: dict = {}
    lost: dict = {}
    for r in (res.data or []):
        tag = r["player_tag"]
        bucket = gained if r["points"] > 0 else lost if r["points"] < 0 else None
        if bucket is None:
            continue
        e = bucket.setdefault(tag, {"player_tag": tag, "player_name": r["player_name"], "total": 0})
        e["total"] += r["points"]
        e["player_name"] = r["player_name"]
    top_gained = sorted(gained.values(), key=lambda e: -e["total"])[:5]
    top_lost = sorted(lost.values(), key=lambda e: e["total"])[:5]
    return {"gained": top_gained, "lost": top_lost}


def _build_message(rep_summary: dict) -> str:
    """Tin nhắn gửi Telegram/Discord — theo yêu cầu CHỈ hiện Top 5 Danh vọng
    được cộng nhiều nhất và Top 5 bị trừ nhiều nhất trong tuần (đầy đủ 6 tiêu
    chí War/Donate/Capital/... xem trong app ở Thống kê → Báo cáo tuần)."""
    lines = ["🏵️ **DANH VỌNG TUẦN NÀY** (xem đầy đủ Top 5 các tiêu chí khác trong app, mục Thống kê)\n"]
    gained, lost = rep_summary.get("gained", []), rep_summary.get("lost", [])
    lines.append("📈 Được cộng nhiều nhất:")
    if gained:
        lines += [f"{i+1}. {e['player_name']} — +{e['total']}" for i, e in enumerate(gained)]
    else:
        lines.append("Chưa có dữ liệu")
    lines.append("\n📉 Bị trừ nhiều nhất:")
    if lost:
        lines += [f"{i+1}. {e['player_name']} — {e['total']}" for i, e in enumerate(lost)]
    else:
        lines.append("Không có ai bị trừ tuần này 🎉")
    return "\n".join(lines)


async def generate_weekly_report(clan_id: int = 1) -> dict:
    """Tổng hợp + lưu + gửi báo cáo tuần cho 1 clan. Trả về report đã lưu."""
    sb = get_supabase()
    now = datetime.datetime.utcnow()
    period_start = now - datetime.timedelta(days=7)
    period_start_iso = period_start.isoformat()
    week_ref = period_start.date().isoformat()  # mốc chống cộng trùng Danh vọng nếu tạo lại report cùng tuần

    report = {
        "war":          await _war_category(sb, clan_id, period_start_iso),
        "donate":       await _donate_category(sb, clan_id, week_ref),
        "capital":      await _capital_category(sb, clan_id),
        "best_attack":  await _heroic_category(sb, clan_id, period_start_iso, "attack"),
        "best_defense": await _heroic_category(sb, clan_id, period_start_iso, "defense"),
        "coins":        await _coins_category(sb, clan_id),
    }

    row = {
        "clan_id": clan_id,
        "period_start": period_start.isoformat(),
        "period_end": now.isoformat(),
        "report": report,
    }
    try:
        sb.table("weekly_report_log").insert(row).execute()
    except Exception as e:
        log.error(f"weekly_report_log insert error (clan_id={clan_id}): {e}")

    # Tin nhắn Telegram/Discord — CHỈ Top 5 Danh vọng cộng/trừ nhiều nhất tuần này
    rep_summary = _reputation_weekly_summary(sb, clan_id, period_start_iso)
    message = _build_message(rep_summary)
    try:
        await notify_all(message, discord_color=0xF4A130, title="🏵️ Danh vọng tuần này", clan_id=clan_id)
    except Exception as e:
        log.error(f"notify_all weekly report error (clan_id={clan_id}): {e}")
    try:
        await send_push_to_clan(clan_id, "📊 Báo cáo thống kê tuần", "Xem ai nổi bật tuần này — bấm để xem chi tiết!", "/weekly-report", "weekly_report")
    except Exception as e:
        log.error(f"push weekly report error (clan_id={clan_id}): {e}")

    return row
