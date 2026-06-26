-- Disambiguate the two players named "Even":
--   2019-2021: "Even" is Even Reven
--   2023-2024: "Even" is Even B.
--
-- Results rows are linked by participant UUID, so they update automatically.

UPDATE participants
SET name = 'Even Reven'
WHERE name = 'Even'
  AND tournament_id IN (
    SELECT id FROM tournaments WHERE year IN (2019, 2020, 2021)
  );

UPDATE participants
SET name = 'Even B.'
WHERE name = 'Even'
  AND tournament_id IN (
    SELECT id FROM tournaments WHERE year IN (2023, 2024)
  );
