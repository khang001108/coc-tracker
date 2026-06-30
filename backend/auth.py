"""
Xác thực admin đơn giản bằng mật khẩu (ADMIN_PASSWORD trong env var).
Không dùng cho hệ thống nhiều người dùng — chỉ để chặn người lạ vào /settings
và các thao tác ghi (tạo/sửa/xoá sự kiện, trao thưởng...).
"""
import os
import hmac
import hashlib
import time
from fastapi import Header, HTTPException

SECRET = os.environ.get("ADMIN_PASSWORD", "")


def _sign(payload: str) -> str:
    return hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_token() -> str:
    """Token dạng <expiry>.<signature>, hết hạn sau 7 ngày."""
    if not SECRET:
        raise HTTPException(500, "Server chưa cấu hình ADMIN_PASSWORD")
    expiry = str(int(time.time()) + 7 * 24 * 3600)
    sig = _sign(expiry)
    return f"{expiry}.{sig}"


def verify_password(password: str) -> bool:
    if not SECRET:
        raise HTTPException(500, "Server chưa cấu hình ADMIN_PASSWORD")
    return hmac.compare_digest(password, SECRET)


async def require_admin(x_admin_token: str | None = Header(default=None)):
    """Dependency: gắn vào route cần bảo vệ."""
    if not SECRET:
        raise HTTPException(500, "Server chưa cấu hình ADMIN_PASSWORD")
    if not x_admin_token or "." not in x_admin_token:
        raise HTTPException(401, "Chưa đăng nhập admin")
    expiry, sig = x_admin_token.split(".", 1)
    if not expiry.isdigit() or int(expiry) < time.time():
        raise HTTPException(401, "Phiên đăng nhập đã hết hạn")
    if not hmac.compare_digest(sig, _sign(expiry)):
        raise HTTPException(401, "Token không hợp lệ")
    return True


def verify_admin_token(token: str | None) -> bool:
    """Giống require_admin nhưng KHÔNG raise — dùng khi 1 endpoint chấp nhận cả admin lẫn member."""
    if not SECRET or not token or "." not in token:
        return False
    expiry, sig = token.split(".", 1)
    if not expiry.isdigit() or int(expiry) < time.time():
        return False
    return hmac.compare_digest(sig, _sign(expiry))
