-- Remove Sofie from the 2025 tournament.
-- Results are deleted automatically via ON DELETE CASCADE.
DELETE FROM participants
WHERE tournament_id = '2025'
  AND name ILIKE 'Sofie%';
