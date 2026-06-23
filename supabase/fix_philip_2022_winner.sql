-- Register Philip as 2022 winner.
-- Looks up his exact name from ANY year he participated (not just 2022),
-- so this works even when 2022 has no registered participants or scores.
UPDATE tournaments
SET winner_override = (
  SELECT name FROM participants
  WHERE name ILIKE '%philip%'
  LIMIT 1
)
WHERE year = 2022;
