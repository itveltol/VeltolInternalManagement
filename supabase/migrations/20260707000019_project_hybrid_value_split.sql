-- Split value breakdown for hybrid (solar + BESS) projects; value_eur keeps storing the total.
alter table public.projects
  add column value_eur_solar bigint,
  add column value_eur_bess bigint;
