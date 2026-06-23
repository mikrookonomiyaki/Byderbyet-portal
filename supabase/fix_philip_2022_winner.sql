-- Fix Philip as 2022 winner using case-insensitive name lookup.
-- This avoids needing to know the exact spelling stored in participants.
UPDATE tournaments
SET winner_override = (
  SELECT name FROM participants
  WHERE tournament_id = '2022'
    AND name ILIKE '%philip%'
  LIMIT 1
)
WHERE year = 2022;
