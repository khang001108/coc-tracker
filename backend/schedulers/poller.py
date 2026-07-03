"""
Background scheduler: polls CoC API and stores snapshots.
Runs every 5 min for war/raid, 15 min for clan overview.

Đa clan: mọi job đều lặp qua TẤT CẢ clan trong bảng `clans` (get_all_clans()),
không chỉ clan #1 — để mỗi clan đều có nhật ký thành viên, thông báo war/raid,
donate, và coin thưởng sao war hoạt động độc lập, đúng của clan đó.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from services.coc_api import get_clan, get_current_war, get_raid_seasons, get_clan_members, get_coc_config, get_cwl_group, get_cwl_war
from services.notify_service import notify_war_attack_reminder, notify_raid_reminder, notify_member_join, notify_member_leave
from supabase_client import get_supabase
from datetime import datetime, timedelta
import json, logging

log = logging.getLogger("poller")
scheduler = AsyncIOScheduler()

async def start_scheduler():
    scheduler.add_job(poll_clan,      IntervalTrigger(minutes=15), id="poll_clan",      replace_existing=True)
    scheduler.add_job(poll_war,       IntervalTrigger(minutes=5),  id="poll_war",       replace_existing=True)
    scheduler.add_job(poll_war_stars, IntervalTrigger(minutes=5),  id="poll_war_stars", replace_existing=True)
    scheduler.add_job(poll_raid,      IntervalTrigger(minutes=10), id="poll_raid",      replace_existing=True)
    scheduler.add_job(poll_members,   IntervalTrigger(minutes=10), id="poll_members",   replace_existing=True)
    scheduler.add_job(poll_donations, IntervalTrigger(minutes=10), id="poll_donations", replace_existing=True)
    scheduler.add_job(poll_asset_cleanup, IntervalTrigger(hours=6), id="poll_asset_cleanup", replace_existing=True)
    scheduler.add_job(poll_stats_cleanup, IntervalTrigger(hours=12), id="poll_stats_cleanup", replace_existing=True)
    scheduler.add_job(poll_global_chat_cleanup, IntervalTrigger(hours=1), id="poll_global_chat_cleanup", replace_existing=True)
    scheduler.start()
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


def _log_war_participation(sb, clan_id: int, war_data: dict, war_type: str = "random"):
    """Ghi lại lượt tham chiến của từng thành viên khi 1 war đã kết thúc (hoặc
    đang ở battle day cuối) — dùng upsert nên gọi lặp lại nhiều lần (mỗi lần
    poll) vẫn an toàn, không bị nhân đôi dữ liệu. Đồng thời tính sẵn đòn đánh/
    phòng thủ 'anh dũng nhất' của từng người, và ghi tổng kết war vào
    war_history_log."""
    end_time = war_data.get("endTime")
    if not end_time:
        return
    attacks_allowed = war_data.get("attacksPerMember") or (1 if war_type == "cwl" else 2)
    clan = war_data.get("clan", {})
    opponent = war_data.get("opponent", {})
    members = clan.get("members", [])

    name_by_tag = {m.get("tag"): m.get("name", "?") for m in members}
    name_by_tag.update({m.get("tag"): m.get("name", "?") for m in opponent.get("members", [])})
    opponent_attacks = [a for m in opponent.get("members", []) for a in m.get("attacks", [])]

    rows = []
    for m in members:
        attacks = m.get("attacks", [])
        ba = _best_attack(attacks, name_by_tag)
        bd = _best_defense(opponent_attacks, m.get("tag"), name_by_tag)
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
        })
    if rows:
        try:
            sb.table("war_participation_log").upsert(rows, on_conflict="clan_id,war_end_time,player_tag").execute()
        except Exception as e:
            # Cột best_attack_*/best_defense_* có thể chưa tồn tại (chưa chạy
            # migration PART 7) — thử lại chỉ với các cột cũ để không chặn hẳn.
            try:
                basic_rows = [{k: v for k, v in r.items() if not k.startswith("best_")} for r in rows]
                sb.table("war_participation_log").upsert(basic_rows, on_conflict="clan_id,war_end_time,player_tag").execute()
            except Exception as e2:
                log.error(f"_log_war_participation error (clan_id={clan_id}): {e2}")

    clan_stars, opp_stars = clan.get("stars", 0), opponent.get("stars", 0)
    result = "win" if clan_stars > opp_stars else ("lose" if clan_stars < opp_stars else "tie")
    try:
        sb.table("war_history_log").upsert({
            "clan_id": clan_id, "war_end_time": end_time, "war_type": war_type,
            "opponent_name": opponent.get("name"), "opponent_tag": opponent.get("tag"),
            "team_size": war_data.get("teamSize"),
            "clan_stars": clan_stars, "opponent_stars": opp_stars,
            "clan_destruction": clan.get("destructionPercentage"),
            "opponent_destruction": opponent.get("destructionPercentage"),
            "result": result,
        }, on_conflict="clan_id,war_end_time").execute()
    except Exception as e:
        log.error(f"_log_war_history error (clan_id={clan_id}): {e}")


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
            if w.get("state") != "warEnded":
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
            _log_war_participation(sb, clan_id, w, war_type="cwl")


async def poll_war():
    sb = get_supabase()
    clans = await get_all_clans()
    for c in clans:
        try:
            tag = c.get("clan_tag")
            if not tag: continue
            data = await get_current_war(tag, clan_id=c["id"])
            state = data.get("state", "notInWar")

            upsert_snapshot("snapshot_war", data, clan_id=c["id"])

            # Check for members who haven't attacked
            if state == "inWar":
                members = data.get("clan", {}).get("members", [])
                missing = []
                for m in members:
                    attacks = m.get("attacks", [])
                    if len(attacks) < 1:
                        missing.append(m.get("name", "?"))
                if missing:
                    end_time = data.get("endTime", "")
                    await notify_war_attack_reminder(missing, end_time, clan_id=c["id"])

            # War đã kết thúc — ghi lại lượt tham chiến từng người cho thống kê tích luỹ
            if state == "warEnded":
                _log_war_participation(sb, c["id"], data, war_type="random")

            # CWL: ghi lại vòng vừa kết thúc (nếu có)
            await _log_cwl_participation(sb, c["id"], tag)

            log.info(f"War snapshot updated (clan_id={c['id']}): {state}")
        except Exception as e:
            log.error(f"poll_war error (clan_id={c.get('id')}): {e}")

async def poll_raid():
    clans = await get_all_clans()
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
            if missing:
                await notify_raid_reminder(missing, clan_id=c["id"])

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
                    await notify_member_leave(prev.get("name", "?"), clan_id=clan_id)

            log.info(f"Members polled (clan_id={clan_id}): {len(current)} active")
        except Exception as e:
            log.error(f"poll_members error (clan_id={clan_id}): {e}")

async def poll_war_stars():
    """Mỗi sao đạt được trong war (tính theo từng đòn đánh mới phát hiện) cộng
    Coins cho người đánh (nếu đã có tài khoản), báo trong chat clan — theo từng clan."""
    clans = await get_all_clans()
    sb = get_supabase()
    cfg = sb.table("settings").select("value").eq("key", "coins_per_war_star").execute()
    coins_per_star = int(cfg.data[0]["value"]) if cfg.data and cfg.data[0]["value"].isdigit() else 100

    for c in clans:
        clan_id = c["id"]
        try:
            tag = c.get("clan_tag")
            if not tag: continue
            cur = await get_current_war(tag, clan_id=clan_id)
            if cur.get("state") not in ("inWar", "warEnded"): continue
            war_key = cur.get("endTime") or ""
            if not war_key: continue

            members = cur.get("clan", {}).get("members", [])
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
                coins_awarded = stars_gained * coins_per_star
                if acc.data:
                    new_coins = (acc.data[0].get("coins") or 0) + coins_awarded
                    sb.table("member_accounts").update({"coins": new_coins}).eq("player_tag", m["tag"]).execute()
                    msg_row = {
                        "room": "clan", "sender_name": "Hệ thống", "sender_tag": None,
                        "message": f"⚔️ {m.get('name','?')} đạt {stars_gained}⭐ trong war — +{coins_awarded} Coins!",
                        "is_system": True,
                    }
                    try:
                        sb.table("chat_messages").insert({**msg_row, "clan_id": clan_id}).execute()
                    except Exception:
                        sb.table("chat_messages").insert(msg_row).execute()
            log.info(f"War star coins checked (clan_id={clan_id})")
        except Exception as e:
            log.error(f"poll_war_stars error (clan_id={clan_id}): {e}")

async def poll_donations():
    """So sánh donate hiện tại với lần quét trước, đăng tin hệ thống vào chat clan
    và cộng Coins cho tài khoản (nếu đã được nhận) khi phát hiện donate tăng — theo từng clan.
    (CoC API không có dữ liệu 'xin lính' theo thời gian thực — đây là cách gần
    nhất có thể làm được: phát hiện SAU khi họ đã donate xong.)"""
    clans = await get_all_clans()
    sb = get_supabase()
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
                    msg_row = {
                        "room": "clan",
                        "sender_name": "Hệ thống",
                        "sender_tag": None,
                        "message": f"🎁 {m.get('name','?')} vừa donate thêm {diff} quân (tổng {cur}) — +{diff} Coins!",
                        "is_system": True,
                    }
                    try:
                        sb.table("chat_messages").insert({**msg_row, "clan_id": clan_id}).execute()
                    except Exception:
                        sb.table("chat_messages").insert(msg_row).execute()
                    # Cộng Coins nếu tài khoản player này đã được ai đó nhận (claim)
                    acc = sb.table("member_accounts").select("coins").eq("player_tag", m["tag"]).execute()
                    if acc.data:
                        new_coins = (acc.data[0].get("coins") or 0) + diff
                        sb.table("member_accounts").update({"coins": new_coins}).eq("player_tag", m["tag"]).execute()
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

async def poll_stats_cleanup():
    """Xoá dữ liệu thống kê tích luỹ (lượt tham chiến war, lịch sử donate) cũ
    hơn N ngày (cấu hình trong Cài đặt → 'stats_retention_days'). Để trống/0 =
    giữ vĩnh viễn, không tự xoá."""
    try:
        sb = get_supabase()
        cfg = sb.table("settings").select("value").eq("key", "stats_retention_days").execute()
        days = int(cfg.data[0]["value"]) if cfg.data and cfg.data[0]["value"].isdigit() else 0
        if days <= 0:
            return
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        sb.table("war_participation_log").delete().lt("created_at", cutoff).execute()
        sb.table("donation_snapshot_log").delete().lt("snapshot_at", cutoff).execute()
        try:
            sb.table("war_history_log").delete().lt("created_at", cutoff).execute()
        except Exception:
            pass  # chưa chạy migration PART 7 — bỏ qua bảng này
        log.info(f"Stats cleanup: removed records older than {days} days")
    except Exception as e:
        log.error(f"poll_stats_cleanup error: {e}")
