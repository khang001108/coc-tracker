from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import clan, war, capital, games, members, settings, notify, events, music, member_auth, chat, shop
from schedulers.poller import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    await start_scheduler()
    yield
    await stop_scheduler()

app = FastAPI(title="CoC Tracker API", version="1.0.0", lifespan=lifespan)

# Fix CORS — cho phép mọi origin (frontend Render gọi được backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,      # phải False khi allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clan.router,     prefix="/api/clan",     tags=["Clan"])
app.include_router(war.router,      prefix="/api/war",      tags=["War"])
app.include_router(capital.router,  prefix="/api/capital",  tags=["Capital"])
app.include_router(games.router,    prefix="/api/games",    tags=["Games"])
app.include_router(members.router,  prefix="/api/members",  tags=["Members"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(notify.router,   prefix="/api/notify",   tags=["Notify"])
app.include_router(events.router,   prefix="/api/events",   tags=["Events"])
app.include_router(music.router,    prefix="/api/music",    tags=["Music"])
app.include_router(member_auth.router, prefix="/api/member", tags=["MemberAuth"])
app.include_router(chat.router,     prefix="/api/chat",     tags=["Chat"])
app.include_router(shop.router,     prefix="/api/shop",     tags=["Shop"])

@app.get("/")
async def root():
    return {"message": "CoC Tracker API", "docs": "/docs", "health": "/health"}

@app.get("/health")
async def health():
    return {"status": "ok"}
