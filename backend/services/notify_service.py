import httpx
from supabase_client import get_supabase

async def get_notify_config() -> dict:
    sb = get_supabase()
    res = sb.table("settings").select("key,value").in_(
        "key", ["discord_webhook", "telegram_bot_token", "telegram_chat_id",
                "notify_war", "notify_raid", "notify_donate"]
    ).execute()
    return {row["key"]: row["value"] for row in res.data}

async def send_discord(webhook_url: str, message: str, embeds: list = None):
    if not webhook_url:
        return
    payload = {"content": message}
    if embeds:
        payload["embeds"] = embeds
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(webhook_url, json=payload)

async def send_telegram(bot_token: str, chat_id: str, message: str):
    if not bot_token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(url, json={
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML"
        })

async def notify_all(message: str, discord_color: int = 0x5865F2, title: str = ""):
    """Send to both Discord and Telegram using stored config."""
    cfg = await get_notify_config()
    webhook = cfg.get("discord_webhook", "")
    tg_token = cfg.get("telegram_bot_token", "")
    tg_chat = cfg.get("telegram_chat_id", "")

    if webhook:
        embeds = [{"title": title, "description": message, "color": discord_color}] if title else None
        await send_discord(webhook, "" if title else message, embeds)

    if tg_token and tg_chat:
        text = f"<b>{title}</b>\n{message}" if title else message
        await send_telegram(tg_token, tg_chat, text)

# ── Specific notification helpers ─────────────────────────────────────────────

async def notify_war_attack_reminder(missing: list[str], war_end: str):
    if not missing:
        return
    names = ", ".join(missing)
    msg = f"⚔️ Nhắc đánh War!\n{len(missing)} thành viên chưa dùng hết attack:\n{names}\nKết thúc: {war_end}"
    await notify_all(msg, discord_color=0xED4245, title="⚔️ Chưa đánh War")

async def notify_raid_reminder(missing: list[str]):
    if not missing:
        return
    names = ", ".join(missing)
    msg = f"🏰 Nhắc Raid Weekend!\n{len(missing)} thành viên chưa tham gia Raid:\n{names}"
    await notify_all(msg, discord_color=0xFEE75C, title="🏰 Chưa tham gia Raid")

async def notify_member_join(name: str, th: int):
    msg = f"👋 <b>{name}</b> (TH{th}) vừa tham gia clan!"
    await notify_all(msg, discord_color=0x57F287, title="👋 Thành viên mới")

async def notify_member_leave(name: str):
    msg = f"🚪 <b>{name}</b> vừa rời clan."
    await notify_all(msg, discord_color=0xEB459E, title="🚪 Thành viên rời")

async def notify_troop_request(name: str, message: str):
    msg = f"🪖 <b>{name}</b> xin lính: {message}"
    await notify_all(msg, discord_color=0x5865F2, title="🪖 Xin lính")
