-- Situations move from project-scoped to contract-scoped: once a project can
-- have several contracts (see 20260908000127_create_contracts.sql), a
-- situation needs to bill against one specific contract's value/currency/
-- vat_rate, not "the project's" (now ambiguous) contract facts.
--
-- project_id is KEPT on situations (not dropped) — still needed for RLS
-- scoping (can_read_project_financials(project_id)) and any project-level
-- list/join that doesn't care which contract. contract_id becomes the
-- authority for money math (see the app-layer cutover, shipped separately).
alter table public.situations
  add column contract_id bigint references public.contracts (id) on delete restrict;

-- Auto-default on insert for any situation created by app code that hasn't
-- been updated yet to set contract_id explicitly (the app cutover ships as a
-- separate, later change) — picks the project's (at that time, sole)
-- contract if not already provided, so nothing can end up with a null
-- contract_id between this migration and the app cutover landing.
create or replace function public.fn_default_situation_contract_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.contract_id is null then
    select id into new.contract_id
    from public.contracts
    where project_id = new.project_id
    order by id
    limit 1;
  end if;
  return new;
end;
$$;

create trigger situations_default_contract_id
  before insert on public.situations
  for each row execute function public.fn_default_situation_contract_id();

-- Backfill existing rows (every project has exactly one contract at this
-- point, from the previous migration's backfill, so this is unambiguous).
update public.situations s
  set contract_id = c.id
  from public.contracts c
  where c.project_id = s.project_id
    and s.contract_id is null;

alter table public.situations
  alter column contract_id set not null;

create index situations_contract_id_idx on public.situations (contract_id);

-- Read-only, on-demand per-contract progress: filters the SAME Matrice data
-- (activities / matrice_phases / project_activity_status) that
-- recompute_project_progress() already uses, narrowed to one contract's own
-- contract_type[] instead of the project's union of all its contracts'
-- types. This is not a second matrix and not a stored/duplicated progress
-- column — it exists purely to give the Situații centralizer an accurate,
-- per-contract "Executat" split (e.g. a finished proiectare+executie
-- contract and a not-yet-started racordare contract on the same project
-- must show different percentages). projects.progress_pct is untouched by
-- this and keeps its existing, separate meaning (the blended, project-wide
-- number used by dashboards/list pages/the Matrice header badge).
create or replace function public.contract_progress_pct(p_contract_id bigint)
returns int language sql stable as $$
  select case
    when count(*) filter (where pas.status is distinct from 'na') = 0 then 0
    else round(
      count(*) filter (where pas.status = 'finalizat')::numeric
      / count(*) filter (where pas.status is distinct from 'na') * 100
    )
  end
  from public.contracts c
  join public.activities a on a.is_section_header = false
  join public.matrice_phases mp on mp.id = a.phase_id and mp.service_type = any(c.contract_type)
  left join public.project_activity_status pas
    on pas.activity_id = a.id and pas.project_id = c.project_id
  where c.id = p_contract_id;
$$;
