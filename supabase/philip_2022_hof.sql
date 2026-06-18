-- Add Philip as 2022 Byderby winner and update hall_of_fame() to:
--   1. filter by is_completed = TRUE
--   2. include is_duel scoring (-5 winner / +5 loser)
--   3. merge manual_hof_entries (manual entries take precedence per year)
-- Run in Supabase SQL Editor

-- Manual Hall of Fame overrides (used when tournament data is incomplete/lost)
CREATE TABLE IF NOT EXISTS manual_hof_entries (
  year INT PRIMARY KEY,
  name TEXT NOT NULL
);
ALTER TABLE manual_hof_entries ENABLE ROW LEVEL SECURITY;

-- Philip won 2022; data is lost so we store the result manually
INSERT INTO manual_hof_entries (year, name)
VALUES (2022, 'Philip')
ON CONFLICT (year) DO UPDATE SET name = EXCLUDED.name;

-- Recreate hall_of_fame() with is_completed filter, is_duel scoring, and manual overrides
CREATE OR REPLACE FUNCTION hall_of_fame()
RETURNS TABLE(year INT, name TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH computed AS (
    -- Sum doeng per participant per completed tournament
    SELECT
      t.year,
      p.name,
      SUM(
        CASE
          WHEN e.is_duel    THEN CASE WHEN r.placement = 1 THEN -5 ELSE 5 END
          WHEN e.is_hansa   THEN r.placement
          ELSE COALESCE(ds.points, r.placement)
        END
      ) AS total
    FROM tournaments t
    JOIN participants p ON p.tournament_id = t.id
    JOIN results      r ON r.participant_id = p.id
    JOIN events       e ON e.id = r.event_id
    LEFT JOIN doeng_scale ds ON ds.tournament_id = t.id AND ds.position = r.placement
      AND NOT e.is_duel AND NOT e.is_hansa
    WHERE t.is_completed = TRUE
    GROUP BY t.year, p.id, p.name
  ),
  ranked AS (
    -- Rank within each year (asc = lowest wins, desc = highest wins)
    SELECT
      c.year,
      c.name,
      c.total,
      t.scoring_direction,
      ROW_NUMBER() OVER (
        PARTITION BY c.year
        ORDER BY
          CASE WHEN COALESCE(t.scoring_direction, 'asc') = 'asc' THEN c.total END ASC,
          CASE WHEN t.scoring_direction = 'desc'                  THEN c.total END DESC
      ) AS rn
    FROM computed c
    JOIN tournaments t ON t.year = c.year
  ),
  computed_winners AS (
    SELECT year, name FROM ranked WHERE rn = 1
  ),
  -- Manual entries override computed winners for that year
  all_winners AS (
    SELECT m.year, m.name FROM manual_hof_entries m
    UNION ALL
    SELECT cw.year, cw.name FROM computed_winners cw
    WHERE cw.year NOT IN (SELECT year FROM manual_hof_entries)
  )
  SELECT aw.year, aw.name FROM all_winners aw
  ORDER BY aw.year ASC;
END;
$$;
