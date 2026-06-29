# 🏰 CoC Tracker — Clash of Clans Clan Dashboard

Theo dõi clan Clash of Clans: War, Raid, Donate, Thành viên, Thống kê.

## Stack
- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: Python FastAPI + APScheduler
- **Database**: Supabase (PostgreSQL)
- **API**: Supercell Official CoC API
- **Notify**: Discord Webhook + Telegram Bot
- **Deploy**: Render.com

---

## 🚀 Setup từng bước

### 1. Supabase
1. Tạo project tại [supabase.com](https://supabase.com)
2. Vào **SQL Editor** → chạy toàn bộ file `supabase_migration.sql`
3. Lấy **Project URL** và **Service Role Key** từ Settings → API

### 2. Render — Backend (FastAPI)
1. New Web Service → Connect GitHub repo
2. Root Dir: `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Environment Variables:
   ```
   SUPABASE_URL          = https://xxxx.supabase.co
   SUPABASE_SERVICE_KEY  = eyJhbGciOiJ...
   ```
6. Deploy → lấy URL backend (VD: `https://coc-tracker-api.onrender.com`)
7. **Lưu ý**: Lấy Static IP của Render để đăng ký CoC API Key

### 3. Render — Frontend (Next.js)
1. New Web Service → Connect GitHub repo
2. Root Dir: `frontend`
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL = https://coc-tracker-api.onrender.com
   ```

### 4. CoC API Key
1. Vào [developer.clashofclans.com](https://developer.clashofclans.com)
2. Đăng nhập bằng tài khoản Supercell
3. My Keys → Create New Key
4. **IP Address**: điền Static IP của Render backend
5. Copy key → dán vào Settings trong app

### 5. Discord Webhook (tùy chọn)
1. Discord Server → Channel Settings → Integrations → Webhooks
2. New Webhook → Copy URL
3. Dán vào Settings → Discord Webhook

### 6. Telegram Bot (tùy chọn)
1. Nhắn @BotFather → /newbot → đặt tên
2. Copy Bot Token
3. Thêm bot vào group, nhắn tin bất kỳ
4. Lấy Chat ID: `https://api.telegram.org/bot{TOKEN}/getUpdates`
5. Dán vào Settings → Telegram

---

## 📁 Cấu trúc thư mục

```
coc-tracker/
├── backend/
│   ├── main.py                    # FastAPI app
│   ├── supabase_client.py         # Supabase singleton
│   ├── requirements.txt
│   ├── routers/
│   │   ├── clan.py
│   │   ├── war.py
│   │   ├── capital.py
│   │   ├── games.py
│   │   ├── members.py
│   │   ├── settings.py
│   │   └── notify.py
│   ├── services/
│   │   ├── coc_api.py             # CoC API wrapper
│   │   └── notify_service.py      # Discord + Telegram
│   └── schedulers/
│       └── poller.py              # APScheduler jobs
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Dashboard
│       │   ├── war/page.tsx       # War & CWL
│       │   ├── capital/page.tsx   # Clan Capital
│       │   ├── donate/page.tsx    # Donate & Clan Games
│       │   ├── members/page.tsx   # Thành viên
│       │   ├── stats/page.tsx     # Thống kê
│       │   └── settings/page.tsx  # Cài đặt
│       ├── components/layout/
│       │   ├── Sidebar.tsx
│       │   └── MobileNav.tsx
│       └── lib/
│           ├── api.ts
│           └── utils.ts
├── supabase_migration.sql
└── render.yaml
```

---

## ⏱️ Polling Schedule

| Job | Tần suất | Mục đích |
|-----|----------|----------|
| Clan overview | 15 phút | Cập nhật thông tin clan |
| War status | 5 phút | Theo dõi war, nhắc attack |
| Raid season | 10 phút | Theo dõi Raid Weekend |
| Member list | 10 phút | Detect join/leave |

---

## ⚠️ Lưu ý

- CoC API **không có webhook** → phải dùng polling
- Render free tier **không có Static IP** → cần upgrade hoặc dùng proxy
- Supabase free tier: 500MB, project pause sau 7 ngày không hoạt động
