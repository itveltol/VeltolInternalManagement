-- Remove obsolete Matrice Status activity rows (and their per-project statuses via cascade)
delete from public.activities
where name in (
  'Avize amplasament operatori rețele (DEER)',
  'Ministerul Agriculturii',
  'Proiect + Planșe',
  'HyManager'
);
