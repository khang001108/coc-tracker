"""
Xác thực thành viên — mỗi player_tag trong clan chỉ được 1 người "nhận" làm
danh tính của mình (đặt PIN tự chọn), sau đó dùng PIN đó đăng nhập.
Khác với auth.py (dành cho admin/chủ web).
"""
import os
import hmac
import hashlib
import time
from fastapi import Header

SECRET = os.environ.get("MEMBER_TOKEN_SECRET") or os.environ.get("ADMIN_PASSWORD", "")


def hash_pin(pin: str, player_tag: str) -> str:
    return hashlib.sha256(f"{player_tag}:{pin}:{SECRET}".encode()).hexdigest()


def create_member_token(player_tag: str) -> str:
    expiry = str(int(time.time()) + 30 * 24 * 3600)
    payload = f"{player_tag}|{expiry}"
    sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}|{sig}"


def verify_member_token(token: str | None) -> str | None:
    if not token:
        return None
    parts = token.split("|")
    if len(parts) != 3:
        return None
    player_tag, expiry, sig = parts
    if not expiry.isdigit() or int(expiry) < time.time():
        return None
    expected = hmac.new(SECRET.encode(), f"{player_tag}|{expiry}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    return player_tag


async def get_current_member(x_member_token: str | None = Header(default=None)) -> str | None:
    return verify_member_token(x_member_token)
