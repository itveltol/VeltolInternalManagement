-- 20260908000131_drop_projects_contract_columns.sql dropped projects.contract_type,
-- but public.recompute_project_progress() (redefined most recently in
-- 20260901000110_recompute_progress_on_catalog_change.sql) still read
-- proj.contract_type to gate phase eligibility. That function runs in an
-- AFTER trigger on every project_activity_status write (i.e. every Matrice
-- cell status change), so after the column drop it started throwing
-- "column contract_type does not exist" on every single cell edit.
--
-- Fix: read the union of a project's contracts' contract_type via
-- contract_claimed_types (the flattened, always-in-sync table maintained by
-- contracts' own trigger — see 20260908000127_create_contracts.sql) instead
-- of the dropped projects.contract_type column. Same semantics as the app
-- layer's attachUnionedContractTypes() in supabaseMatriceClient.ts.
create or replace function public.recompute_project_progress(p_project_id bigint)
returns void language plpgsql security definer as $$
declare
  proj record;
  eligible_count int;
  done_count int;
  computed_pct int;
  today date := current_date;
  worst_variance text := null; -- 'behind' | 'ahead' | 'on_track' | null (no dated/active phase)
  phase record;
  phase_pct int;
  phase_eligible int;
  phase_done int;
  phase_start date;
  phase_end date;
  expected_pct int;
  variance text;
  computed_status public.project_status;
begin
  select * into proj from public.projects where id = p_project_id;
  if not found then
    return;
  end if;

  select
    count(*) filter (where pas.status is distinct from 'na'),
    count(*) filter (where pas.status = 'finalizat')
  into eligible_count, done_count
  from public.activities a
  join public.matrice_phases mp on mp.id = a.phase_id
  left join public.project_activity_status pas
    on pas.activity_id = a.id and pas.project_id = proj.id
  where a.is_section_header = false
    and mp.service_type in (
      select ct.contract_type from public.contract_claimed_types ct
      where ct.project_id = proj.id
    );

  if eligible_count is null or eligible_count = 0 then
    computed_pct := 0;
  else
    computed_pct := round((done_count::numeric / eligible_count) * 100);
  end if;

  update public.projects set progress_pct = computed_pct where id = proj.id;

  if not proj.status_manual then
    for phase in
      select * from (values
        ('planning',   proj.planning_start_date,   proj.planning_end_date),
        ('execution',  proj.execution_start_date,  proj.execution_end_date),
        ('autorizare', proj.autorizare_start_date, proj.autorizare_end_date)
      ) as p(gantt_phase_key, start_date, end_date)
    loop
      phase_start := phase.start_date;
      phase_end := phase.end_date;
      if phase_start is null or phase_end is null or phase_end < phase_start then
        continue;
      end if;

      select
        count(*) filter (where pas.status is distinct from 'na'),
        count(*) filter (where pas.status = 'finalizat')
      into phase_eligible, phase_done
      from public.activities a
      join public.matrice_phases mp on mp.id = a.phase_id
      left join public.project_activity_status pas
        on pas.activity_id = a.id and pas.project_id = proj.id
      where a.is_section_header = false
        and mp.gantt_phase_key = phase.gantt_phase_key;

      if phase_eligible is null or phase_eligible = 0 then
        phase_pct := 0;
      else
        phase_pct := round((phase_done::numeric / phase_eligible) * 100);
      end if;

      expected_pct := round(
        greatest(0, least(1,
          (today - phase_start)::numeric / nullif((phase_end + 1 - phase_start)::numeric, 0)
        )) * 100
      );

      if phase_pct >= 100 then
        variance := 'on_track';
      elsif phase_pct >= expected_pct then
        variance := 'ahead';
      elsif expected_pct - phase_pct >= 10 then
        variance := 'behind';
      else
        variance := 'on_track';
      end if;

      if variance = 'behind' then
        worst_variance := 'behind';
      elsif variance = 'ahead' and worst_variance is distinct from 'behind' then
        worst_variance := 'ahead';
      elsif worst_variance is null then
        worst_variance := variance;
      end if;
    end loop;

    if computed_pct >= 100 and worst_variance is distinct from 'behind' then
      computed_status := 'completed';
    elsif worst_variance = 'behind' then
      computed_status := 'delayed';
    else
      computed_status := 'on_schedule';
    end if;

    update public.projects set status = computed_status where id = proj.id;
  end if;
end;
$$;

-- Re-run now that the function reads live contract data correctly, in case
-- any project's progress_pct/status was left at 0/stale by the broken
-- function while this migration hadn't landed yet.
select public.recompute_all_project_progress();
