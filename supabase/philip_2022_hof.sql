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
LANGUAGE sql SECURITY DEFINER AS $$
  WITH totals AS (
    SELECT
      t.year,
      t.scoring_direction,
      p.name,
      SUM(
        CASE
          WHEN e.is_duel  = TRUE THEN CASE WHEN r.placement = 1 THEN -5 ELSE 5 END
          WHEN e.is_hansa = TRUE THEN r.placement
          ELSE COALESCE(ds.points, r.placement)
        END
      )::numeric AS total
    FROM tournaments t
    JOIN participants p  ON p.tournament_id = t.id
    JOIN results      r  ON r.participant_id = p.id
    JOIN events       e  ON e.id = r.event_id AND e.tournament_id = t.id
    LEFT JOIN doeng_scale ds
      ON ds.tournament_id = t.id
      AND ds.position = r.placement
      AND e.is_duel  = FALSE
      AND e.is_hansa = FALSE
    WHERE t.is_completed = TRUE
    GROUP BY t.year, t.scoring_direction, p.id, p.name
  ),
  ranked AS (
    SELECT
      year,
      name,
      -- Normalise so that lowest value always wins; flip desc-mode scores
      RANK() OVER (
        PARTITION BY year
        ORDER BY
          CASE WHEN COALESCE(scoring_direction, 'asc') = 'asc'
               THEN  total
               ELSE -total
          END ASC
      ) AS rnk
    FROM totals
  ),
  computed_winners AS (
    SELECT year, name FROM ranked WHERE rnk = 1
  ),
  all_winners AS (
    -- Manual entries take precedence for their year
    SELECT year, name FROM manual_hof_entries
    UNION ALL
    SELECT year, name FROM computed_winners
    WHERE year NOT IN (SELECT year FROM manual_hof_entries)
  )
  SELECT year, name FROM all_winners
  ORDER BY year ASC;
$$;
