import httpx
import re
from supabase_client import get_supabase

async def get_notify_config(clan_id: int = 1) -> dict:
    """Lấy cấu hình thông báo (discord/telegram) đúng theo từng clan.

    Bảng `clans` đã có sẵn cột discord_webhook/telegram_bot_token/telegram_chat_id
    riêng cho mỗi clan — ưu tiên đọc từ đó. Nếu clan chưa có dòng trong bảng `clans`
    (setup cũ, chỉ 1 clan), fallback về bảng `settings` như trước.
    """
    sb = get_supabase()
    try:
        res = sb.table("clans").select(
            "discord_webhook, telegram_bot_token, telegram_chat_id, notify_war, notify_raid, notify_join_leave"
        ).eq("id", clan_id).execute()
        if res.data:
            row = res.data[0]
            return {
                "discord_webhook": row.get("discord_webhook") or "",
                "telegram_bot_token": row.get("telegram_bot_token") or "",
                "telegram_chat_id": row.get("telegram_chat_id") or "",
            }
    except Exception:
        pass

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

def _markdown_to_telegram_html(text: str) -> str:
    """Chuyển **in đậm** (markdown Discord dùng) sang <b>in đậm</b> (HTML mà
    Telegram cần) — để chỉ cần viết nội dung tin nhắn 1 LẦN DUY NHẤT theo 1
    kiểu, tự động hiện đúng định dạng ở CẢ 2 nền tảng, không bị lệch nhau
    (trước đây có chỗ dùng <b> lộ ra chữ thô trên Discord vì Discord không
    hiểu HTML, có chỗ lại không in đậm gì cả — không đồng bộ)."""
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)

async def notify_all(message: str, discord_color: int = 0x5865F2, title: str = "", clan_id: int = 1):
    """Gửi cùng 1 nội dung message (viết bằng **in đậm** kiểu Discord) tới cả
    Discord và Telegram — tự chuyển đổi định dạng đúng theo từng nền tảng
    để nội dung hiển thị ĐỒNG BỘ, không bị lệch giữa 2 bên."""
    cfg = await get_notify_config(clan_id)
    webhook = cfg.get("discord_webhook", "")
    tg_token = cfg.get("telegram_bot_token", "")
    tg_chat = cfg.get("telegram_chat_id", "")

    if webhook:
        embeds = [{"title": title, "description": message, "color": discord_color}] if title else None
        await send_discord(webhook, "" if title else message, embeds)

    if tg_token and tg_chat:
        tg_message = _markdown_to_telegram_html(message)
        text = f"<b>{title}</b>\n{tg_message}" if title else tg_message
        await send_telegram(tg_token, tg_chat, text)

# ── Specific notification helpers ─────────────────────────────────────────────
# Tất cả đều viết theo 1 kiểu thống nhất: **in đậm** cho tên/số liệu quan
# trọng — notify_all() tự lo phần chuyển đổi cho đúng từng nền tảng.

async def notify_war_attack_reminder(missing: list[str], war_end: str, clan_id: int = 1):
    if not missing:
        return
    names = ", ".join(missing)
    msg = f"⚔️ Nhắc đánh War!\n**{len(missing)} thành viên** chưa dùng hết attack:\n{names}\nKết thúc: {war_end}"
    await notify_all(msg, discord_color=0xED4245, title="⚔️ Chưa đánh War", clan_id=clan_id)

async def notify_raid_reminder(missing: list[str], clan_id: int = 1):
    if not missing:
        return
    names = ", ".join(missing)
    msg = f"🏰 Nhắc Raid Weekend!\n**{len(missing)} thành viên** chưa tham gia Raid:\n{names}"
    await notify_all(msg, discord_color=0xFEE75C, title="🏰 Chưa tham gia Raid", clan_id=clan_id)

async def notify_member_join(name: str, th: int, clan_id: int = 1):
    msg = f"👋 **{name}** (TH{th}) vừa tham gia clan!"
    await notify_all(msg, discord_color=0x57F287, title="👋 Thành viên mới", clan_id=clan_id)

async def notify_member_leave(name: str, clan_id: int = 1):
    msg = f"🚪 **{name}** vừa rời clan."
    await notify_all(msg, discord_color=0xEB459E, title="🚪 Thành viên rời", clan_id=clan_id)

async def notify_donate_coins(name: str, diff: int, total: int, coins: int, clan_id: int = 1):
    msg = f"🎁 **{name}** vừa donate thêm {diff} quân (tổng {total}) — nhận **+{coins} Coins**!"
    await notify_all(msg, discord_color=0x57F287, title="🎁 Donate nhận Coins", clan_id=clan_id)

async def notify_war_coins(name: str, stars: int, coins: int, clan_id: int = 1):
    msg = f"⚔️ **{name}** vừa đạt {stars}⭐ trong war — nhận **+{coins} Coins**!"
    await notify_all(msg, discord_color=0xED4245, title="⚔️ War nhận Coins", clan_id=clan_id)
