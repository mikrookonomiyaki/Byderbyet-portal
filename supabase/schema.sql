-- ============================================================
-- Byderbyet Portal — Database Schema
-- Run once in Supabase: Database > SQL Editor > New query
-- ============================================================

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

CREATE TABLE tournaments (
  id        TEXT    PRIMARY KEY,           -- '2025', '2024', '2023'
  year      INTEGER NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- Doeng-skalaen er unik per år: position 1/2/3 → poeng
CREATE TABLE doeng_scale (
  tournament_id TEXT     NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  position      SMALLINT NOT NULL CHECK (position > 0),
  points        SMALLINT NOT NULL,
  PRIMARY KEY (tournament_id, position)
);

-- Deltakerlisten er unik per turnering
CREATE TABLE participants (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT     NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          TEXT     NOT NULL,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (tournament_id, name)
);

CREATE TABLE events (
  id            TEXT     PRIMARY KEY,    -- '2025-fr-1', '2025-lø-8', …
  tournament_id TEXT     NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          TEXT     NOT NULL,
  day           TEXT,                    -- 'Fredag' | 'Lørdag' | 'Søndag'
  is_hansa      BOOLEAN  NOT NULL DEFAULT FALSE,
  sort_order    SMALLINT NOT NULL DEFAULT 0
);

-- Plassering er rådata; doeng-utregning skjer i applikasjonen.
-- For vanlige øvelser: placement ≤ 3 slås opp i doeng_scale.
-- For Hansa-øvelser:   placement-verdien er direkte doeng-poeng.
CREATE TABLE results (
  event_id       TEXT     NOT NULL REFERENCES events(id)       ON DELETE CASCADE,
  participant_id UUID     NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  placement      SMALLINT NOT NULL CHECK (placement > 0),
  PRIMARY KEY (event_id, participant_id)
);

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------

CREATE INDEX ON events       (tournament_id);
CREATE INDEX ON participants (tournament_id);
CREATE INDEX ON results      (event_id);
CREATE INDEX ON results      (participant_id);

-- ------------------------------------------------------------
-- Row-Level Security
-- ------------------------------------------------------------

ALTER TABLE tournaments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE doeng_scale  ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE results      ENABLE ROW LEVEL SECURITY;

-- Alle kan lese

CREATE POLICY "public_read" ON tournaments  FOR SELECT USING (true);
CREATE POLICY "public_read" ON doeng_scale  FOR SELECT USING (true);
CREATE POLICY "public_read" ON participants FOR SELECT USING (true);
CREATE POLICY "public_read" ON events       FOR SELECT USING (true);
CREATE POLICY "public_read" ON results      FOR SELECT USING (true);

-- Bare innlogget admin kan skrive (auth.uid() IS NOT NULL = pålogget bruker)

CREATE POLICY "admin_insert" ON tournaments  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin_update" ON tournaments  FOR UPDATE USING     (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete" ON tournaments  FOR DELETE USING     (auth.uid() IS NOT NULL);

CREATE POLICY "admin_insert" ON doeng_scale  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin_update" ON doeng_scale  FOR UPDATE USING     (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete" ON doeng_scale  FOR DELETE USING     (auth.uid() IS NOT NULL);

CREATE POLICY "admin_insert" ON participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin_update" ON participants FOR UPDATE USING     (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete" ON participants FOR DELETE USING     (auth.uid() IS NOT NULL);

CREATE POLICY "admin_insert" ON events       FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin_update" ON events       FOR UPDATE USING     (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete" ON events       FOR DELETE USING     (auth.uid() IS NOT NULL);

CREATE POLICY "admin_insert" ON results      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin_update" ON results      FOR UPDATE USING     (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete" ON results      FOR DELETE USING     (auth.uid() IS NOT NULL);
