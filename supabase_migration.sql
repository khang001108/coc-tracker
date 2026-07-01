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
