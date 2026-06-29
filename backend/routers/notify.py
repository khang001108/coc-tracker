from fastapi import APIRouter, HTTPException
from services.notify_service import notify_all

router = APIRouter()

@router.post("/send")
async def send(body: dict):
    msg = body.get("message", "")
    title = body.get("title", "")
    if not msg: raise HTTPException(400, "message trống")
    await notify_all(msg, title=title)
    return {"ok": True}
