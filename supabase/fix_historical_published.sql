-- Ensure is_published column exists with correct default
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;

-- Explicitly publish all 2019, 2020, 2021 events
-- Safe to run multiple times (idempotent)
UPDATE events
SET is_published = TRUE
WHERE tournament_id IN (
  'f9176c19-d406-4444-a927-585f484c5bdf',  -- 2019
  '49d63443-dc9a-42a7-ba25-8a31097064d5',  -- 2020
  'b570023e-2915-4b20-b629-b3242c064329'   -- 2021
);
