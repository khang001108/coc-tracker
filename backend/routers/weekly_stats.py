"""Xem lại lịch sử Báo cáo thống kê tuần (Top 5 tốt/xấu) — xem
services/weekly_report.py để biết cách tổng hợp."""
from fastapi import APIRouter, Depends, Request, Query
from supabase_client import get_supabase
from clan_context import get_clan_id
from auth import require_admin
from services.weekly_report import generate_weekly_report

router = APIRouter()


@router.get("/latest")
async def get_latest(request: Request):
    clan_id = get_clan_id(request)
    sb = get_supabase()
    res = (sb.table("weekly_report_log").select("*").eq("clan_id", clan_id)
           .order("created_at", desc=True).limit(1).execute())
    return res.data[0] if res.data else None


@router.get("/history")
async def get_history(request: Request, limit: int = Query(20, le=100)):
    clan_id = get_clan_id(request)
    sb = get_supabase()
    res = (sb.table("weekly_report_log").select("*").eq("clan_id", clan_id)
           .order("created_at", desc=True).limit(limit).execute())
    return res.data or []


@router.post("/generate-now")
async def generate_now(request: Request, _: bool = Depends(require_admin)):
    """Admin tự tạo + gửi báo cáo tuần ngay (không cần chờ lịch tự động thứ 2
    hàng tuần) — hữu ích để kiểm tra hoặc gửi bổ sung."""
    clan_id = get_clan_id(request)
    return await generate_weekly_report(clan_id)
