-- Contract type: which services the project's contract covers. A project can
-- be Proiectare-only, Executie-only, Mentenanta-only, or any combination
-- (e.g. P+E, P+E+M). This is independent of the Gantt/Matrice workflow
-- phases (planning/execution/autorizare, phase_no 1-7/8-10/11-12) which
-- track progress within a project's lifecycle, not which services are
-- contracted.
create type public.contract_type as enum ('proiectare', 'executie', 'mentenanta');

alter table public.projects
  add column contract_type public.contract_type[];

-- Backfill: assume existing projects cover all three services until reviewed.
update public.projects
  set contract_type = array['proiectare', 'executie', 'mentenanta']::public.contract_type[];

alter table public.projects
  alter column contract_type set not null,
  alter column contract_type set default array['proiectare', 'executie', 'mentenanta']::public.contract_type[];
