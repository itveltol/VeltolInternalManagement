-- fn_recompute_project_progress() gated matrice phase_no >= 11 (autorizare)
-- on contract_type 'mentenanta', but both matriceService.ts
-- (contractTypeForPhase) and gantt/types.ts (CONTRACT_TYPE_BY_PHASE) gate the
-- same phases on 'executie' — autorizare is execution-stage work, not a
-- maintenance service. The SQL was the outlier: for an execution-only
-- contract (no 'mentenanta'), the DB trigger silently excluded phases 11-12
-- from the eligible-activity count, so DB-computed progress_pct diverged
-- from the client-side projectCompletionPct.
create or replace function public.fn_recompute_project_progress()
returns trigger language plpgsql security definer as $$
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
  select * into proj from public.projects where id = coalesce(new.project_id, old.project_id);
  if not found then
    return coalesce(new, old);
  end if;

  -- Overall completion %, mirroring projectCompletionPct: exclude section
  -- headers, exclude phases the contract doesn't cover, exclude 'na' cells.
  select
    count(*) filter (where pas.status is distinct from 'na'),
    count(*) filter (where pas.status = 'finalizat')
  into eligible_count, done_count
  from public.activities a
  left join public.project_activity_status pas
    on pas.activity_id = a.id and pas.project_id = proj.id
  where a.is_section_header = false
    and (
      (a.phase_no <= 7 and 'proiectare' = any(proj.contract_type))
      or (a.phase_no between 8 and 10 and 'executie' = any(proj.contract_type))
      or (a.phase_no >= 11 and 'executie' = any(proj.contract_type))
    );

  if eligible_count is null or eligible_count = 0 then
    computed_pct := 0;
  else
    computed_pct := round((done_count::numeric / eligible_count) * 100);
  end if;

  update public.projects set progress_pct = computed_pct where id = proj.id;

  if not proj.status_manual then
    -- Evaluate schedule variance per Gantt-style phase (planning=1-7,
    -- execution=8-10, autorizare=11-12), mirroring segmentVariance: only
    -- phases with both a start and end date are considered; the worst
    -- variance across phases wins ('behind' beats 'ahead'/'on_track').
    for phase in
      select * from (values
        (1, 7,  proj.planning_start_date,   proj.planning_end_date),
        (8, 10, proj.execution_start_date,  proj.execution_end_date),
        (11, 12, proj.autorizare_start_date, proj.autorizare_end_date)
      ) as p(lo, hi, start_date, end_date)
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
      left join public.project_activity_status pas
        on pas.activity_id = a.id and pas.project_id = proj.id
      where a.is_section_header = false
        and a.phase_no between phase.lo and phase.hi;

      if phase_eligible is null or phase_eligible = 0 then
        phase_pct := 0;
      else
        phase_pct := round((phase_done::numeric / phase_eligible) * 100);
      end if;

      -- date - date yields an integer day count in Postgres (no epoch/interval
      -- conversion needed); +1 mirrors segmentVariance's inclusive end date.
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

  return coalesce(new, old);
end;
$$;

-- Backfill: correct any project whose progress_pct was computed under the
-- old (wrong) 'mentenanta' gate, rather than waiting for its next Matrice
-- cell edit to trigger a recompute.
update public.projects proj set progress_pct = (
  select case
    when count(*) filter (where pas.status is distinct from 'na') = 0 then 0
    else round(
      (count(*) filter (where pas.status = 'finalizat'))::numeric
      / count(*) filter (where pas.status is distinct from 'na')
      * 100
    )
  end
  from public.activities a
  left join public.project_activity_status pas
    on pas.activity_id = a.id and pas.project_id = proj.id
  where a.is_section_header = false
    and (
      (a.phase_no <= 7 and 'proiectare' = any(proj.contract_type))
      or (a.phase_no between 8 and 10 and 'executie' = any(proj.contract_type))
      or (a.phase_no >= 11 and 'executie' = any(proj.contract_type))
    )
);
