"""
Background scheduler: polls CoC API and stores snapshots.
Runs every 5 min for war/raid, 15 min for clan overview.

Đa clan: mọi job đều lặp qua TẤT CẢ clan trong bảng `clans` (get_all_clans()),
không chỉ clan #1 — để mỗi clan đều có nhật ký thành viên, thông báo war/raid,
donate, và coin thưởng sao war hoạt động độc lập, đúng của clan đó.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import asyncio
from services.coc_api import get_clan, get_current_war, get_raid_seasons, get_clan_members, get_coc_config, get_cwl_group, get_cwl_war
from services.notify_service import notify_war_attack_reminder, notify_raid_reminder, notify_member_join, notify_member_leave, notify_donate_coins, notify_war_coins
from services.push_service import send_push_to_clan
from services.weekly_report import generate_weekly_report
from supabase_client import get_supabase
from datetime import datetime, timedelta
import json, logging

log = logging.getLogger("poller")
scheduler = AsyncIOScheduler()

async def start_scheduler():
    sb = get_supabase()

    def _cfg_minutes(key: str, default: int) -> int:
        try:
            res = sb.table("settings").select("value").eq("key", key).execute()
            if res.data and res.data[0]["value"].isdigit():
                return max(1, int(res.data[0]["value"]))
        except Exception:
            pass
        return default

    donate_minutes = _cfg_minutes("poll_interval_donate_minutes", 10)
    members_minutes = _cfg_minutes("poll_interval_members_minutes", 10)

    scheduler.add_job(poll_clan,      IntervalTrigger(minutes=15), id="poll_clan",      replace_existing=True)
    scheduler.add_job(poll_war,       IntervalTrigger(minutes=5),  id="poll_war",       replace_existing=True)
    scheduler.add_job(poll_war_stars, IntervalTrigger(minutes=5),  id="poll_war_stars", replace_existing=True)
    scheduler.add_job(poll_raid,      IntervalTrigger(minutes=10), id="poll_raid",      replace_existing=True)
    scheduler.add_job(poll_members,   IntervalTrigger(minutes=members_minutes), id="poll_members",   replace_existing=True)
    scheduler.add_job(poll_donations, IntervalTrigger(minutes=donate_minutes),  id="poll_donations", replace_existing=True)
    scheduler.add_job(poll_asset_cleanup, IntervalTrigger(hours=6), id="poll_asset_cleanup", replace_existing=True)
    scheduler.add_job(poll_leave_reputation_penalty, IntervalTrigger(hours=6), id="poll_leave_reputation_penalty", replace_existing=True)
    scheduler.add_job(poll_stats_cleanup, IntervalTrigger(hours=12), id="poll_stats_cleanup", replace_existing=True)
    scheduler.add_job(poll_reward_history_cleanup, IntervalTrigger(hours=12), id="poll_reward_history_cleanup", replace_existing=True)
    scheduler.add_job(poll_global_chat_cleanup, IntervalTrigger(hours=1), id="poll_global_chat_cleanup", replace_existing=True)
    # Báo cáo thống kê tuần — chạy tự động mỗi thứ 2 lúc 08:00 (giờ server),
    # tổng hợp Top 5 tốt/xấu của tuần vừa qua cho TỪNG clan.
    scheduler.add_job(poll_weekly_report, CronTrigger(day_of_week="mon", hour=8, minute=0), id="poll_weekly_report", replace_existing=True)
    # Danh vọng — 2 khoản chỉ tính được theo THÁNG (Clan Games + Top đóng góp
    # tháng) chạy vào 0h ngày 1 hàng tháng.
    scheduler.add_job(poll_monthly_reputation, CronTrigger(day=1, hour=0, minute=30), id="poll_monthly_reputation", replace_existing=True)
    scheduler.add_job(poll_trophy_season_snapshot, CronTrigger(day=1, hour=0, minute=45), id="poll_trophy_season_snapshot", replace_existing=True)
    # Pháp Điển — đối chiếu ai từng bị gắn cờ đủ điều kiện thăng/hạ/vi phạm
    # với dữ liệu CoC API mới nhất, tự ghi Lịch sử khi điều đó ĐÃ THẬT SỰ xảy
    # ra trong game (không cần Admin bấm tay xác nhận nữa).
    scheduler.add_job(poll_rule_auto_history, IntervalTrigger(minutes=20), id="poll_rule_auto_history", replace_existing=True)
    # Job "canh" cấu hình — cho phép đổi chu kỳ quét Donate/Thành viên trong Cài
    # đặt có hiệu lực NGAY, không cần khởi động lại server.
    scheduler.add_job(poll_check_intervals, IntervalTrigger(minutes=2), id="poll_check_intervals", replace_existing=True)
    scheduler.start()

async def poll_check_intervals():
    """Kiểm tra xem admin có vừa đổi chu kỳ quét Donate/Thành viên trong Cài
    đặt không — nếu có thì áp dụng ngay, không cần khởi động lại server."""
    sb = get_supabase()

    def _cfg_minutes(key: str, default: int) -> int:
        try:
            res = sb.table("settings").select("value").eq("key", key).execute()
            if res.data and res.data[0]["value"].isdigit():
                return max(1, int(res.data[0]["value"]))
        except Exception:
            pass
        return default

    for job_id, key, default in [
        ("poll_donations", "poll_interval_donate_minutes", 10),
        ("poll_members", "poll_interval_members_minutes", 10),
    ]:
        wanted = _cfg_minutes(key, default)
        job = scheduler.get_job(job_id)
        if job and getattr(job.trigger, "interval", None):
            current_minutes = job.trigger.interval.total_seconds() / 60
            if abs(current_minutes - wanted) >= 1:
                scheduler.reschedule_job(job_id, trigger=IntervalTrigger(minutes=wanted))
                log.info(f"Đã đổi chu kỳ {job_id} sang {wanted} phút")
    log.info("Scheduler started")

async def stop_scheduler():
    scheduler.shutdown()

# ── Helpers ───────────────────────────────────────────────────────────────────

async def get_all_clans() -> list:
    """Lấy tất cả clan từ bảng clans để poll."""
    sb = get_supabase()
    try:
        res = sb.table("clans").select(
            "id, clan_tag, coc_api_key, discord_webhook, "
            "telegram_bot_token, telegram_chat_id, "
            "notify_war, notify_raid, notify_join_leave"
        ).execute()
        if res.data:
            return res.data
    except Exception:
        pass
    # Fallback về settings table nếu clans table chưa có / rỗng
    from services.coc_api import get_coc_config
    cfg = await get_coc_config()
    return [{"id": 1, "clan_tag": cfg.get("clan_tag", ""), "coc_api_key": cfg.get("coc_api_key", "")}]

async def get_tag() -> str | None:
    """Lấy tag của clan chính (id=1) — backward compat cho chỗ nào chưa multi-clan hoá."""
    clans = await get_all_clans()
    return clans[0].get("clan_tag") if clans else None

def _hours_until(coc_time: str) -> float | None:
    """CoC trả thời gian dạng '20260704T182300.000Z' (không có dấu - hay :) —
    parse ra rồi tính còn bao nhiêu giờ nữa tới lúc đó. Trả None nếu parse lỗi."""
    if not coc_time:
        return None
    try:
        dt = datetime.strptime(coc_time, "%Y%m%dT%H%M%S.%fZ")
        return (dt - datetime.utcnow()).total_seconds() / 3600
    except Exception:
        return None


def _parse_coc_dt(coc_time: str):
    if not coc_time:
        return None
    try:
        return datetime.strptime(coc_time, "%Y%m%dT%H%M%S.%fZ")
    except Exception:
        return None


def _check_early_attacks(sb, clan_id: int, war_data: dict, war_type: str):
    """Thưởng Danh vọng cho đòn đánh SỚM trong war (trong N giờ đầu kể từ
    lúc war bắt đầu, mặc định 12h — admin chỉnh được) — đánh càng sớm thưởng
    càng cao. Gọi lặp lại mỗi lần poll (5 phút/lần) trong lúc war đang diễn
    ra vẫn AN TOÀN nhờ ref_key gắn với war_end_time + player_tag + order
    (UNIQUE constraint tự chặn cộng trùng cho cùng 1 đòn đánh).

    LƯU Ý: CoC API không trả về thời điểm THẬT của từng đòn đánh (chỉ có
    'order' — thứ tự đánh), nên đây là ước lượng dựa trên thời điểm poll
    phát hiện ra đòn đánh đó (trễ tối đa ~5 phút so với thực tế — đủ chính
    xác cho ngưỡng tính theo giờ)."""
    end_time = war_data.get("endTime")
    start_time = war_data.get("startTime")
    if not end_time or not start_time:
        return
    start_dt = _parse_coc_dt(start_time)
    if not start_dt:
        return
    elapsed_hours = (datetime.utcnow() - start_dt).total_seconds() / 3600
    if elapsed_hours < 0:
        return  # war chưa thật sự bắt đầu (đang preparation lẫn vào)

    try:
        from services.reputation import add_reputation, get_early_attack_hours
        threshold = get_early_attack_hours(sb)
        reason = "war_early_attack" if elapsed_hours <= threshold else "war_late_attack"
        for m in war_data.get("clan", {}).get("members", []):
            tag_, name_ = m.get("tag"), m.get("name", "?")
            for a in m.get("attacks", []):
                order = a.get("order")
                if order is None:
                    continue
                add_reputation(sb, clan_id, tag_, name_, reason, ref_key=f"{end_time}-{tag_}-{order}")
    except Exception as e:
        log.error(f"_check_early_attacks error (clan_id={clan_id}): {e}")


def should_notify_once(sb, clan_id: int, notify_type: str, ref_key: str) -> bool:
    """Chỉ cho gửi thông báo 1 LẦN cho cùng 1 war/raid — trước đây mỗi vòng
    poll (5 phút/lần) đủ điều kiện là gửi lại, có thể spam hàng chục lần
    trong 1 war/raid dài. Trả về True nếu ĐÂY LÀ LẦN ĐẦU (nên gửi), False
    nếu đã gửi rồi (bỏ qua)."""
    if not ref_key:
        return True
    try:
        sb.table("notify_dedup").insert({"clan_id": clan_id, "notify_type": notify_type, "ref_key": ref_key}).execute()
        return True
    except Exception:
        return False  # đã tồn tại (unique constraint) → đã gửi trước đó rồi


def upsert_snapshot(table: str, data: dict, clan_id: int = 1):
    sb = get_supabase()
    # Các bảng snapshot_* không có cột UNIQUE nên upsert() sẽ tạo dòng MỚI mỗi lần
    # thay vì cập nhật — xoá hết dòng cũ CỦA CLAN NÀY trước khi chèn (nếu bảng có
    # cột clan_id), tránh việc đọc dữ liệu trả về dòng cũ / clan khác.
    try:
        sb.table(table).delete().eq("clan_id", clan_id).execute()
        sb.table(table).insert({
            "data": json.dumps(data),
            "updated_at": datetime.utcnow().isoformat(),
            "clan_id": clan_id,
        }).execute()
    except Exception:
        # Bảng chưa có cột clan_id (chưa chạy migration multi-clan) — fallback
        # về hành vi cũ: chỉ giữ 1 dòng duy nhất, dùng cho clan #1.
        if clan_id != 1:
            raise
        sb.table(table).delete().neq("id", 0).execute()
        sb.table(table).insert({
            "data": json.dumps(data),
            "updated_at": datetime.utcnow().isoformat(),
        }).execute()

# ── Poll jobs (lặp qua tất cả clan) ─────────────────────────────────────────────

async def poll_clan():
    clans = await get_all_clans()
    for c in clans:
        try:
            tag = c.get("clan_tag")
            if not tag: continue
            data = await get_clan(tag, clan_id=c["id"])
            upsert_snapshot("snapshot_clan", data, clan_id=c["id"])
            log.info(f"Clan snapshot updated (clan_id={c['id']})")
        except Exception as e:
            log.error(f"poll_clan error (clan_id={c.get('id')}): {e}")

def _best_attack(attacks: list, name_by_tag: dict) -> dict | None:
    """Đòn đánh 'anh dũng nhất' trong 1 danh sách đòn: sao cao nhất → % phá
    huỷ cao nhất → thời gian đánh nhanh nhất (CoC API không có sẵn chỉ số
    này, đây là công thức tự tính theo yêu cầu người dùng)."""
    if not attacks:
        return None
    best = max(attacks, key=lambda a: (a.get("stars", 0), a.get("destructionPercentage", 0), -a.get("duration", 99999)))
    return {
        "stars": best.get("stars", 0),
        "destruction": best.get("destructionPercentage", 0),
        "duration": best.get("duration", 0),
        "opponent": name_by_tag.get(best.get("defenderTag"), "?"),
    }


def _best_defense(all_opponent_attacks: list, member_tag: str, name_by_tag: dict) -> dict | None:
    """Lượt phòng thủ 'anh dũng nhất' của 1 người — trong các đòn đối phương
    đánh vào căn cứ người đó, chọn đòn mà đối phương đạt ÍT sao/ít % phá huỷ
    nhất (tức phòng thủ tốt nhất)."""
    defenses = [a for a in all_opponent_attacks if a.get("defenderTag") == member_tag]
    if not defenses:
        return None
    best = min(defenses, key=lambda a: (a.get("stars", 0), a.get("destructionPercentage", 0)))
    return {
        "stars": best.get("stars", 0),
        "destruction": best.get("destructionPercentage", 0),
        "attacker": name_by_tag.get(best.get("attackerTag"), "?"),
    }


def _log_war_participation(sb, clan_id: int, war_data: dict, war_type: str = "random", season: str | None = None):
    """Ghi lại lượt tham chiến của từng thành viên khi 1 war đã kết thúc (hoặc
    đang ở battle day cuối) — dùng upsert nên gọi lặp lại nhiều lần (mỗi lần
    poll) vẫn an toàn, không bị nhân đôi dữ liệu. Đồng thời tính sẵn đòn đánh/
    phòng thủ 'anh dũng nhất' của từng người, và ghi tổng kết war vào
    war_history_log.

    Từ PART 21: tính thêm 3 chỉ số phục vụ "Thống kê tuần — War/CWL giỏi
    nhất" (CoC API không có sẵn, tự tính theo yêu cầu người dùng):
      - three_star_count      : số lượt đánh đạt trọn 3 sao
      - good_th_attack_count  : số lượt đánh vào nhà NGANG hoặc CAO HƠN nhà
                                mình (so townhallLevel người đánh vs người bị đánh)
      - attack_duration_total : tổng thời gian (giây) các lượt đã đánh, để
                                sau này tính trung bình (thời gian càng ngắn
                                càng tốt khi xếp hạng)."""
    end_time = war_data.get("endTime")
    if not end_time:
        return
    attacks_allowed = war_data.get("attacksPerMember") or (1 if war_type == "cwl" else 2)
    clan = war_data.get("clan", {})
    opponent = war_data.get("opponent", {})
    members = clan.get("members", [])

    name_by_tag = {m.get("tag"): m.get("name", "?") for m in members}
    name_by_tag.update({m.get("tag"): m.get("name", "?") for m in opponent.get("members", [])})
    th_by_tag = {m.get("tag"): m.get("townhallLevel") for m in members}
    th_by_tag.update({m.get("tag"): m.get("townhallLevel") for m in opponent.get("members", [])})
    opponent_attacks = [a for m in opponent.get("members", []) for a in m.get("attacks", [])]

    rows = []
    for m in members:
        attacks = m.get("attacks", [])
        ba = _best_attack(attacks, name_by_tag)
        bd = _best_defense(opponent_attacks, m.get("tag"), name_by_tag)
        own_th = m.get("townhallLevel")
        three_star_count = sum(1 for a in attacks if a.get("stars", 0) >= 3)
        good_th_attack_count = sum(
            1 for a in attacks
            if th_by_tag.get(a.get("defenderTag")) is not None and own_th is not None
            and th_by_tag.get(a.get("defenderTag")) >= own_th
        )
        attack_duration_total = sum(a.get("duration", 0) for a in attacks)
        rows.append({
            "clan_id": clan_id, "war_end_time": end_time, "war_type": war_type,
            "player_tag": m.get("tag"), "player_name": m.get("name", "?"),
            "attacks_used": len(attacks), "attacks_allowed": attacks_allowed,
            "stars_earned": sum(a.get("stars", 0) for a in attacks),
            "best_attack_stars": ba["stars"] if ba else None,
            "best_attack_destruction": ba["destruction"] if ba else None,
            "best_attack_duration": ba["duration"] if ba else None,
            "best_attack_opponent": ba["opponent"] if ba else None,
            "best_defense_stars": bd["stars"] if bd else None,
            "best_defense_destruction": bd["destruction"] if bd else None,
            "best_defense_attacker": bd["attacker"] if bd else None,
            "three_star_count": three_star_count,
            "good_th_attack_count": good_th_attack_count,
            "attack_duration_total": attack_duration_total,
            "own_townhall": own_th,
        })
    if rows:
        try:
            sb.table("war_participation_log").upsert(rows, on_conflict="clan_id,war_end_time,player_tag").execute()
        except Exception as e:
            # Cột best_attack_*/best_defense_*/three_star_count/... có thể chưa
            # tồn tại (chưa chạy hết migration) — thử lại chỉ với các cột cũ
            # nhất để không chặn hẳn việc ghi log.
            try:
                basic_rows = [{k: v for k, v in r.items() if not k.startswith("best_") and k not in
                               ("three_star_count", "good_th_attack_count", "attack_duration_total", "own_townhall")}
                              for r in rows]
                sb.table("war_participation_log").upsert(basic_rows, on_conflict="clan_id,war_end_time,player_tag").execute()
            except Exception as e2:
                log.error(f"_log_war_participation error (clan_id={clan_id}): {e2}")

    clan_stars, opp_stars = clan.get("stars", 0), opponent.get("stars", 0)
    result = "win" if clan_stars > opp_stars else ("lose" if clan_stars < opp_stars else "tie")
    history_row = {
        "clan_id": clan_id, "war_end_time": end_time, "war_type": war_type,
        "opponent_name": opponent.get("name"), "opponent_tag": opponent.get("tag"),
        "opponent_badge": (opponent.get("badgeUrls") or {}).get("small"),
        "team_size": war_data.get("teamSize"),
        "clan_stars": clan_stars, "opponent_stars": opp_stars,
        "clan_destruction": clan.get("destructionPercentage"),
        "opponent_destruction": opponent.get("destructionPercentage"),
        "result": result, "season": season,
    }
    try:
        sb.table("war_history_log").upsert(history_row, on_conflict="clan_id,war_end_time").execute()
    except Exception:
        try:
            # Chưa chạy migration PART 28/29 (chưa có cột season/opponent_badge) — thử lại không có nó
            sb.table("war_history_log").upsert(
                {k: v for k, v in history_row.items() if k not in ("season", "opponent_badge")},
                on_conflict="clan_id,war_end_time"
            ).execute()
        except Exception as e:
            log.error(f"_log_war_history error (clan_id={clan_id}): {e}")

    # Danh vọng: tham gia/thắng/3 sao/bỏ lượt — mỗi war chỉ tính 1 lần nhờ
    # ref_key=war_end_time (UNIQUE cùng player_tag+reason nên poll lại vẫn an toàn).
    try:
        from services.reputation import add_reputation, get_points as get_rep_points
        rep_points = get_rep_points(sb)
        is_cwl = war_type == "cwl"
        for m in members:
            tag_, name_ = m.get("tag"), m.get("name", "?")
            attacks = m.get("attacks", [])
            three_stars = sum(1 for a in attacks if a.get("stars", 0) >= 3)
            if len(attacks) == 0:
                # Bỏ lượt — chỉ tính nếu war đã thật sự kết thúc (có endTime, đã lọc ở trên)
                add_reputation(sb, clan_id, tag_, name_, "cwl_skip" if is_cwl else "war_skip", ref_key=end_time)
                continue
            add_reputation(sb, clan_id, tag_, name_, "cwl_participate" if is_cwl else "war_participate", ref_key=end_time)
            if result == "win":
                add_reputation(sb, clan_id, tag_, name_, "war_win", ref_key=end_time)
            if three_stars > 0:
                reason = "cwl_three_star" if is_cwl else "three_star"
                add_reputation(sb, clan_id, tag_, name_, reason, ref_key=end_time, points=rep_points[reason] * three_stars)
    except Exception as e:
        log.error(f"reputation scoring error (clan_id={clan_id}, war_end_time={end_time}): {e}")


async def _check_cwl_season_completed(sb, clan_id: int, tag: str):
    """Ghi lại 1 mùa CWL THẬT đã kết thúc (leaguegroup.state == 'ended') —
    dùng làm mốc đếm '1 lần WCL' cho hệ thống xoay vòng huy chương (PART 23),
    tách khỏi việc tạo/kết thúc sự kiện trong app vì admin có thể không tạo
    sự kiện CWL nào cả nhưng mùa CWL thật vẫn diễn ra và cần được đếm.
    Upsert với UNIQUE(clan_id, season) nên gọi lặp lại (mỗi lần poll) vẫn an
    toàn, không bị đếm trùng."""
    try:
        group = await get_cwl_group(tag, clan_id=clan_id)
    except Exception:
        return
    season = group.get("season")
    if group.get("state") == "ended" and season:
        try:
            sb.table("cwl_season_log").upsert(
                {"clan_id": clan_id, "season": season}, on_conflict="clan_id,season"
            ).execute()
        except Exception as e:
            log.error(f"_check_cwl_season_completed error (clan_id={clan_id}): {e}")


async def _log_cwl_participation(sb, clan_id: int, tag: str):
    """Với CWL: tìm vòng đang 'warEnded' gần nhất và ghi lại lượt tham chiến."""
    try:
        group = await get_cwl_group(tag, clan_id=clan_id)
    except Exception:
        return
    for round_data in group.get("rounds", []):
        for war_tag in round_data.get("warTags", []):
            if war_tag == "#0":
                continue
            try:
                w = await get_cwl_war(war_tag, clan_id=clan_id)
            except Exception:
                continue
            if w.get("state") not in ("inWar", "warEnded"):
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
            # Đánh sớm/muộn: kiểm tra ngay cả khi war đang "inWar" (chưa kết
            # thúc) để bắt kịp thời điểm đánh thật, không phải chờ war xong.
            _check_early_attacks(sb, clan_id, w, "cwl")
            if w.get("state") != "warEnded":
                continue
            _log_war_participation(sb, clan_id, w, war_type="cwl", season=group.get("season"))


async def _poll_war_for_clan(sb, c, war_reminder_hours, notify_cwl_on):
    """Xu ly 1 clan cho poll_war -- tach rieng de chay SONG SONG nhieu clan
    cung luc (asyncio.gather) thay vi lan luot tung clan mot, giup 1 vong
    poll xong nhanh hon nhieu khi co nhieu clan (dac biet la phan CWL)."""
    try:
        tag = c.get("clan_tag")
        if not tag: return
        data = await get_current_war(tag, clan_id=c["id"])
        state = data.get("state", "notInWar")

        upsert_snapshot("snapshot_war", data, clan_id=c["id"])

        if state == "inWar":
            members = data.get("clan", {}).get("members", [])
            missing = []
            attacks_used = 0
            for m in members:
                attacks = m.get("attacks", [])
                attacks_used += len(attacks)
                if len(attacks) < 1:
                    missing.append(m.get("name", "?"))
            attacks_per_member = data.get("attacksPerMember", 2)
            attacks_total = len(members) * attacks_per_member
            end_time = data.get("endTime", "")
            hours_left = _hours_until(end_time)
            _check_early_attacks(sb, c["id"], data, "random")
            if (missing and c.get("notify_war", True) and end_time
                    and hours_left is not None and hours_left <= war_reminder_hours
                    and should_notify_once(sb, c["id"], "war_reminder", end_time)):
                await notify_war_attack_reminder(missing, end_time, clan_id=c["id"], attacks_used=attacks_used, attacks_total=attacks_total, opponent_name=data.get("opponent", {}).get("name"))
                await send_push_to_clan(c["id"], "\u2694\ufe0f Nhac danh War",
                    f"{len(missing)} thanh vien chua danh, con {war_reminder_hours}h la ket thuc! (Da danh {attacks_used}/{attacks_total} luot)", kind="war")

        if state == "warEnded":
            # BUG đã fix: trong lúc đang ở CWL, endpoint currentwar của CoC vẫn
            # có thể trả về war CWL đó (không phân biệt được qua field nào),
            # nên nếu clan đang ở trong 1 mùa CWL thật (leaguegroup tồn tại),
            # BỎ QUA việc ghi log "random" ở đây — để _log_cwl_participation
            # bên dưới tự ghi đúng war_type="cwl" từ chính API CWL, tránh war
            # CWL bị gắn nhầm thành "War thường" trong Lịch sử.
            is_in_cwl = False
            try:
                group = await get_cwl_group(tag, clan_id=c["id"])
                is_in_cwl = group.get("state") in ("preparation", "war", "inWar", "ended")
            except Exception:
                is_in_cwl = False
            if not is_in_cwl:
                _log_war_participation(sb, c["id"], data, war_type="random")

        await _log_cwl_participation(sb, c["id"], tag)
        await _check_cwl_season_completed(sb, c["id"], tag)

        try:
            from services.coc_api import get_cwl_season_rounds
            cwl_rounds = await get_cwl_season_rounds(tag, clan_id=c["id"])
            cwl_current = next((w for w in cwl_rounds if w.get("state") == "inWar"), None)
            if cwl_current and c.get("notify_war", True) and notify_cwl_on:
                cwl_end = cwl_current.get("endTime", "")
                cwl_hours_left = _hours_until(cwl_end)
                cwl_clan_members = cwl_current.get("clan", {}).get("members", [])
                cwl_missing = [m.get("name", "?") for m in cwl_clan_members if len(m.get("attacks", [])) < 1]
                cwl_attacks_used = sum(len(m.get("attacks", [])) for m in cwl_clan_members)
                cwl_attacks_total = len(cwl_clan_members)  # CWL: mỗi người 1 lượt
                if (cwl_missing and cwl_end and cwl_hours_left is not None and cwl_hours_left <= war_reminder_hours
                        and should_notify_once(sb, c["id"], "cwl_reminder", cwl_end)):
                    await notify_war_attack_reminder(cwl_missing, cwl_end, clan_id=c["id"], attacks_used=cwl_attacks_used, attacks_total=cwl_attacks_total, opponent_name=cwl_current.get("opponent", {}).get("name"))
                    await send_push_to_clan(c["id"], "\U0001F3C6 Nhac danh CWL",
                        f"{len(cwl_missing)} thanh vien chua danh CWL, con {war_reminder_hours}h la ket thuc! (Da danh {cwl_attacks_used}/{cwl_attacks_total})", kind="war")
        except Exception as e:
            log.error(f"CWL reminder error (clan_id={c['id']}): {e}")

        log.info(f"War snapshot updated (clan_id={c['id']}): {state}")
    except Exception as e:
        log.error(f"poll_war error (clan_id={c.get('id')}): {e}")


async def poll_war():
    sb = get_supabase()
    clans = await get_all_clans()
    rcfg = sb.table("settings").select("value").eq("key", "war_reminder_hours").execute()
    war_reminder_hours = float(rcfg.data[0]["value"]) if rcfg.data and rcfg.data[0]["value"] else 2
    ncfg = sb.table("settings").select("value").eq("key", "notify_cwl").execute()
    notify_cwl_on = not (ncfg.data and ncfg.data[0]["value"] == "false")
    # Chay song song tat ca clan cung luc (truoc day lan luot tung clan, cham
    # hon nhieu khi co vai clan tro len vi moi clan phai cho CWL xong moi den
    # clan tiep theo).
    await asyncio.gather(*[_poll_war_for_clan(sb, c, war_reminder_hours, notify_cwl_on) for c in clans])

async def poll_raid():
    clans = await get_all_clans()
    sb = get_supabase()
    rcfg = sb.table("settings").select("value").eq("key", "raid_reminder_hours").execute()
    raid_reminder_hours = float(rcfg.data[0]["value"]) if rcfg.data and rcfg.data[0]["value"] else 24
    for c in clans:
        try:
            tag = c.get("clan_tag")
            if not tag: continue
            seasons = await get_raid_seasons(tag, clan_id=c["id"])
            if not seasons: continue

            latest = seasons[0]
            upsert_snapshot("snapshot_raid", latest, clan_id=c["id"])

            # Check members who haven't raided
            members = latest.get("members", [])
            missing = [m["name"] for m in members if m.get("capitalResourcesLooted", 0) == 0]
            raided_count = len(members) - len(missing)
            end_time = latest.get("endTime", "")
            hours_left = _hours_until(end_time)
            if (missing and c.get("notify_raid", True) and latest.get("state") == "ongoing" and end_time
                    and hours_left is not None and hours_left <= raid_reminder_hours
                    and should_notify_once(sb, c["id"], "raid_reminder", end_time)):
                await notify_raid_reminder(missing, clan_id=c["id"], raided=raided_count, total=len(members))
                await send_push_to_clan(c["id"], "🏰 Nhắc Raid Weekend",
                    f"{len(missing)} thành viên chưa raid, còn {raid_reminder_hours}h là kết thúc! (Đã raid {raided_count}/{len(members)})", kind="raid")

            log.info(f"Raid snapshot updated (clan_id={c['id']})")
        except Exception as e:
            log.error(f"poll_raid error (clan_id={c.get('id')}): {e}")

async def poll_members():
    """Detect join/leave events by comparing with last snapshot — theo từng clan riêng."""
    clans = await get_all_clans()
    sb = get_supabase()
    for c in clans:
        clan_id = c["id"]
        try:
            tag = c.get("clan_tag")
            if not tag: continue

            current = await get_clan_members(tag, clan_id=clan_id)
            current_tags = {m["tag"]: m for m in current}

            # Load previous member list (của đúng clan này)
            try:
                res = sb.table("member_log").select("player_tag,name,th_level,status") \
                    .eq("status", "active").eq("clan_id", clan_id).execute()
            except Exception:
                # Bảng chưa có cột clan_id (chưa chạy migration) — chỉ hỗ trợ clan #1
                if clan_id != 1: continue
                res = sb.table("member_log").select("player_tag,name,th_level,status").eq("status", "active").execute()
            prev_tags = {r["player_tag"]: r for r in res.data}

            # New members
            for tag_id, member in current_tags.items():
                if tag_id not in prev_tags:
                    row = {
                        "player_tag": tag_id,
                        "name": member.get("name"),
                        "th_level": member.get("townHallLevel", 0),
                        "status": "active",
                        "joined_at": datetime.utcnow().isoformat(),
                    }
                    try:
                        sb.table("member_log").insert({**row, "clan_id": clan_id}).execute()
                    except Exception:
                        sb.table("member_log").insert(row).execute()
                    if c.get("notify_join_leave", True):
                        await notify_member_join(member.get("name", "?"), member.get("townHallLevel", 0), clan_id=clan_id)

            # Left members
            for tag_id, prev in prev_tags.items():
                if tag_id not in current_tags:
                    q = sb.table("member_log").update({
                        "status": "left",
                        "left_at": datetime.utcnow().isoformat()
                    }).eq("player_tag", tag_id)
                    try:
                        q.eq("clan_id", clan_id).execute()
                    except Exception:
                        q.execute()
                    if c.get("notify_join_leave", True):
                        await notify_member_leave(prev.get("name", "?"), clan_id=clan_id)

            log.info(f"Members polled (clan_id={clan_id}): {len(current)} active")
        except Exception as e:
            log.error(f"poll_members error (clan_id={clan_id}): {e}")

async def _award_war_star_coins(sb, clan_id: int, war_data: dict, coins_per_star: int, notify_war_coins_on: bool):
    """Cong Coins cho cac don danh MOI phat hien trong 1 war (dung chung cho
    ca war thuong va tung vong CWL -- truoc day chi xu ly war thuong nen danh
    CWL khong duoc cong Coins)."""
    war_key = war_data.get("endTime") or ""
    if not war_key:
        return
    members = war_data.get("clan", {}).get("members", [])
    for m in members:
        attacks = m.get("attacks", [])
        if not attacks:
            continue
        tracker = sb.table("war_star_tracker").select("last_order").eq("war_key", war_key).eq("player_tag", m["tag"]).execute()
        last_order = tracker.data[0]["last_order"] if tracker.data else 0
        new_attacks = [a for a in attacks if a.get("order", 0) > last_order]
        if not new_attacks:
            continue
        stars_gained = sum(a.get("stars", 0) for a in new_attacks)
        max_order = max(a.get("order", 0) for a in new_attacks)
        sb.table("war_star_tracker").upsert({"war_key": war_key, "player_tag": m["tag"], "last_order": max_order}).execute()
        if stars_gained <= 0:
            continue
        acc = sb.table("member_accounts").select("coins").eq("player_tag", m["tag"]).execute()
        # Danh vọng càng cao, hệ số nhân Coins thưởng càng lớn (xem services/reputation.py TIERS)
        try:
            from services.reputation import get_total_reputation, get_tier
            tier = get_tier(get_total_reputation(sb, clan_id, m["tag"]), sb)
            coins_awarded = round(stars_gained * coins_per_star * tier["multiplier"])
        except Exception:
            coins_awarded = stars_gained * coins_per_star
        if acc.data:
            from services.coins import add_coins
            new_coins = add_coins(sb, clan_id, m["tag"], m.get("name", "?"), "war_star", coins_awarded,
                                   note=f"+{stars_gained} sao war")
            if notify_war_coins_on:
                await notify_war_coins(m.get("name", "?"), stars_gained, coins_awarded, clan_id=clan_id)
            msg_row = {
                "room": "clan", "sender_name": "He thong", "sender_tag": None,
                "message": f"\u2694\ufe0f {m.get('name','?')} dat {stars_gained}\u2b50 trong war \u2014 +{coins_awarded} Coins!",
                "is_system": True,
            }
            try:
                sb.table("chat_messages").insert({**msg_row, "clan_id": clan_id}).execute()
            except Exception:
                sb.table("chat_messages").insert(msg_row).execute()


async def _poll_war_stars_for_clan(sb, c, coins_per_star, notify_war_coins_on):
    clan_id = c["id"]
    try:
        tag = c.get("clan_tag")
        if not tag: return
        cur = await get_current_war(tag, clan_id=clan_id)
        if cur.get("state") in ("inWar", "warEnded"):
            await _award_war_star_coins(sb, clan_id, cur, coins_per_star, notify_war_coins_on)

        try:
            from services.coc_api import get_cwl_season_rounds
            cwl_rounds = await get_cwl_season_rounds(tag, clan_id=clan_id)
            for w in cwl_rounds:
                if w.get("state") in ("inWar", "warEnded"):
                    await _award_war_star_coins(sb, clan_id, w, coins_per_star, notify_war_coins_on)
        except Exception as e:
            log.error(f"CWL star coins error (clan_id={clan_id}): {e}")

        log.info(f"War star coins checked (clan_id={clan_id})")
    except Exception as e:
        log.error(f"poll_war_stars error (clan_id={clan_id}): {e}")


async def poll_war_stars():
    """Moi sao dat duoc trong war cong Coins cho nguoi danh -- ap dung cho
    CA war thuong lan CWL. Chay song song tat ca clan cung luc."""
    clans = await get_all_clans()
    sb = get_supabase()
    cfg = sb.table("settings").select("value").eq("key", "coins_per_war_star").execute()
    coins_per_star = int(cfg.data[0]["value"]) if cfg.data and cfg.data[0]["value"].isdigit() else 100
    ncfg = sb.table("settings").select("value").eq("key", "notify_war_coins").execute()
    notify_war_coins_on = not (ncfg.data and ncfg.data[0]["value"] == "false")

    await asyncio.gather(*[_poll_war_stars_for_clan(sb, c, coins_per_star, notify_war_coins_on) for c in clans])

async def poll_donations():
    """So sánh donate hiện tại với lần quét trước, đăng tin hệ thống vào chat clan
    và cộng Coins cho tài khoản (nếu đã được nhận) khi phát hiện donate tăng — theo từng clan.
    (CoC API không có dữ liệu 'xin lính' theo thời gian thực nên KHÔNG thể báo lúc ai đó
    xin lính — chỉ có thể báo SAU KHI họ đã donate xong, tính luôn thành thông báo
    'vừa nhận Coins từ donate' thay vì 'xin lính'.)"""
    clans = await get_all_clans()
    sb = get_supabase()
    ncfg = sb.table("settings").select("value").eq("key", "notify_donate").execute()
    notify_donate_on = not (ncfg.data and ncfg.data[0]["value"] == "false")
    for c in clans:
        clan_id = c["id"]
        try:
            tag = c.get("clan_tag")
            if not tag: continue
            members = await get_clan_members(tag, clan_id=clan_id)
            res = sb.table("donation_tracker").select("player_tag,last_donations,last_donations_received").execute()
            prev = {r["player_tag"]: r for r in res.data}

            for m in members:
                cur = m.get("donations", 0)
                cur_recv = m.get("donationsReceived", 0)
                prev_row = prev.get(m["tag"])
                old = prev_row["last_donations"] if prev_row else None
                old_recv = prev_row.get("last_donations_received", 0) if prev_row else 0

                # CoC tự reset donate hàng tuần (số giảm đột ngột về gần 0) —
                # phát hiện lúc đó để lưu lại tổng của tuần vừa qua, dùng cho
                # thống kê "donate ít nhất" theo tuần/tháng/từ đầu.
                if old is not None and cur < old:
                    try:
                        sb.table("donation_snapshot_log").insert({
                            "clan_id": clan_id, "player_tag": m["tag"], "player_name": m.get("name", "?"),
                            "donations": old, "donations_received": old_recv,
                        }).execute()
                    except Exception:
                        pass

                if old is not None and cur > old:
                    diff = cur - old
                    # Chỉ cộng Coins + nhắc "Coins" trong tin nhắn nếu người này ĐÃ
                    # nhận tài khoản (claim) trên web — trước đây tin nhắn luôn ghi
                    # "+X Coins!" dù người đó chưa đăng nhập nên chưa hề được cộng gì.
                    acc = sb.table("member_accounts").select("coins").eq("player_tag", m["tag"]).execute()
                    has_account = bool(acc.data)
                    if has_account:
                        text = f"🎁 {m.get('name','?')} vừa donate thêm {diff} quân (tổng {cur}) — +{diff} Coins!"
                    else:
                        text = f"🎁 {m.get('name','?')} vừa donate thêm {diff} quân (tổng {cur})"
                    msg_row = {
                        "room": "clan",
                        "sender_name": "Hệ thống",
                        "sender_tag": None,
                        "message": text,
                        "is_system": True,
                    }
                    try:
                        sb.table("chat_messages").insert({**msg_row, "clan_id": clan_id}).execute()
                    except Exception:
                        sb.table("chat_messages").insert(msg_row).execute()
                    if has_account:
                        from services.coins import add_coins
                        new_coins = add_coins(sb, clan_id, m["tag"], m.get("name", "?"), "donate", diff, note=f"Donate +{diff} quân")
                        if notify_donate_on:
                            await notify_donate_coins(m.get("name", "?"), diff, cur, diff, clan_id=clan_id)
                sb.table("donation_tracker").upsert({"player_tag": m["tag"], "last_donations": cur, "last_donations_received": cur_recv}).execute()

            log.info(f"Donation deltas checked (clan_id={clan_id})")
        except Exception as e:
            log.error(f"poll_donations error (clan_id={clan_id}): {e}")

async def poll_global_chat_cleanup():
    """Chat Toàn Cầu tự làm mới — xoá tin nhắn cũ hơn N ngày (cấu hình trong
    Cài đặt → 'chat_retention_days', mặc định 1 ngày). Chat Clan giữ nguyên,
    không tự xoá."""
    try:
        sb = get_supabase()
        cfg = sb.table("settings").select("value").eq("key", "chat_retention_days").execute()
        days = float(cfg.data[0]["value"]) if cfg.data and cfg.data[0]["value"] else 1
        if days <= 0:
            return
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        sb.table("chat_messages").delete().eq("room", "global").lt("created_at", cutoff).execute()
        log.info(f"Global chat cleaned up (>{days} ngày)")
    except Exception as e:
        log.error(f"poll_global_chat_cleanup error: {e}")

async def poll_asset_cleanup():
    """Nếu thành viên đã rời clan quá N ngày (cài trong Cài đặt admin), xoá sạch
    Coins và vật phẩm cửa hàng của họ — KHÔNG xoá tài khoản đăng nhập (PIN), chỉ
    reset tài sản, để nếu họ quay lại clan vẫn đăng nhập được nhưng bắt đầu lại từ 0."""
    try:
        sb = get_supabase()
        cfg = sb.table("settings").select("value").eq("key", "asset_cleanup_days").execute()
        days = int(cfg.data[0]["value"]) if cfg.data and cfg.data[0]["value"].isdigit() else 7

        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        left = sb.table("member_log").select("player_tag").eq("status", "left").lt("left_at", cutoff).execute()
        left_tags = [r["player_tag"] for r in left.data]
        if not left_tags:
            return

        accounts = sb.table("member_accounts").select("player_tag,assets_cleared").in_("player_tag", left_tags).execute()
        for acc in accounts.data:
            if acc.get("assets_cleared"):
                continue
            tag = acc["player_tag"]
            sb.table("member_inventory").delete().eq("player_tag", tag).execute()
            sb.table("member_accounts").update({
                "coins": 0, "equipped_castle": "castle_classic", "equipped_cannon": "cannon_basic",
                "equipped_effect": None, "assets_cleared": True,
            }).eq("player_tag", tag).execute()
            log.info(f"Cleared assets for {tag} (left clan > {days} days)")
    except Exception as e:
        log.error(f"poll_asset_cleanup error: {e}")


async def poll_leave_reputation_penalty():
    """Phạt Danh vọng theo số ngày đã rời clan — mốc 1/2/3/7 ngày, mỗi mốc chỉ
    trừ đúng 1 lần cho 1 lần rời (ref_key gắn với left_at cụ thể của lần đó,
    nên nếu rời rồi vào lại rồi rời tiếp thì tính lại từ đầu)."""
    try:
        sb = get_supabase()
        from services.reputation import add_reputation
        THRESHOLDS = [1, 2, 3, 7]
        left = sb.table("member_log").select("player_tag,name,left_at,clan_id").eq("status", "left").execute()
        now = datetime.utcnow()
        for r in (left.data or []):
            if not r.get("left_at"):
                continue
            try:
                left_at = datetime.fromisoformat(r["left_at"].replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                continue
            days = (now - left_at).days
            for th in THRESHOLDS:
                if days >= th:
                    add_reputation(sb, r.get("clan_id", 1), r["player_tag"], r["name"], f"leave_clan_{th}d",
                                    ref_key=f"{r['left_at']}-{th}d")
    except Exception as e:
        log.error(f"poll_leave_reputation_penalty error: {e}")

async def poll_stats_cleanup():
    """Xoá dữ liệu thống kê tích luỹ (lượt tham chiến war, lịch sử donate) cũ
    hơn N ngày (cấu hình trong Cài đặt → 'stats_retention_days'). Để trống/0 =
    giữ vĩnh viễn, không tự xoá.

    Mỗi lần THẬT SỰ xoá (dù tự động mỗi 12h hay admin bấm 'Xoá ngay') đều ghi
    lại thời điểm + số dòng đã xoá vào settings (stats_last_cleanup_at/_deleted)
    — hiển thị lại trong Cài đặt để admin luôn biết job này có đang âm thầm xoá
    dữ liệu hay không, tránh trường hợp dữ liệu 'biến mất' mà không rõ vì sao."""
    try:
        sb = get_supabase()
        cfg = sb.table("settings").select("value").eq("key", "stats_retention_days").execute()
        days = int(cfg.data[0]["value"]) if cfg.data and cfg.data[0]["value"].isdigit() else 0
        if days <= 0:
            return {"deleted": 0}
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

        def _count(table: str, date_col: str) -> int:
            try:
                res = sb.table(table).select("id").lt(date_col, cutoff).execute()
                return len(res.data or [])
            except Exception:
                return 0

        war_count = _count("war_participation_log", "created_at")
        donate_count = _count("donation_snapshot_log", "snapshot_at")
        history_count = _count("war_history_log", "created_at")

        sb.table("war_participation_log").delete().lt("created_at", cutoff).execute()
        sb.table("donation_snapshot_log").delete().lt("snapshot_at", cutoff).execute()
        try:
            sb.table("war_history_log").delete().lt("created_at", cutoff).execute()
        except Exception:
            history_count = 0  # chưa chạy migration PART 7 — bỏ qua bảng này

        total = war_count + donate_count + history_count
        sb.table("settings").upsert({"key": "stats_last_cleanup_at", "value": datetime.utcnow().isoformat()}).execute()
        sb.table("settings").upsert({"key": "stats_last_cleanup_deleted", "value": str(total)}).execute()

        log.info(f"Stats cleanup: removed {total} records older than {days} days (war={war_count}, donate={donate_count}, history={history_count})")
        return {"deleted": total}
    except Exception as e:
        log.error(f"poll_stats_cleanup error: {e}")
        return {"deleted": 0}


async def poll_reward_history_cleanup():
    """Xoá lịch sử trao thưởng (sự kiện đã đóng/từ chối + claims kèm theo) cũ
    hơn N ngày (Cài đặt → 'reward_history_retention_days'). Chỉ xoá sự kiện
    ĐÃ ĐÓNG hẳn — không đụng tới sự kiện đang chạy dù có cũ tới đâu. Để
    trống/0 = giữ vĩnh viễn."""
    try:
        sb = get_supabase()
        cfg = sb.table("settings").select("value").eq("key", "reward_history_retention_days").execute()
        days = int(cfg.data[0]["value"]) if cfg.data and cfg.data[0]["value"].isdigit() else 0
        if days <= 0:
            return
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        old = sb.table("events").select("id").in_("status", ["closed", "rejected"]).lt("end_time", cutoff).execute()
        ids = [r["id"] for r in (old.data or [])]
        if ids:
            sb.table("events").delete().in_("id", ids).execute()  # event_claims tự xoá theo (ON DELETE CASCADE)
            log.info(f"Reward history cleanup: removed {len(ids)} old closed events")
    except Exception as e:
        log.error(f"poll_reward_history_cleanup error: {e}")


async def poll_weekly_report():
    """Tổng hợp + gửi báo cáo thống kê tuần cho TỪNG clan (Top 5 tốt/xấu —
    xem services/weekly_report.py)."""
    clans = await get_all_clans()
    for c in clans:
        try:
            await generate_weekly_report(c["id"])
        except Exception as e:
            log.error(f"poll_weekly_report error (clan_id={c.get('id')}): {e}")


async def poll_monthly_reputation():
    """Danh vọng: Hoàn thành Clan Games + Top đóng góp tháng (xem
    services/reputation.py::run_monthly_reputation) — chạy 1 lần/tháng cho
    từng clan."""
    from services.reputation import run_monthly_reputation
    clans = await get_all_clans()
    for c in clans:
        try:
            await run_monthly_reputation(c["id"])
        except Exception as e:
            log.error(f"poll_monthly_reputation error (clan_id={c.get('id')}): {e}")


async def poll_trophy_season_snapshot():
    """Chụp Cúp hiện tại của mọi thành viên vào ngày 1 hàng tháng — coi như
    Cúp cuối mùa vừa qua (xấp xỉ, vì CoC không có API báo thời điểm chính
    xác lúc mùa Cúp/Legend reset). Dùng để xem lại 'Top Cúp 3 mùa gần nhất'."""
    from clan_context import get_tag_by_clan_id
    from services.coc_api import get_clan_members
    sb = get_supabase()
    now = datetime.utcnow()
    # Season "vừa kết thúc" = tháng trước (vì chụp vào ngày 1, Cúp đang thấy
    # là kết quả của tháng vừa trôi qua).
    prev_month = (now.replace(day=1) - timedelta(days=1))
    season = prev_month.strftime("%Y-%m")
    clans = await get_all_clans()
    for c in clans:
        clan_id = c["id"]
        try:
            tag = await get_tag_by_clan_id(clan_id)
            if not tag:
                continue
            members = await get_clan_members(tag, clan_id=clan_id)
            rows = [{
                "clan_id": clan_id, "season": season, "player_tag": m["tag"],
                "player_name": m["name"], "trophies": m.get("trophies", 0) or 0,
            } for m in members]
            if rows:
                sb.table("trophy_season_log").upsert(rows, on_conflict="clan_id,season,player_tag").execute()
        except Exception as e:
            log.error(f"poll_trophy_season_snapshot error (clan_id={clan_id}): {e}")


async def poll_rule_auto_history():
    """Pháp Điển: đối chiếu ai từng bị gắn cờ đủ điều kiện thăng/hạ/vi phạm
    (clan_rule_flags) với dữ liệu CoC API mới nhất — nếu điều đó ĐÃ THẬT SỰ
    xảy ra trong game (role đổi đúng hướng, hoặc rời/bị loại khỏi clan), tự
    ghi 1 dòng vào clan_rule_history mà không cần Admin bấm tay xác nhận.
    Xem services/rule_engine.py::sync_rule_auto_history cho logic chi tiết."""
    from services.rule_engine import sync_rule_auto_history
    sb = get_supabase()
    clans = await get_all_clans()
    for c in clans:
        try:
            await sync_rule_auto_history(sb, c["id"])
        except Exception as e:
            log.error(f"poll_rule_auto_history error (clan_id={c.get('id')}): {e}")
