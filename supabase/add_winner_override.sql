-- Add manual winner override for tournaments with incomplete result data
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS winner_override TEXT;

-- Set Philip as 2022 winner (adjust name to match exact spelling in participants table)
UPDATE tournaments SET winner_override = 'Philip' WHERE year = 2022;
