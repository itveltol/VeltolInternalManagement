-- Maps the ~28 checklist items that duplicate a Matrice "Execuție"/"Montaj
-- BESS" activity (phase_no 9/10) to that activity's id, so checklist progress
-- can drive the corresponding Matrice cell automatically (see next migration).
-- Resolved by activity NAME rather than a hardcoded id, since activities.id
-- is a `generated always as identity` column whose values depend on seed
-- insertion order — matching by name stays correct even if the catalog is
-- ever reseeded. Mirrors the TS map in
-- src/features/matrice/services/checklistActivityMapping.ts — keep both in
-- sync if either catalog changes.
--
-- Deliberately excluded (stay 100% manual in Matrice):
--   - phase_no 8 (Oferte și Comandă Materiale / procurement) — no checklist
--     equivalent at all.
--   - checklist item 8 "Montaj panouri" — ambiguous between Matrice's
--     "Montaj Panouri" and "Montaj Panouri Fotovoltaice"; left unmapped
--     rather than guessing.
--   - checklist items 41 ("Conexiuni date / SCADA") and 43 ("Verificări
--     electrice + probe") — no Matrice phase_no 10 counterpart exists.

create table public.checklist_activity_map (
  item_number  smallint not null primary key,
  activity_id  bigint not null references public.activities(id) on delete cascade unique
);

alter table public.checklist_activity_map enable row level security;

create policy "checklist_activity_map: authenticated select"
  on public.checklist_activity_map for select
  using (auth.uid() is not null);

insert into public.checklist_activity_map (item_number, activity_id)
select v.item_number, a.id
from (values
  (2,  'Împrejmuire – Stâlpuri'),
  (3,  'Împrejmuire – Panou Bordurat'),
  (4,  'Batere Stâlpi'),
  (5,  'Montaj Grinzi Longitudinale'),
  (6,  'Montaj Grinzi Verticale'),
  (9,  'Montaj Jgheab Metalic / Trasee Cabluri Solare'),
  (10, 'Realizare Cablaj Stringuri'),
  (12, 'Săpături Trasee Cabluri AC'),
  (13, 'Realizare Împământare (Țăruși + Platbandă)'),
  (14, 'Pozare Cabluri AC (Forță + Iluminat + Camere)'),
  (15, 'Fundații + Plantare Stâlpi Iluminat'),
  (16, 'Montaj Piese Separație + Trasee Împământare + Paratrăsnet'),
  (18, 'Montaj Invertoare + Tablouri Colectoare AC (TEC)'),
  (20, 'Realizare Conexiuni AC Invertoare'),
  (21, 'Realizare Conexiuni Tablouri Electrice AC'),
  (22, 'Realizare Conexiuni TDRI / PTAB'),
  (24, 'Fundație Posturi Trafo'),
  (25, 'Amplasare Posturi Trafo + Macara'),
  (26, 'Amplasare Transformatoare + Macara'),
  (27, 'Cablare Posturi Trafo'),
  (29, 'Verificări Înaintea Recepției'),
  (31, 'Împrejmuire'),
  (32, 'Iluminat'),
  (33, 'Sistem de camere'),
  (35, 'Fundație'),
  (37, 'Închiriere macara'),
  (38, 'Cablare'),
  (40, 'Racord')
) as v(item_number, activity_name)
join public.activities a on a.name = v.activity_name and a.phase_no in (9, 10)
on conflict (item_number) do nothing;
