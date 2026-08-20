-- Add "Depus" (submitted) as a new Matrice activity status, between in-progress
-- statuses and 'finalizat'. Does not count toward finalizat in progress_pct.
alter type activity_status add value if not exists 'depus';
