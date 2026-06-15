-- Add draft/published flag to events
-- Run this ONCE in Supabase SQL Editor before deploying the matching frontend changes.
-- Existing events default to TRUE (still visible). New events created in admin will be drafts.
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;
