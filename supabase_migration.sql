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
