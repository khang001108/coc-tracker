-- CoC Tracker — Supabase Schema
-- Run this in Supabase SQL Editor

-- ── Settings (key-value store) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Insert default keys
INSERT INTO settings (key, value) VALUES
  ('coc_api_key',         ''),
  ('clan_tag',            ''),
  ('discord_webhook',     ''),
  ('telegram_bot_token',  ''),
  ('telegram_chat_id',    ''),
  ('notify_war',          'true'),
  ('notify_raid',         'true'),
  ('notify_donate',       'false'),
  ('notify_member',       'true')
ON CONFLICT (key) DO NOTHING;

-- ── Snapshots (cached CoC API responses) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS snapshot_clan (
  id         SERIAL PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snapshot_war (
  id         SERIAL PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snapshot_raid (
  id         SERIAL PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Member log (join/leave tracking) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_log (
  id          SERIAL PRIMARY KEY,
  player_tag  TEXT NOT NULL,
  name        TEXT NOT NULL,
  th_level    INTEGER DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'active', -- 'active' | 'left'
  joined_at   TIMESTAMPTZ,
  left_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_log_status ON member_log(status);
CREATE INDEX IF NOT EXISTS idx_member_log_tag ON member_log(player_tag);

-- ── War history (cached for faster queries) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS war_history (
  id              SERIAL PRIMARY KEY,
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  team_size       INTEGER,
  our_stars       INTEGER DEFAULT 0,
  opp_stars       INTEGER DEFAULT 0,
  our_destruction FLOAT DEFAULT 0,
  opp_destruction FLOAT DEFAULT 0,
  opponent_name   TEXT,
  opponent_tag    TEXT,
  result          TEXT, -- 'win' | 'lose' | 'draw'
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Disable RLS for service role (backend uses service key) ─────────────────
ALTER TABLE settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_clan ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_war  ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_raid ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_history   ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by FastAPI backend)
DROP POLICY IF EXISTS "service_all" ON settings;
CREATE POLICY "service_all" ON settings     FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON snapshot_clan;
CREATE POLICY "service_all" ON snapshot_clan FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON snapshot_war;
CREATE POLICY "service_all" ON snapshot_war  FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON snapshot_raid;
CREATE POLICY "service_all" ON snapshot_raid FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON member_log;
CREATE POLICY "service_all" ON member_log    FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON war_history;
CREATE POLICY "service_all" ON war_history   FOR ALL TO service_role USING (true);

-- ── Events (sự kiện trao thưởng) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id               SERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT DEFAULT '',
  event_type       TEXT NOT NULL DEFAULT 'war',      -- 'war' | 'cwl' | 'custom'
  condition_type   TEXT NOT NULL DEFAULT 'total_stars',
  -- 'total_stars' | 'best_destruction' | 'perfect_war' | 'most_attacks_used'
  -- | 'fewest_stars_conceded' | 'top_donations' | 'manual'
  top_n            INTEGER NOT NULL DEFAULT 3,        -- lấy top N người
  reward_name      TEXT DEFAULT '',
  reward_image_url TEXT DEFAULT '',
  reward_shop_link TEXT DEFAULT '',                   -- "Link quà"
  war_end_time     TEXT DEFAULT '',                   -- endTime của war dùng để tính (lưu lúc tạo/kết thúc)
  start_time       TIMESTAMPTZ,                       -- thời gian bắt đầu sự kiện (tự chọn hoặc lấy từ war)
  end_time         TIMESTAMPTZ,                       -- thời gian kết thúc sự kiện
  creator_name     TEXT DEFAULT '',                   -- tên người tạo (Đồng thủ lĩnh+ hoặc admin)
  creator_tag      TEXT,                              -- player_tag người tạo (NULL nếu admin web tạo)
  creator_zalo     TEXT DEFAULT '',                   -- số Zalo liên hệ của người tạo
  status           TEXT NOT NULL DEFAULT 'active',
  -- 'pending' (chờ admin duyệt) | 'active' | 'rejected' | 'pending_delete' (chờ admin xác nhận xoá) | 'closed'
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time   TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time     TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS creator_name TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS creator_tag  TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS creator_zalo TEXT DEFAULT '';

-- ── Event claims (người nhận thưởng) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_claims (
  id          SERIAL PRIMARY KEY,
  event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_tag  TEXT NOT NULL,
  player_name TEXT NOT NULL,
  rank        INTEGER,
  metric_value TEXT,                                  -- giá trị đạt được (vd "9 sao", "3 trận hoàn hảo")
  claimed     BOOLEAN NOT NULL DEFAULT false,
  claimed_at  TIMESTAMPTZ,
  UNIQUE(event_id, player_tag)
);

ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON events;
CREATE POLICY "service_all" ON events       FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON event_claims;
CREATE POLICY "service_all" ON event_claims FOR ALL TO service_role USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_claims TO service_role;

-- ── Soundtracks (nhạc nền) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS soundtracks (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE soundtracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON soundtracks;
CREATE POLICY "service_all" ON soundtracks FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.soundtracks TO service_role;

-- ── Cửa hàng vật phẩm (lâu đài / pháo trang trí bản đồ chiến trường) ────────
CREATE TABLE IF NOT EXISTS shop_items (
  id          SERIAL PRIMARY KEY,
  item_type   TEXT NOT NULL,           -- 'castle' | 'cannon'
  svg_key     TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  price_coins INTEGER NOT NULL DEFAULT 2000
);

INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('castle', 'castle_classic',  'Lâu Đài Cổ Điển',     0),
  ('castle', 'castle_round',    'Lâu Đài Tháp Tròn',   3000),
  ('castle', 'castle_fortress', 'Pháo Đài Đá',         6000),
  ('castle', 'castle_royal',    'Hoàng Cung Vàng',     10000),
  ('cannon', 'cannon_basic',    'Pháo Cơ Bản',         0),
  ('cannon', 'cannon_double',   'Pháo Nòng Đôi',       2000),
  ('cannon', 'cannon_turret',   'Tháp Pháo Xoay',      5000),
  ('cannon', 'cannon_mythic',   'Pháo Huyền Thoại',    8000),
  ('effect', 'effect_sparkle',  'Tia Lửa Quanh Tên',   3000),
  ('effect', 'effect_glow',     'Hào Quang Vàng',      4000),
  ('effect', 'effect_rainbow',  'Ánh Cầu Vồng',        5000),
  ('effect', 'effect_fire',     'Ngọn Lửa Cháy',       6000),
  ('effect', 'effect_ice',      'Băng Giá Lấp Lánh',   6000),
  ('effect', 'effect_royal',    'Hoàng Gia Lấp Lánh',  9000)
ON CONFLICT (svg_key) DO NOTHING;

INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('number_effect', 'num_bounce',  'Số Nảy Pixel',       2500),
  ('number_effect', 'num_neon',    'Số Neon Sáng',       4000),
  ('number_effect', 'num_spin',    'Vòng Số Xoay',       5000),
  ('number_effect', 'num_pop',     'Số Bling Bling',     5500)
ON CONFLICT (svg_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS member_inventory (
  id           SERIAL PRIMARY KEY,
  player_tag   TEXT NOT NULL,
  item_id      INTEGER NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_tag, item_id)
);

ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS equipped_castle TEXT DEFAULT 'castle_classic';
ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS equipped_cannon TEXT DEFAULT 'cannon_basic';
ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS equipped_effect TEXT;
ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS equipped_number_effect TEXT;
ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS assets_cleared  BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE shop_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON shop_items;
CREATE POLICY "service_all" ON shop_items       FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON member_inventory;
CREATE POLICY "service_all" ON member_inventory FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_items       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_inventory TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Cài đặt admin: sau bao nhiêu ngày rời clan thì xoá Coins/vật phẩm
INSERT INTO settings (key, value) VALUES ('asset_cleanup_days', '7')
ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('coins_per_war_star', '100')
ON CONFLICT (key) DO NOTHING;

-- Theo dõi sao đã tính Coins theo từng war (war_key = endTime, đổi mỗi war mới)
CREATE TABLE IF NOT EXISTS war_star_tracker (
  war_key     TEXT NOT NULL,
  player_tag  TEXT NOT NULL,
  last_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (war_key, player_tag)
);
ALTER TABLE war_star_tracker ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON war_star_tracker;
CREATE POLICY "service_all" ON war_star_tracker FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.war_star_tracker TO service_role;

-- ── Member accounts (nhận diện thành viên — mỗi player_tag chỉ 1 người nhận) ──
CREATE TABLE IF NOT EXISTS member_accounts (
  player_tag  TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  pin_hash    TEXT NOT NULL,
  coins       INTEGER NOT NULL DEFAULT 0,
  claimed_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

-- ── Chat messages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          SERIAL PRIMARY KEY,
  room        TEXT NOT NULL DEFAULT 'global',  -- 'clan' | 'global'
  sender_name TEXT NOT NULL,
  sender_tag  TEXT,
  message     TEXT DEFAULT '',
  image_url   TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_room_id ON chat_messages(room, id);

-- ── Donation tracker (phát hiện donate tăng để thông báo trong chat clan) ────
CREATE TABLE IF NOT EXISTS donation_tracker (
  player_tag      TEXT PRIMARY KEY,
  last_donations  INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE member_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_tracker  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON member_accounts;
CREATE POLICY "service_all" ON member_accounts  FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON chat_messages;
CREATE POLICY "service_all" ON chat_messages    FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON donation_tracker;
CREATE POLICY "service_all" ON donation_tracker FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_accounts  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donation_tracker TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ── Event participants (thành viên đăng ký tham gia sự kiện) ─────────────────
-- Chỉ thành viên đã đăng nhập web (có member_accounts) mới join được
-- Leaderboard/xét thưởng chỉ tính người có trong bảng này
CREATE TABLE IF NOT EXISTS event_participants (
  id          SERIAL PRIMARY KEY,
  event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_tag  TEXT NOT NULL,
  player_name TEXT NOT NULL,
  joined_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, player_tag)
);
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON event_participants;
CREATE POLICY "service_all" ON event_participants FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participants TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ── Thêm cột reward_coins vào events (thưởng coins từ người tổ chức) ──────
ALTER TABLE events ADD COLUMN IF NOT EXISTS reward_coins INTEGER DEFAULT 0;

-- ── Thêm lâu đài và pháo mới ─────────────────────────────────────────────
INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('castle', 'castle_dragon',   'Lâu Đài Rồng Lửa',    15000),
  ('castle', 'castle_ice',      'Băng Cung Tuyết',      18000),
  ('castle', 'castle_shadow',   'Lâu Đài Bóng Tối',    22000),
  ('castle', 'castle_celestial','Thiên Cung Vàng',      30000),
  ('cannon', 'cannon_laser',    'Pháo Laser',           12000),
  ('cannon', 'cannon_storm',    'Pháo Bão Tố',         15000),
  ('cannon', 'cannon_dragon',   'Pháo Rồng',           20000),
  ('cannon', 'cannon_celestial','Pháo Thiên Thần',     28000)
ON CONFLICT (svg_key) DO NOTHING;

-- ── Cài đặt xoá lịch sử chat tự động ────────────────────────────────────
INSERT INTO settings (key, value) VALUES ('chat_retention_days', '30')
ON CONFLICT (key) DO NOTHING;

-- ── Lâu đài thú cưng ──────────────────────────────────────────────────────
INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('castle', 'castle_cat',        'Lâu Đài Mèo Chúa',   8000),
  ('castle', 'castle_tiger',      'Lâu Đài Hổ Dữ',     12000),
  ('castle', 'castle_panda',      'Lâu Đài Gấu Trúc',  16000),
  ('cannon', 'cannon_cat',        'Pháo Mèo Ú',          5000),
  ('cannon', 'cannon_tiger',      'Pháo Hổ Gầm',         8000),
  ('cannon', 'cannon_panda',      'Pháo Gấu Trúc',      10000),
  ('cannon', 'cannon_dragon_face','Pháo Rồng Mặt',      14000)
ON CONFLICT (svg_key) DO NOTHING;

-- ── Hiệu ứng tên thêm ─────────────────────────────────────────────────────
INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('name_effect', 'ne_rainbow',   'Cầu Vồng Lấp Lánh',  8000),
  ('name_effect', 'ne_electric',  'Điện Xẹt',            7000),
  ('name_effect', 'ne_shadow',    'Bóng Tối Huyền Bí',   6000),
  ('name_effect', 'ne_crystal',   'Pha Lê Trong Suốt',  10000)
ON CONFLICT (svg_key) DO NOTHING;

-- ── Hiệu ứng số TH thêm ───────────────────────────────────────────────────
INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('number_effect', 'ne_fire_num',  'Số Lửa',              6000),
  ('number_effect', 'ne_ice_num',   'Số Băng',             6000),
  ('number_effect', 'ne_rainbow_num','Số Cầu Vồng',        8000),
  ('number_effect', 'ne_crown_num', 'Số Vương Miện',      10000)
ON CONFLICT (svg_key) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- MULTI-CLAN MIGRATION
-- Chạy sau khi đã có data clan đầu tiên (backward compatible)
-- ════════════════════════════════════════════════════════════════

-- 1. Bảng clans — mỗi clan là 1 workspace riêng
CREATE TABLE IF NOT EXISTS clans (
  id                SERIAL PRIMARY KEY,
  clan_tag          TEXT NOT NULL,
  clan_name         TEXT DEFAULT 'Clan mới',
  admin_token       TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  coc_api_key       TEXT DEFAULT '',
  discord_webhook   TEXT DEFAULT '',
  telegram_bot_token TEXT DEFAULT '',
  telegram_chat_id  TEXT DEFAULT '',
  notify_war        BOOLEAN DEFAULT true,
  notify_raid       BOOLEAN DEFAULT true,
  notify_join_leave BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clan_tag)
);
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON clans;
CREATE POLICY "service_all" ON clans FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clans TO service_role;

-- 2. Migrate clan hiện tại vào bảng clans (id=1)
-- Lấy clan_tag và api_key từ settings hiện có
INSERT INTO clans (id, clan_tag, clan_name, coc_api_key, discord_webhook, telegram_bot_token, telegram_chat_id)
SELECT
  1,
  COALESCE((SELECT value FROM settings WHERE key = 'clan_tag'), '#UNKNOWN'),
  'Clan chính',
  COALESCE((SELECT value FROM settings WHERE key = 'coc_api_key'), ''),
  COALESCE((SELECT value FROM settings WHERE key = 'discord_webhook'), ''),
  COALESCE((SELECT value FROM settings WHERE key = 'telegram_bot_token'), ''),
  COALESCE((SELECT value FROM settings WHERE key = 'telegram_chat_id'), '')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence để id tiếp theo bắt đầu từ 2
SELECT setval('clans_id_seq', GREATEST(1, (SELECT MAX(id) FROM clans)));

-- 3. Thêm clan_id vào các bảng chính (DEFAULT 1 = backward compatible)
ALTER TABLE events              ADD COLUMN IF NOT EXISTS clan_id INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE;
ALTER TABLE event_participants  ADD COLUMN IF NOT EXISTS clan_id INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE;
ALTER TABLE event_claims        ADD COLUMN IF NOT EXISTS clan_id INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE;
ALTER TABLE chat_messages       ADD COLUMN IF NOT EXISTS clan_id INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE;
ALTER TABLE member_accounts     ADD COLUMN IF NOT EXISTS clan_id INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE;

-- 4. Backfill clan_id=1 cho data cũ
UPDATE events             SET clan_id = 1 WHERE clan_id IS NULL;
UPDATE event_participants SET clan_id = 1 WHERE clan_id IS NULL;
UPDATE event_claims       SET clan_id = 1 WHERE clan_id IS NULL;
UPDATE chat_messages      SET clan_id = 1 WHERE clan_id IS NULL;
UPDATE member_accounts    SET clan_id = 1 WHERE clan_id IS NULL;

-- 5. Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_events_clan             ON events(clan_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_clan ON event_participants(clan_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_clan      ON chat_messages(clan_id);
CREATE INDEX IF NOT EXISTS idx_member_accounts_clan    ON member_accounts(clan_id);

-- ════════════════════════════════════════════════════════════════
-- MULTI-CLAN MIGRATION — PART 2
-- Backend code (routers/events.py, routers/chat.py, schedulers/poller.py,
-- routers/members.py) đã hỗ trợ các tính năng dưới đây — chạy phần này để
-- CSDL có đủ cột thì tính năng mới thật sự hoạt động (nếu chưa chạy, code
-- vẫn không lỗi vì có fallback, nhưng sẽ luôn rơi về hành vi clan #1 cũ).
-- ════════════════════════════════════════════════════════════════

-- 1. Nhật ký thành viên (member_log) — tách riêng theo từng clan
ALTER TABLE member_log ADD COLUMN IF NOT EXISTS clan_id INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE;
UPDATE member_log SET clan_id = 1 WHERE clan_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_member_log_clan ON member_log(clan_id);

-- 2. Chat Toàn Cầu liên clan — lưu kèm huy hiệu hội/TH/lâu đài/pháo của
--    người gửi tại thời điểm gửi tin (để tin nhắn cũ vẫn hiển thị đúng dù
--    sau này họ đổi trang bị hoặc đổi clan).
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_clan_id   INTEGER REFERENCES clans(id) ON DELETE SET NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_clan_name TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_th        INTEGER;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_castle    TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_cannon    TEXT;

-- 3. Sự kiện — phạm vi riêng clan (private) hoặc liên clan (public), với
--    danh sách clan được phép tham gia (rỗng/NULL = tất cả clan).
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility       TEXT NOT NULL DEFAULT 'private'; -- 'private' | 'public'
ALTER TABLE events ADD COLUMN IF NOT EXISTS allowed_clan_ids INTEGER[];
UPDATE events SET visibility = 'private' WHERE visibility IS NULL;

-- event_participants đã có clan_id ở PART 1 phía trên (dùng để biết mỗi
-- người tham gia sự kiện liên clan thuộc clan nào khi tính bảng xếp hạng).

-- ════════════════════════════════════════════════════════════════
-- MULTI-CLAN MIGRATION — PART 3
-- Cho phép cache snapshot (clan/war/raid) lưu riêng theo từng clan, để
-- danh sách "đổi clan" hiện đúng cờ/huy hiệu + tên thật của từng clan mà
-- không phải gọi trực tiếp CoC API mỗi lần mở dropdown.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE snapshot_clan ADD COLUMN IF NOT EXISTS clan_id INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE;
ALTER TABLE snapshot_war  ADD COLUMN IF NOT EXISTS clan_id INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE;
ALTER TABLE snapshot_raid ADD COLUMN IF NOT EXISTS clan_id INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE;
UPDATE snapshot_clan SET clan_id = 1 WHERE clan_id IS NULL;
UPDATE snapshot_war  SET clan_id = 1 WHERE clan_id IS NULL;
UPDATE snapshot_raid SET clan_id = 1 WHERE clan_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_snapshot_clan_clan ON snapshot_clan(clan_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_war_clan  ON snapshot_war(clan_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_raid_clan ON snapshot_raid(clan_id);

-- "Clan chính" chỉ là tên tạm lúc migrate — đổi về tên hội THẬT lấy từ
-- snapshot clan (nếu đã có), để danh sách đổi clan không còn hiện chữ
-- "Clan chính" chung chung nữa.
UPDATE clans SET clan_name = (
  SELECT (sc.data::json ->> 'name') FROM snapshot_clan sc WHERE sc.clan_id = clans.id ORDER BY sc.id DESC LIMIT 1
)
WHERE clans.id = 1 AND clans.clan_name = 'Clan chính'
  AND EXISTS (SELECT 1 FROM snapshot_clan sc WHERE sc.clan_id = clans.id);

-- ════════════════════════════════════════════════════════════════
-- WEB PUSH NOTIFICATIONS (thông báo ngoài app)
-- Cho phép người dùng bật thông báo trình duyệt/PWA khi có tin nhắn chat
-- mới hoặc sự kiện mới, kể cả khi không mở app. Cần cấu hình biến môi
-- trường VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY trên backend (xem README).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           SERIAL PRIMARY KEY,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  clan_id      INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  player_tag   TEXT,                 -- NULL nếu đăng ký khi chưa đăng nhập thành viên
  notify_chat  BOOLEAN NOT NULL DEFAULT true,
  notify_event BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_sub_clan ON push_subscriptions(clan_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON push_subscriptions;
CREATE POLICY "service_all" ON push_subscriptions FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO service_role;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 4 (đổi clan cho member, cờ hội trong chat, xác minh thành viên)
-- ════════════════════════════════════════════════════════════════

-- Chat: lưu kèm URL cờ/huy hiệu hội thật của người gửi (thay vì icon tự vẽ)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_clan_badge TEXT;

-- Ghi chú: KHÔNG cần cột DB cho "mã xác minh thành viên" — mã này được cấu
-- hình bằng biến môi trường MEMBER_SETUP_CODE trên Render (Settings →
-- Environment), không lưu trong CSDL. Để trống/không set = tắt yêu cầu xác
-- minh (ai bấm "Đây là tôi" cũng nhận được luôn, như trước giờ).

-- Nhạc: cho phép kéo-thả sắp xếp thứ tự phát trong Cài đặt
ALTER TABLE soundtracks ADD COLUMN IF NOT EXISTS sort_order INTEGER;
