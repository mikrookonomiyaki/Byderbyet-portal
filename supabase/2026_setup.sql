-- 2026 tournament setup
-- Run in Supabase SQL Editor

-- pgcrypto for PIN hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add is_completed to tournaments (TRUE by default so existing years still show pokaler/medaljer)
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT TRUE;

-- Add is_duel to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_duel BOOLEAN NOT NULL DEFAULT FALSE;

-- Admin PIN table (no public RLS policy — only accessible via SECURITY DEFINER function)
CREATE TABLE IF NOT EXISTS admin_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- RPC to verify PIN server-side (callable with anon key, returns only true/false)
CREATE OR REPLACE FUNCTION verify_admin_pin(pin TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_config
    WHERE key = 'pin_hash' AND value = crypt(pin, value)
  );
END;
$$;

-- Default PIN is 1234. Change with:
-- UPDATE admin_config SET value = crypt('YOUR_PIN', gen_salt('bf')) WHERE key = 'pin_hash';
INSERT INTO admin_config(key, value)
VALUES ('pin_hash', crypt('1234', gen_salt('bf')))
ON CONFLICT(key) DO NOTHING;

-- Insert 2026 tournament (not completed, active)
INSERT INTO tournaments (id, year, is_active, is_completed, scoring_direction)
VALUES ('2026', 2026, TRUE, FALSE, 'asc')
ON CONFLICT (id) DO NOTHING;

-- Deactivate 2025
UPDATE tournaments SET is_active = FALSE WHERE year = 2025;

-- Copy doeng scale from 2025 to 2026
INSERT INTO doeng_scale (tournament_id, position, points)
SELECT '2026', position, points FROM doeng_scale WHERE tournament_id = '2025'
ON CONFLICT DO NOTHING;

-- 14 regular events for 2026 (all unpublished/draft)
INSERT INTO events (id, tournament_id, name, day, is_hansa, is_published, sort_order, is_duel) VALUES
  ('2026-fr-1', '2026', 'Bomullsdott',       'Fredag',  FALSE, FALSE,  1, FALSE),
  ('2026-fr-2', '2026', 'Darts',             'Fredag',  FALSE, FALSE,  2, FALSE),
  ('2026-fr-3', '2026', 'Beer pong',         'Fredag',  FALSE, FALSE,  3, FALSE),
  ('2026-fr-4', '2026', 'Papirfly',          'Fredag',  FALSE, FALSE,  4, FALSE),
  ('2026-lø-1', '2026', 'Bordtennis',        'Lørdag',  FALSE, FALSE,  5, FALSE),
  ('2026-lø-2', '2026', 'Volleyball',        'Lørdag',  FALSE, FALSE,  6, FALSE),
  ('2026-lø-3', '2026', 'Spikeball',         'Lørdag',  FALSE, FALSE,  7, FALSE),
  ('2026-lø-4', '2026', 'Slåball',           'Lørdag',  FALSE, FALSE,  8, FALSE),
  ('2026-lø-5', '2026', 'Støvelkast',        'Lørdag',  FALSE, FALSE,  9, FALSE),
  ('2026-sø-1', '2026', 'Petanque',          'Søndag',  FALSE, FALSE, 10, FALSE),
  ('2026-sø-2', '2026', 'Hot wheels race',   'Søndag',  FALSE, FALSE, 11, FALSE),
  ('2026-sø-3', '2026', 'Ballongleken',      'Søndag',  FALSE, FALSE, 12, FALSE),
  ('2026-sø-4', '2026', 'Stein saks papir',  'Søndag',  FALSE, FALSE, 13, FALSE),
  ('2026-uv-1', '2026', 'Tippelappen VM',    NULL,      FALSE, FALSE, 14, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 13 duel events for 2026 (no day assigned yet, all unpublished)
INSERT INTO events (id, tournament_id, name, day, is_hansa, is_published, sort_order, is_duel) VALUES
  ('2026-d-01', '2026', 'Kron eller mynt',      NULL, FALSE, FALSE, 100, TRUE),
  ('2026-d-02', '2026', 'Carrot in a box',       NULL, FALSE, FALSE, 101, TRUE),
  ('2026-d-03', '2026', 'Bezzerwizzer',          NULL, FALSE, FALSE, 102, TRUE),
  ('2026-d-04', '2026', 'Spikern',               NULL, FALSE, FALSE, 103, TRUE),
  ('2026-d-05', '2026', 'Jenga',                 NULL, FALSE, FALSE, 104, TRUE),
  ('2026-d-06', '2026', 'Førstemann til Hitler', NULL, FALSE, FALSE, 105, TRUE),
  ('2026-d-07', '2026', 'Potetløp',              NULL, FALSE, FALSE, 106, TRUE),
  ('2026-d-08', '2026', 'Lukeparkering',         NULL, FALSE, FALSE, 107, TRUE),
  ('2026-d-09', '2026', 'Smaksprøve',            NULL, FALSE, FALSE, 108, TRUE),
  ('2026-d-10', '2026', 'Dansematte',            NULL, FALSE, FALSE, 109, TRUE),
  ('2026-d-11', '2026', 'Beyblade',              NULL, FALSE, FALSE, 110, TRUE),
  ('2026-d-12', '2026', 'Singstar',              NULL, FALSE, FALSE, 111, TRUE),
  ('2026-d-13', '2026', 'GeoGuessr',             NULL, FALSE, FALSE, 112, TRUE)
ON CONFLICT (id) DO NOTHING;
