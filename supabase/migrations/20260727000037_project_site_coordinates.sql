-- Store a pinned map location for a project's site alongside the existing
-- free-text site_location label.
alter table public.projects
  add column site_lat double precision,
  add column site_lng double precision;
