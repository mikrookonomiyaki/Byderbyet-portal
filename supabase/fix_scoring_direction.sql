-- Fix scoring_direction for 2019-2021 tournaments.
-- These are desc-mode tournaments (highest points wins).
-- Without this, player profiles show wrong Byderby-pokal winners for those years.
UPDATE tournaments
SET scoring_direction = 'desc'
WHERE year IN (2019, 2020, 2021);
