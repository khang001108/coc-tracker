"""
Background scheduler: polls CoC API and stores snapshots.
Runs every 5 min for war/raid, 15 min for clan overview.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from services.coc_api import get_clan, get_current_war, get_raid_seasons, get_clan_members, get_coc_config
from services.notify_service import notify_war_attack_reminder, notify_raid_reminder, notify_member_join, notify_member_leave
from supabase_client import get_supabase
from datetime import datetime
import json, logging

log = logging.getLogger("poller")
scheduler = AsyncIOScheduler()

async def start_scheduler():
    scheduler.add_job(poll_clan,      IntervalTrigger(minutes=15), id="poll_clan",      replace_existing=True)
    scheduler.add_job(poll_war,       IntervalTrigger(minutes=5),  id="poll_war",       replace_existing=True)
    scheduler.add_job(poll_raid,      IntervalTrigger(minutes=10), id="poll_raid",      replace_existing=True)
    scheduler.add_job(poll_members,   IntervalTrigger(minutes=10), id="poll_members",   replace_existing=True)
    scheduler.add_job(poll_donations, IntervalTrigger(minutes=10), id="poll_donations", replace_existing=True)
    scheduler.start()
    log.info("Scheduler started")

async def stop_scheduler():
    scheduler.shutdown()

# ── Helpers ───────────────────────────────────────────────────────────────────

async def get_tag() -> str | None:
    cfg = await get_coc_config()
    return cfg.get("clan_tag")

def upsert_snapshot(table: str, data: dict):
    sb = get_supabase()
    # Các bảng snapshot_* không có cột UNIQUE nên upsert() sẽ tạo dòng MỚI mỗi lần
    # thay vì cập nhật — xoá hết dòng cũ trước khi chèn để luôn chỉ có đúng 1 dòng
    # mới nhất, tránh việc đọc dữ liệu (limit 1, không order) trả về dòng cũ.
    sb.table(table).delete().neq("id", 0).execute()
    sb.table(table).insert({
        "data": json.dumps(data),
        "updated_at": datetime.utcnow().isoformat()
    }).execute()

# ── Poll jobs ─────────────────────────────────────────────────────────────────

async def poll_clan():
    try:
        tag = await get_tag()
        if not tag: return
        data = await get_clan(tag)
        upsert_snapshot("snapshot_clan", data)
        log.info("Clan snapshot updated")
    except Exception as e:
        log.error(f"poll_clan error: {e}")

async def poll_war():
    try:
        tag = await get_tag()
        if not tag: return
        data = await get_current_war(tag)
        state = data.get("state", "notInWar")

        upsert_snapshot("snapshot_war", data)

        # Check for members who haven't attacked
        if state == "inWar":
            members = data.get("clan", {}).get("members", [])
            team_size = data.get("teamSize", 0)
            missing = []
            for m in members:
                attacks = m.get("attacks", [])
                attacks_used = len(attacks)
                # Each member gets 2 attacks in regular war, 1 in CWL
                if attacks_used < 1:
                    missing.append(m.get("name", "?"))
            if missing:
                end_time = data.get("endTime", "")
                await notify_war_attack_reminder(missing, end_time)

        log.info(f"War snapshot updated: {state}")
    except Exception as e:
        log.error(f"poll_war error: {e}")

async def poll_raid():
    try:
        tag = await get_tag()
        if not tag: return
        seasons = await get_raid_seasons(tag)
        if not seasons: return

        latest = seasons[0]
        upsert_snapshot("snapshot_raid", latest)

        # Check members who haven't raided
        members = latest.get("members", [])
        missing = [m["name"] for m in members if m.get("capitalResourcesLooted", 0) == 0]
        if missing:
            await notify_raid_reminder(missing)

        log.info("Raid snapshot updated")
    except Exception as e:
        log.error(f"poll_raid error: {e}")

async def poll_members():
    """Detect join/leave events by comparing with last snapshot."""
    try:
        tag = await get_tag()
        if not tag: return
        sb = get_supabase()

        current = await get_clan_members(tag)
        current_tags = {m["tag"]: m for m in current}

        # Load previous member list
        res = sb.table("member_log").select("player_tag,name,th_level,status").eq("status", "active").execute()
        prev_tags = {r["player_tag"]: r for r in res.data}

        # New members
        for tag_id, member in current_tags.items():
            if tag_id not in prev_tags:
                sb.table("member_log").insert({
                    "player_tag": tag_id,
                    "name": member.get("name"),
                    "th_level": member.get("townHallLevel", 0),
                    "status": "active",
                    "joined_at": datetime.utcnow().isoformat()
                }).execute()
                await notify_member_join(member.get("name", "?"), member.get("townHallLevel", 0))

        # Left members
        for tag_id, prev in prev_tags.items():
            if tag_id not in current_tags:
                sb.table("member_log").update({
                    "status": "left",
                    "left_at": datetime.utcnow().isoformat()
                }).eq("player_tag", tag_id).execute()
                await notify_member_leave(prev.get("name", "?"))

        log.info(f"Members polled: {len(current)} active")
    except Exception as e:
        log.error(f"poll_members error: {e}")

async def poll_donations():
    """So sánh donate hiện tại với lần quét trước, đăng tin hệ thống vào chat clan
    và cộng Coins cho tài khoản (nếu đã được nhận) khi phát hiện donate tăng.
    (CoC API không có dữ liệu 'xin lính' theo thời gian thực — đây là cách gần
    nhất có thể làm được: phát hiện SAU khi họ đã donate xong.)"""
    try:
        tag = await get_tag()
        if not tag: return
        sb = get_supabase()
        members = await get_clan_members(tag)
        res = sb.table("donation_tracker").select("player_tag,last_donations").execute()
        prev = {r["player_tag"]: r["last_donations"] for r in res.data}

        for m in members:
            cur = m.get("donations", 0)
            old = prev.get(m["tag"])
            if old is not None and cur > old:
                diff = cur - old
                sb.table("chat_messages").insert({
                    "room": "clan",
                    "sender_name": "Hệ thống",
                    "sender_tag": None,
                    "message": f"🎁 {m.get('name','?')} vừa donate thêm {diff} quân (tổng {cur}) — +{diff} Coins!",
                    "is_system": True,
                }).execute()
                # Cộng Coins nếu tài khoản player này đã được ai đó nhận (claim)
                acc = sb.table("member_accounts").select("coins").eq("player_tag", m["tag"]).execute()
                if acc.data:
                    new_coins = (acc.data[0].get("coins") or 0) + diff
                    sb.table("member_accounts").update({"coins": new_coins}).eq("player_tag", m["tag"]).execute()
            sb.table("donation_tracker").upsert({"player_tag": m["tag"], "last_donations": cur}).execute()

        log.info("Donation deltas checked")
    except Exception as e:
        log.error(f"poll_donations error: {e}")
