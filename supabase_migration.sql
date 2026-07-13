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

-- (Fix thứ tự) Tạo trước bảng member_accounts tối thiểu ở đây — vì các dòng
-- ALTER TABLE ngay dưới cần bảng này tồn tại. Định nghĩa đầy đủ (thêm cột
-- pin_hash, coins...) nằm ở phần "Member accounts" phía dưới, IF NOT EXISTS
-- nên chạy lại không sao. Nếu bạn đã chạy file này trước đây thì bảng đã có
-- sẵn rồi, dòng này chỉ là no-op, không ảnh hưởng gì dữ liệu cũ.
CREATE TABLE IF NOT EXISTS member_accounts (
  player_tag  TEXT PRIMARY KEY,
  player_name TEXT NOT NULL DEFAULT '',
  pin_hash    TEXT NOT NULL DEFAULT '',
  claimed_at  TIMESTAMPTZ DEFAULT now()
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

-- Chat: lưu kèm hiệu ứng tên/số của người gửi (trước đây chưa lưu nên hiệu
-- ứng mua ở cửa hàng không hiện trong Chat, đặc biệt là Chat Toàn Cầu khi
-- người gửi thuộc 1 clan khác với clan đang xem)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_effect TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_number_effect TEXT;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 5 (Thống kê tích luỹ: war yếu/hay bỏ war/donate ít,
-- theo tuần/tháng/từ đầu) + xoá dữ liệu định kỳ
-- ════════════════════════════════════════════════════════════════

-- Ghi lại lượt tham chiến của TỪNG thành viên mỗi khi 1 war kết thúc — để
-- tính "hay bỏ war" (không đánh hết lượt) và "war yếu" (TB sao/war) tích
-- luỹ theo thời gian, thay vì chỉ nhìn war hiện tại.
CREATE TABLE IF NOT EXISTS war_participation_log (
  id               SERIAL PRIMARY KEY,
  clan_id          INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  war_end_time     TEXT NOT NULL,
  war_type         TEXT NOT NULL DEFAULT 'random',  -- 'random' | 'cwl'
  player_tag       TEXT NOT NULL,
  player_name      TEXT NOT NULL,
  attacks_used     INTEGER NOT NULL DEFAULT 0,
  attacks_allowed  INTEGER NOT NULL DEFAULT 2,
  stars_earned     INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clan_id, war_end_time, player_tag)
);
CREATE INDEX IF NOT EXISTS idx_war_participation_clan_time ON war_participation_log(clan_id, created_at);

