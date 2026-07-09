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


def _fmt_entry(rank: int, e: dict) -> str:
    return f"{rank}. **{e['player_name']}** — {e['value']}"


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
        mins = round(e["avg_duration"] / 60, 1) if e["attacks"] else 0
        return {"player_tag": e["player_tag"], "player_name": e["player_name"],
                "value": f"{e['stars']}⭐ · {e['three_star']} lần 3⭐ · {e['good_th']} đòn đánh nhà ngang/cao hơn · TB {mins} phút/đòn"}

    good = sorted(entries, key=lambda e: (-e["stars"], -e["three_star"], -e["good_th"], e["avg_duration"]))
    bad  = sorted(entries, key=lambda e: (e["stars"], e["three_star"], e["good_th"], -e["avg_duration"]))
    return {"good": [fmt(e) for e in good[:5]], "bad": [fmt(e) for e in bad[:5]]}


async def _donate_category(clan_id: int) -> dict:
    tag = await get_tag_by_clan_id(clan_id)
    if not tag:
        return {"good": [], "bad": []}
    members = await get_clan_members(tag, clan_id=clan_id)
    good = sorted(members, key=lambda m: -(m.get("donations", 0) or 0))
    bad  = sorted(members, key=lambda m: (m.get("donations", 0) or 0))

    def fmt(m):
        return {"player_tag": m["tag"], "player_name": m["name"], "value": f"{m.get('donations', 0)} donate"}
    return {"good": [fmt(m) for m in good[:5]], "bad": [fmt(m) for m in bad[:5]]}


async def _capital_category(clan_id: int) -> dict:
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
                                     "value": f"{stars}⭐ ({destr}% phá huỷ) vs {opp}"}
        else:
            stars, destr, atk = r.get("best_defense_stars"), r.get("best_defense_destruction"), r.get("best_defense_attacker")
            if stars is None:
                continue
            # Phòng thủ tốt = đối phương đạt CÀNG ÍT sao/% phá huỷ càng tốt
            key = (-stars, -(destr or 0))
            cur = best_by_tag.get(tag)
            if not cur or key > cur["key"]:
                best_by_tag[tag] = {"key": key, "player_tag": tag, "player_name": r["player_name"],
                                     "value": f"Chỉ mất {stars}⭐ ({destr}%) trước {atk}"}
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


def _build_message(report: dict) -> str:
    lines = ["📊 **BÁO CÁO TUẦN**\n"]
    for key, (icon, label) in CATEGORY_LABELS.items():
        cat = report.get(key) or {"good": [], "bad": []}
        lines.append(f"\n{icon} **{label}**")
        if cat["good"]:
            lines.append("✅ Tốt:")
            lines += [_fmt_entry(i + 1, e) for i, e in enumerate(cat["good"])]
        if cat["bad"]:
            lines.append("⚠️ Cần cố gắng:")
            lines += [_fmt_entry(i + 1, e) for i, e in enumerate(cat["bad"])]
    return "\n".join(lines)


async def generate_weekly_report(clan_id: int = 1) -> dict:
    """Tổng hợp + lưu + gửi báo cáo tuần cho 1 clan. Trả về report đã lưu."""
    sb = get_supabase()
    now = datetime.datetime.utcnow()
    period_start = now - datetime.timedelta(days=7)
    period_start_iso = period_start.isoformat()

    report = {
        "war":          await _war_category(sb, clan_id, period_start_iso),
        "donate":       await _donate_category(clan_id),
        "capital":      await _capital_category(clan_id),
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

    message = _build_message(report)
    try:
        await notify_all(message, discord_color=0xF4A130, title="📊 Báo cáo thống kê tuần", clan_id=clan_id)
    except Exception as e:
        log.error(f"notify_all weekly report error (clan_id={clan_id}): {e}")
    try:
        await send_push_to_clan(clan_id, "📊 Báo cáo thống kê tuần", "Xem ai nổi bật tuần này — bấm để xem chi tiết!", "/weekly-report", "weekly_report")
    except Exception as e:
        log.error(f"push weekly report error (clan_id={clan_id}): {e}")

    return row
