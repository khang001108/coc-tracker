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
CREATE POLICY "service_all" ON settings     FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON snapshot_clan FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON snapshot_war  FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON snapshot_raid FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON member_log    FOR ALL TO service_role USING (true);
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
  reward_shop_link TEXT DEFAULT '',
  war_end_time     TEXT DEFAULT '',                   -- endTime của war dùng để tính (lưu lúc tạo/kết thúc)
  status           TEXT NOT NULL DEFAULT 'active',     -- 'active' | 'closed'
  created_at       TIMESTAMPTZ DEFAULT now()
);

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
CREATE POLICY "service_all" ON events       FOR ALL TO service_role USING (true);
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
CREATE POLICY "service_all" ON soundtracks FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.soundtracks TO service_role;

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
CREATE POLICY "service_all" ON member_accounts  FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON chat_messages    FOR ALL TO service_role USING (true);
CREATE POLICY "service_all" ON donation_tracker FOR ALL TO service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_accounts  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donation_tracker TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
