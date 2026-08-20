-- First-class phases table, replacing the phase_no/phase_name pair that was
-- duplicated across every activities row. This is required before the
-- catalog can become admin-editable: phase_no was also serving as an
-- implicit, hardcoded gate for contract-type eligibility (see
-- contractTypeForPhase in matriceService.ts, phase_no <= 7 => proiettare)
-- and for the Gantt portfolio view's 3-bucket rollup (GANTT_PHASE_MATRICE_RANGE
-- in gantt/types.ts, phase_no 1-7/8-10/11-12 => planning/execution/autorizare).
-- service_type and gantt_phase_key make those two gates explicit data on the
-- phase itself, so admins can reorder/rename/renumber phases without silently
-- breaking progress_pct or Gantt segment gating.
create table public.matrice_phases (
  id              bigint generated always as identity primary key,
  name            text not null,
  sort_order      int not null,
  service_type    public.contract_type not null,
  gantt_phase_key text check (gantt_phase_key in ('planning', 'execution', 'autorizare')),
  created_at      timestamptz not null default now()
);

create unique index matrice_phases_sort_order_key on public.matrice_phases (sort_order);

alter table public.matrice_phases enable row level security;

create policy "matrice_phases_read" on public.matrice_phases
  for select to authenticated using (true);

create policy "matrice_phases_write" on public.matrice_phases
  for all to authenticated using (is_admin()) with check (is_admin());

-- Backfill one phase row per distinct existing phase_no, deriving
-- service_type/gantt_phase_key from the ranges hardcoded today in
-- contractTypeForPhase() and GANTT_PHASE_MATRICE_RANGE respectively.
insert into public.matrice_phases (id, name, sort_order, service_type, gantt_phase_key)
overriding system value
select
  phase_no as id,
  min(phase_name) as name,
  phase_no as sort_order,
  case when phase_no <= 7 then 'proiectare' else 'executie' end::public.contract_type as service_type,
  case
    when phase_no between 1 and 7 then 'planning'
    when phase_no between 8 and 10 then 'execution'
    when phase_no >= 11 then 'autorizare'
  end as gantt_phase_key
from public.activities
group by phase_no;

-- Keep the identity sequence ahead of the explicitly-inserted ids above so
-- future admin-created phases don't collide with backfilled ones.
select setval(
  pg_get_serial_sequence('public.matrice_phases', 'id'),
  greatest((select max(id) from public.matrice_phases), 1)
);
