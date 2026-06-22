-- Add optional banner text to tournaments.
-- Run once in Supabase SQL Editor.
-- When NULL the banner is hidden. Admin can set/clear it per tournament.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS banner_text TEXT;
