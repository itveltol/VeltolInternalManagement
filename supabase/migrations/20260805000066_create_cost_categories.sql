-- Reference list of budget/cost categories used to group a project's deviz
-- (project_budget_lines) and, later, its purchase orders and supplier
-- invoices. Read-only to users — seeded here, maintained by migration only.
create table public.cost_categories (
  id          bigint primary key generated always as identity,
  code        text not null unique,
  name_ro     text not null,
  name_hu     text not null,
  name_en     text not null,
  sort_order  int not null
);

alter table public.cost_categories enable row level security;

create policy "cost_categories: authenticated select"
  on public.cost_categories for select
  to authenticated
  using (true);

insert into public.cost_categories (code, name_ro, name_hu, name_en, sort_order) values
  ('equipment',     'Echipamente',              'Berendezések',        'Equipment',            1),
  ('labor',         'Manoperă',                 'Munkadíj',            'Labor',                2),
  ('subcontractor', 'Subcontractori',           'Alvállalkozók',       'Subcontractors',       3),
  ('transport',     'Transport & logistică',    'Szállítás és logisztika', 'Transport & logistics', 4),
  ('machinery',     'Utilaje/închiriere',       'Gépek/bérlés',        'Machinery/rental',     5),
  ('permits',       'Avize & taxe',             'Engedélyek és díjak', 'Permits & fees',        6),
  ('other',         'Diverse/neprevăzute',      'Egyéb/előre nem látott', 'Other/contingency',  7);