-- Ghi lại tổng donate của từng người MỖI KHI phát hiện CoC reset donate hàng
-- tuần (số donate tự nhiên giảm về 0) — để cộng dồn tính theo tuần/tháng.
CREATE TABLE IF NOT EXISTS donation_snapshot_log (
  id                   SERIAL PRIMARY KEY,
  clan_id              INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  player_tag           TEXT NOT NULL,
  player_name          TEXT NOT NULL,
  donations            INTEGER NOT NULL DEFAULT 0,
  donations_received   INTEGER NOT NULL DEFAULT 0,
  snapshot_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_donation_snapshot_clan_time ON donation_snapshot_log(clan_id, snapshot_at);

ALTER TABLE donation_tracker ADD COLUMN IF NOT EXISTS last_donations_received INTEGER NOT NULL DEFAULT 0;

ALTER TABLE war_participation_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_snapshot_log  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON war_participation_log;
CREATE POLICY "service_all" ON war_participation_log FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON donation_snapshot_log;
CREATE POLICY "service_all" ON donation_snapshot_log FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.war_participation_log  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donation_snapshot_log  TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 6 (hợp nhất cấu hình clan #1 vào bảng `clans`)
-- Trước đây clan #1 dùng RIÊNG bảng `settings` (key='coc_api_key'/'clan_tag')
-- cho mọi lệnh gọi CoC API sống, trong khi màn "Quản lý Clan" lại sửa vào
-- bảng `clans` (không có tác dụng gì với clan #1!). Giờ mọi clan — kể cả #1
-- — đều dùng thống nhất bảng `clans`. Đoạn dưới copy giá trị đang hoạt động
-- từ `settings` sang `clans` (chỉ khi clans.id=1 đang trống) để không bị mất
-- cấu hình đang chạy.
-- ════════════════════════════════════════════════════════════════
UPDATE clans SET
  coc_api_key = COALESCE(NULLIF(coc_api_key, ''), (SELECT value FROM settings WHERE key = 'coc_api_key')),
  clan_tag    = COALESCE(NULLIF(clan_tag, ''), (SELECT value FROM settings WHERE key = 'clan_tag'))
WHERE id = 1;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 7 (Tấn công/Phòng thủ anh dũng nhất, Lịch sử WCL tích
-- luỹ, Sự kiện loại Clan Capital, ẩn/hiện thẻ ở Tổng quan)
-- ════════════════════════════════════════════════════════════════

-- Thêm cột lưu "đòn đánh tốt nhất" / "phòng thủ tốt nhất" của từng người mỗi
-- war — dùng để tính "Tấn công/Phòng thủ anh dũng nhất" tích luỹ theo
-- tuần/tháng (CoC API không có sẵn 2 chỉ số này, tự tính theo: sao cao nhất
-- → % phá hủy cao nhất → thời gian đánh nhanh nhất).
ALTER TABLE war_participation_log ADD COLUMN IF NOT EXISTS best_attack_stars       INTEGER;
ALTER TABLE war_participation_log ADD COLUMN IF NOT EXISTS best_attack_destruction NUMERIC;
ALTER TABLE war_participation_log ADD COLUMN IF NOT EXISTS best_attack_duration    INTEGER;
ALTER TABLE war_participation_log ADD COLUMN IF NOT EXISTS best_attack_opponent    TEXT;
ALTER TABLE war_participation_log ADD COLUMN IF NOT EXISTS best_defense_stars       INTEGER;
ALTER TABLE war_participation_log ADD COLUMN IF NOT EXISTS best_defense_destruction NUMERIC;
ALTER TABLE war_participation_log ADD COLUMN IF NOT EXISTS best_defense_attacker    TEXT;

-- Lịch sử war tổng quan theo từng war (kể cả CWL) — ghi mỗi khi 1 war kết
-- thúc, dùng cho tab "Lịch sử" (bao gồm cả CWL, vì CoC API không cho xem lại
-- lịch sử CWL mùa cũ, chỉ có thể tự tích luỹ từ đây trở đi).
CREATE TABLE IF NOT EXISTS war_history_log (
  id                    SERIAL PRIMARY KEY,
  clan_id               INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  war_end_time          TEXT NOT NULL,
  war_type              TEXT NOT NULL DEFAULT 'random',
  opponent_name         TEXT,
  opponent_tag          TEXT,
  team_size             INTEGER,
  clan_stars            INTEGER,
  opponent_stars        INTEGER,
  clan_destruction      NUMERIC,
  opponent_destruction  NUMERIC,
  result                TEXT,  -- 'win' | 'lose' | 'tie'
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clan_id, war_end_time)
);
CREATE INDEX IF NOT EXISTS idx_war_history_clan_time ON war_history_log(clan_id, created_at);
ALTER TABLE war_history_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON war_history_log;
CREATE POLICY "service_all" ON war_history_log FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.war_history_log TO service_role;

-- Cho phép admin ẩn/hiện từng thẻ ở trang Tổng quan (mặc định hiện hết —
-- đọc trong app: giá trị rỗng/không có = hiện).
-- (Không cần bảng riêng — dùng chung bảng settings có sẵn với các key:
--  overview_show_war, overview_show_cwl, overview_show_capital)

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 8 (sửa 4 vật phẩm "mất tích" khỏi Cửa hàng thật)
-- 4 hiệu ứng tên (ne_rainbow, ne_electric, ne_shadow, ne_crystal) được
-- insert với item_type='name_effect', nhưng giao diện Cửa hàng chỉ hiểu
-- 4 loại: castle/cannon/effect/number_effect — nên trước giờ chúng nằm
-- trong CSDL, admin đặt giá được, nhưng KHÔNG bao giờ hiện ra để mua.
-- Đổi item_type về 'effect' (đúng nhóm "Hiệu ứng tên") để hiện ra Cửa hàng.
-- Code cũng đã được bổ sung để 4 hiệu ứng này thật sự chạy hoạt ảnh (trước
-- đây dù mua/gắn cũng không hiện gì vì component chưa hỗ trợ).
-- ════════════════════════════════════════════════════════════════
UPDATE shop_items SET item_type = 'effect' WHERE item_type = 'name_effect';

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 9 (sự kiện Donate, báo cáo sự kiện, mốc donate lúc tham gia)
-- ════════════════════════════════════════════════════════════════

-- Lưu số donate của người tham gia NGAY LÚC HỌ JOIN sự kiện loại Donate —
-- để tính "donate từ lúc bắt đầu sự kiện" = donate hiện tại - mốc này.
-- (Giới hạn: nếu CoC reset donate hàng tuần ngay giữa lúc sự kiện đang diễn
-- ra, số sẽ bị lệch — CoC không cho lấy lịch sử donate chi tiết theo giờ).
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS baseline_donations INTEGER DEFAULT 0;

-- Report (tố cáo) sự kiện sai trái/lừa đảo — admin xem trong Cài đặt
CREATE TABLE IF NOT EXISTS event_reports (
  id            SERIAL PRIMARY KEY,
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_title   TEXT,
  reporter_tag  TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'resolved'
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE event_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON event_reports;
CREATE POLICY "service_all" ON event_reports FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_reports TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 10 (thời gian nhắc nhở tuỳ chỉnh, chống spam thông báo,
-- thêm loại thông báo ngoài app, xoá cache tạm)
-- ════════════════════════════════════════════════════════════════

-- Chống gửi lặp lại thông báo War/Raid nhiều lần trong cùng 1 war/raid —
-- trước đây mỗi lần poll (5 phút/lần) mà còn thiếu người đánh là gửi lại
-- toàn bộ, có thể spam Discord/Telegram hàng chục lần trong 1 war.
CREATE TABLE IF NOT EXISTS notify_dedup (
  id           SERIAL PRIMARY KEY,
  clan_id      INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  notify_type  TEXT NOT NULL,   -- 'war_reminder' | 'raid_reminder' | 'cwl_reminder'
  ref_key      TEXT NOT NULL,   -- vd endTime của war/raid đó
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clan_id, notify_type, ref_key)
);
ALTER TABLE notify_dedup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON notify_dedup;
CREATE POLICY "service_all" ON notify_dedup FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notify_dedup TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Thời gian nhắc nhở tuỳ chỉnh (mặc định: nhắc war khi còn 2h, nhắc raid khi còn 24h)
INSERT INTO settings (key, value) VALUES ('war_reminder_hours', '2') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('raid_reminder_hours', '24') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('notify_cwl', 'true') ON CONFLICT (key) DO NOTHING;

-- Thông báo ngoài app (Push): thêm loại War/Raid bên cạnh Chat/Sự kiện có sẵn
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS notify_war  BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS notify_raid BOOLEAN NOT NULL DEFAULT true;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 11 (sửa lại đúng ý: cho phép công khai đổi TAG của 1
-- clan cụ thể đã có sẵn API Key, thay vì tạo clan mới trống API Key)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE clans ADD COLUMN IF NOT EXISTS public_editable BOOLEAN NOT NULL DEFAULT false;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 12 (link nhóm Zalo/Telegram/Discord công khai để mời
-- thành viên tham gia — KHÁC với webhook/bot token dùng để gửi thông báo)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE clans ADD COLUMN IF NOT EXISTS zalo_group_link     TEXT DEFAULT '';
ALTER TABLE clans ADD COLUMN IF NOT EXISTS telegram_group_link TEXT DEFAULT '';
ALTER TABLE clans ADD COLUMN IF NOT EXISTS discord_group_link  TEXT DEFAULT '';

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 13 (chọn nhận thông báo đẩy theo TỪNG clan hoặc TẤT CẢ,
-- thay vì chỉ khoá cứng vào 1 clan lúc đăng ký ban đầu)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS clan_ids INTEGER[];
-- Ai đã đăng ký từ trước (chỉ có clan_id đơn) thì coi như đang chọn đúng
-- clan đó — không mất cấu hình cũ.
UPDATE push_subscriptions SET clan_ids = ARRAY[clan_id] WHERE clan_ids IS NULL AND clan_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 14 (Cửa hàng: hiệu ứng tia đạn cho Chiến trường)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS equipped_projectile TEXT;

INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('projectile', 'proj_classic',  'Tia Đạn Cổ Điển',      0),
  ('projectile', 'proj_comet',    'Sao Chổi Lấp Lánh',    3500),
  ('projectile', 'proj_fire',     'Cầu Lửa Rực Cháy',     5000),
  ('projectile', 'proj_lightning','Tia Sét Xanh',         6500),
  ('projectile', 'proj_rainbow',  'Cầu Vồng Huyền Ảo',    9000)
ON CONFLICT (svg_key) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 15 (làm phong phú Tia đạn — thay bộ cũ ít đa dạng bằng
-- các hình dạng ngầu hơn: tên lửa, rồng, phi đao, cung tên, bom thối...)
-- ════════════════════════════════════════════════════════════════
-- Xoá bộ tia đạn cũ (chỉ khác màu, không khác hình) — ai đã trang bị các
-- skin này thì tự động rơi về Cổ Điển (proj_classic), không lỗi gì.
DELETE FROM shop_items WHERE svg_key IN ('proj_comet', 'proj_fire', 'proj_lightning', 'proj_rainbow');

INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('projectile', 'proj_rocket',     'Hoả Tiễn',    4000),
  ('projectile', 'proj_dragon',     'Long Hoả',    8500),
  ('projectile', 'proj_cannonball', 'Đại Bác',     3000),
  ('projectile', 'proj_dart',       'Phi Đao',     3500),
  ('projectile', 'proj_arrow',      'Thần Tiễn',   4500),
  ('projectile', 'proj_poop',       'Bom Thối',    2000),
  ('projectile', 'proj_fridge',     'Tủ Lạnh',     5500),
  ('projectile', 'proj_hammer',     'Búa Thần',    7000),
  ('projectile', 'proj_scissors',   'Lưỡi Kéo',    3000)
ON CONFLICT (svg_key) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 16 (thêm 4 tia đạn mới: Phi Tiêu, Chảo Bay, Bánh Mì, Kẹo Mút)
-- ════════════════════════════════════════════════════════════════
INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('projectile', 'proj_throwdart', 'Phi Tiêu',   3200),
  ('projectile', 'proj_pan',       'Chảo Bay',   4000),
  ('projectile', 'proj_bread',     'Bánh Mì',    2500),
  ('projectile', 'proj_lollipop',  'Kẹo Mút',    2800)
ON CONFLICT (svg_key) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 17 (hiệu ứng nổ khi đạn chạm đích + 3 lâu đài mới đa dạng
-- hình dáng hơn: đồ sộ, phế tích, mái tranh)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS equipped_explosion TEXT;

INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('explosion', 'exp_classic',   'Nổ Cổ Điển',    0),
  ('explosion', 'exp_fireworks', 'Pháo Hoa',      4500),
  ('explosion', 'exp_trash',     'Nổ Bãi Rác',    2200),
  ('explosion', 'exp_snowflake', 'Nổ Bông Tuyết', 3800),
  ('explosion', 'exp_splash',    'Nổ Toé Nước',   3200),
  ('explosion', 'exp_nuclear',   'Nổ Hạt Nhân',   7500)
ON CONFLICT (svg_key) DO NOTHING;

INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('castle', 'castle_grand',  'Đại Thành Đồ Sộ', 12000),
  ('castle', 'castle_ruins',  'Phế Tích Cổ',     2500),
  ('castle', 'castle_straw',  'Nhà Tranh Mộc',   1500)
ON CONFLICT (svg_key) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 18 (Pháo giờ trang trí cho PHÒNG THỦ — Phế Tích Cổ trở
-- thành hình ảnh riêng cho "mất trọn 3 sao khi phòng thủ", không bán trong
-- Cửa hàng nữa — thay bằng Túp Lều Xiêu Vẹo)
-- ════════════════════════════════════════════════════════════════
DELETE FROM shop_items WHERE svg_key = 'castle_ruins';

INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('castle', 'castle_shack', 'Túp Lều Xiêu Vẹo', 1200)
ON CONFLICT (svg_key) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 19 (Lịch sử trao thưởng sự kiện/CWL + cài đặt tự xoá)
-- ════════════════════════════════════════════════════════════════
INSERT INTO settings (key, value) VALUES ('reward_history_retention_days', '90')
ON CONFLICT (key) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 20 (Mã nhận thưởng bảo mật cho event_claims — mỗi
-- người thắng có 1 mã ngẫu nhiên riêng, chỉ người đó và người tổ chức
-- (admin) nhìn thấy được, dùng để xác nhận khi đổi thưởng thay vì
-- công khai số Zalo của người tổ chức)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE event_claims ADD COLUMN IF NOT EXISTS redeem_code TEXT DEFAULT upper(substr(md5(random()::text), 1, 6));
UPDATE event_claims SET redeem_code = upper(substr(md5(random()::text), 1, 6)) WHERE redeem_code IS NULL;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 21 (Dữ liệu chi tiết hơn cho war_participation_log —
-- dùng để tính điểm "War/CWL giỏi nhất tuần": số lượt đạt 3 sao, số lượt
-- đánh vào nhà NGANG hoặc CAO HƠN nhà mình, tổng thời gian đánh (để tính
-- trung bình) — CoC API không có sẵn các chỉ số tổng hợp này.)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE war_participation_log ADD COLUMN IF NOT EXISTS three_star_count      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE war_participation_log ADD COLUMN IF NOT EXISTS good_th_attack_count  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE war_participation_log ADD COLUMN IF NOT EXISTS attack_duration_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE war_participation_log ADD COLUMN IF NOT EXISTS own_townhall          INTEGER;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 22 (Báo cáo thống kê tuần — Top 5 tốt/xấu theo 6 tiêu
-- chí: War/CWL giỏi, Donate, Clan Capital, Tấn công anh dũng, Phòng thủ
-- anh dũng, Coins. Lưu lại lịch sử để xem lại trong app + snapshot Coins
-- làm mốc tính "kiếm được coin trong tuần" cho lần tổng hợp kế tiếp.)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS weekly_report_log (
  id            SERIAL PRIMARY KEY,
  clan_id       INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  report        JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_weekly_report_clan_time ON weekly_report_log(clan_id, created_at);

CREATE TABLE IF NOT EXISTS coin_weekly_baseline (
  clan_id     INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  player_tag  TEXT NOT NULL,
  coins       INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (clan_id, player_tag)
);

ALTER TABLE weekly_report_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_weekly_baseline  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON weekly_report_log;
CREATE POLICY "service_all" ON weekly_report_log FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON coin_weekly_baseline;
CREATE POLICY "service_all" ON coin_weekly_baseline FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_report_log    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coin_weekly_baseline TO service_role;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 23 (Trao thưởng huy chương CWL trong game — giới hạn
-- số suất, xoay vòng công bằng. "1 lần WCL" đếm theo MÙA CWL THẬT lấy từ
-- CoC API (field `season` của /currentwar/leaguegroup, dạng "YYYY-MM"),
-- KHÔNG đếm theo sự kiện tạo trong app, vì API không trả lại được việc
-- ai đã nhận huy chương trong game — phải tự ghi nhận thủ công.)
-- ════════════════════════════════════════════════════════════════

-- Ghi lại MỖI mùa CWL thật đã kết thúc (tự động, khi poller phát hiện
-- leaguegroup.state == 'ended') — dùng làm "đồng hồ" đếm số lần WCL đã
-- trôi qua kể từ lần trao thưởng gần nhất của từng người.
CREATE TABLE IF NOT EXISTS cwl_season_log (
  id         SERIAL PRIMARY KEY,
  clan_id    INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  season     TEXT NOT NULL,
  ended_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clan_id, season)
);

-- Lịch sử trao huy chương trong game — admin/đồng thủ lĩnh tự đánh dấu
-- sau khi đã trao thật trong game (app không có cách nào tự biết được).
CREATE TABLE IF NOT EXISTS medal_reward_log (
  id            SERIAL PRIMARY KEY,
  clan_id       INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  player_tag    TEXT NOT NULL,
  player_name   TEXT NOT NULL,
  season        TEXT NOT NULL,
  awarded_by    TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medal_reward_clan_tag ON medal_reward_log(clan_id, player_tag);

ALTER TABLE cwl_season_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE medal_reward_log   ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON cwl_season_log;
CREATE POLICY "service_all" ON cwl_season_log FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON medal_reward_log;
CREATE POLICY "service_all" ON medal_reward_log FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cwl_season_log   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medal_reward_log TO service_role;

-- Mặc định: sau 3 mùa CWL thật thì được xét nhận huy chương lại (admin có
-- thể đổi số này trong Cài đặt).
INSERT INTO settings (key, value) VALUES ('medal_reward_reset_cwl_count', '3')
ON CONFLICT (key) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 24 (Đánh số MÙA CWL tuần tự 1, 2, 3... cho tính năng
-- huy chương — thay vì chỉ dựa vào field `season` thô của CoC API (dạng
-- "YYYY-MM" hoặc "unknown" nếu clan chưa từng có mùa CWL nào hoàn thành
-- được ghi nhận). season_number = số mùa CWL thật đã hoàn thành + 1, tức
-- "đang ở mùa thứ mấy kể từ khi bắt đầu dùng tính năng này".)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE medal_reward_log ADD COLUMN IF NOT EXISTS season_number INTEGER;
-- Dữ liệu test trước đó (season = 'unknown', chưa có mùa CWL thật nào được
-- ghi nhận) coi như thuộc Mùa 1.
UPDATE medal_reward_log SET season_number = 1 WHERE season_number IS NULL;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 25 (Hệ thống DANH VỌNG — thước đo uy tín thành viên,
-- tính theo CHẤT LƯỢNG đóng góp (tham gia/thắng/3 sao/donate/raid/Clan
-- Games...), KHÔNG dùng để tiêu — chỉ để xếp hạng uy tín + mở khoá vật
-- phẩm Cửa hàng theo ngưỡng Danh vọng + nhân hệ số Coins thưởng theo tier.)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS member_reputation_log (
  id          SERIAL PRIMARY KEY,
  clan_id     INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  player_tag  TEXT NOT NULL,
  player_name TEXT NOT NULL,
  reason      TEXT NOT NULL,   -- war_participate | war_win | three_star | cwl_participate |
                                -- cwl_three_star | donate_500 | clan_games | raid_weekend |
                                -- top_weekly_donor | top_monthly_donor | war_skip | cwl_skip | manual
  points      INTEGER NOT NULL,
  ref_key     TEXT,            -- mốc chống trùng: war_end_time / tuần / tháng tuỳ loại
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clan_id, player_tag, reason, ref_key)
);
CREATE INDEX IF NOT EXISTS idx_reputation_clan_tag ON member_reputation_log(clan_id, player_tag);
CREATE INDEX IF NOT EXISTS idx_reputation_clan_time ON member_reputation_log(clan_id, created_at);

ALTER TABLE member_reputation_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON member_reputation_log;
CREATE POLICY "service_all" ON member_reputation_log FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_reputation_log TO service_role;

-- Ngưỡng điểm Clan Games (achievement "Games Champion") coi là "hoàn thành" —
-- mặc định 4000 (mốc phổ biến), admin có thể đổi nếu clan chơi thử thách nhỏ hơn.
INSERT INTO settings (key, value) VALUES ('reputation_clan_games_target', '4000')
ON CONFLICT (key) DO NOTHING;

-- Ngưỡng Danh vọng để mở khoá vật phẩm Cửa hàng (0 = không yêu cầu).
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS unlock_reputation INTEGER NOT NULL DEFAULT 0;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 26 (Nhiệm vụ — admin/Đồng thủ lĩnh tạo, thưởng Danh vọng
-- hoặc Coins. Điều kiện hoàn thành LUÔN đối chiếu trực tiếp với dữ liệu
-- THẬT từ CoC API (/players/{tag}) tại thời điểm nhận thưởng — không có
-- xác nhận thủ công, tự động chấm và trao ngay nếu đủ điều kiện.)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS quests (
  id             SERIAL PRIMARY KEY,
  clan_id        INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  condition_type TEXT NOT NULL,   -- trophies_reach | best_trophies_reach | th_level_reach |
                                   -- war_stars_reach | attack_wins_reach | defense_wins_reach |
                                   -- donations_reach | capital_contributions_reach
  target_value   INTEGER NOT NULL,
  reward_type    TEXT NOT NULL,   -- reputation | coins
  reward_amount  INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active',  -- active | closed
  created_by     TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  end_time       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS quest_claims (
  id          SERIAL PRIMARY KEY,
  quest_id    INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  player_tag  TEXT NOT NULL,
  player_name TEXT NOT NULL,
  claimed_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quest_id, player_tag)
);
CREATE INDEX IF NOT EXISTS idx_quests_clan ON quests(clan_id, status);
CREATE INDEX IF NOT EXISTS idx_quest_claims_quest ON quest_claims(quest_id);

ALTER TABLE quests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_claims  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON quests;
CREATE POLICY "service_all" ON quests FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "service_all" ON quest_claims;
CREATE POLICY "service_all" ON quest_claims FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quests       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quest_claims TO service_role;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 27 (Phạm vi Nhiệm vụ — riêng clan hay liên clan)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE quests ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'private'; -- private | public

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 28 (Gắn MÙA CWL vào war_history_log để nhóm "Lịch sử
-- War > CWL" theo từng mùa, giống cách game hiển thị "Mùa giải Tháng X")
-- ════════════════════════════════════════════════════════════════
ALTER TABLE war_history_log ADD COLUMN IF NOT EXISTS season TEXT;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 29 (Lưu badge đối thủ để hiện cờ 2 clan trong Lịch sử
-- War, thay vì chỉ chữ W/L/D)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE war_history_log ADD COLUMN IF NOT EXISTS opponent_badge TEXT;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 30 (5 hiệu ứng nổ SPRITE THẬT mới — cao cấp hơn bản vẽ
-- SVG cũ vì dùng đúng khung hình vẽ tay thật (Craftpix), không phải mảnh vỡ
-- ghép hình học. Giá cao hơn nhóm cũ do chất lượng hình ảnh tốt hơn.)
-- ════════════════════════════════════════════════════════════════
INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('explosion', 'exp_craft_fireball',   'Nổ Cầu Lửa (Cao cấp)',        9000),
  ('explosion', 'exp_craft_smoke',      'Nổ Khói (Cao cấp)',            8000),
  ('explosion', 'exp_craft_burst',      'Nổ Bùng Nổ (Cao cấp)',         9500),
  ('explosion', 'exp_craft_shockwave',  'Nổ Sóng Xung Kích (Cao cấp)', 11000),
  ('explosion', 'exp_craft_inferno',    'Nổ Địa Ngục Hoả (Cao cấp)',   13000)
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 32 (6 tia đạn SPRITE THẬT mới — cao cấp hơn hình vẽ SVG
-- cũ vì dùng đúng khung hình vẽ tay thật (Craftpix).)
-- ════════════════════════════════════════════════════════════════
INSERT INTO shop_items (item_type, svg_key, name, price_coins) VALUES
  ('projectile', 'proj_craft_waterball',   'Cầu Nước (Cao cấp)',        7500),
  ('projectile', 'proj_craft_waterspell',  'Phép Nước (Cao cấp)',       8000),
  ('projectile', 'proj_craft_firespell',   'Phép Lửa (Cao cấp)',        8500),
  ('projectile', 'proj_craft_waterarrow',  'Tên Nước (Cao cấp)',        6500),
  ('projectile', 'proj_craft_fireball',    'Cầu Lửa Rồng (Cao cấp)',   10000),
  ('projectile', 'proj_craft_firearrow',   'Tên Lửa (Cao cấp)',         7000)
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 33 (Lịch sử Coins — ghi lại từng lần cộng/trừ Coins để
-- xem được khi bấm vào 1 người ở Thống kê → Tích luỹ → Nhiều Coins nhất)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS coins_log (
  id          SERIAL PRIMARY KEY,
  clan_id     INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  player_tag  TEXT NOT NULL,
  player_name TEXT NOT NULL,
  reason      TEXT NOT NULL,   -- war_star | donate | quest | shop_purchase | event_reward | event_refund | manual
  amount      INTEGER NOT NULL,  -- âm = trừ
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coins_log_clan_tag ON coins_log(clan_id, player_tag);
CREATE INDEX IF NOT EXISTS idx_coins_log_clan_time ON coins_log(clan_id, created_at);

ALTER TABLE coins_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON coins_log;
CREATE POLICY "service_all" ON coins_log FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coins_log TO service_role;

-- ════════════════════════════════════════════════════════════════
-- MIGRATION — PART 34 (Lưu snapshot Top Cúp hàng tháng để xem lại lịch sử
-- 3 mùa Cúp gần nhất — chụp vào ngày 1 mỗi tháng, coi như Cúp cuối mùa vừa
-- qua (xấp xỉ, vì CoC không có API báo chính xác lúc mùa Cúp/Legend reset).)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS trophy_season_log (
  id          SERIAL PRIMARY KEY,
  clan_id     INTEGER DEFAULT 1 REFERENCES clans(id) ON DELETE CASCADE,
  season      TEXT NOT NULL,   -- "YYYY-MM" của tháng vừa chụp (= mùa vừa kết thúc)
  player_tag  TEXT NOT NULL,
  player_name TEXT NOT NULL,
  trophies    INTEGER NOT NULL DEFAULT 0,
  snapshot_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clan_id, season, player_tag)
);
CREATE INDEX IF NOT EXISTS idx_trophy_season_clan ON trophy_season_log(clan_id, season);

ALTER TABLE trophy_season_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all" ON trophy_season_log;
CREATE POLICY "service_all" ON trophy_season_log FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trophy_season_log TO service_role;
