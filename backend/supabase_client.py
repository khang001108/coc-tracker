import os
from supabase import create_client, Client

_client: Client | None = None

def get_supabase() -> Client:
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL", "").strip()
        # Hỗ trợ cả tên cũ và mới
        key = (
            os.environ.get("SUPABASE_SERVICE_KEY", "") or
            os.environ.get("SUPABASE_SECRET_KEY", "") or
            os.environ.get("SUPABASE_KEY", "")
        ).strip()
        if not url or not key:
            raise RuntimeError(
                "Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY trong environment variables"
            )
        _client = create_client(url, key)
    return _client
