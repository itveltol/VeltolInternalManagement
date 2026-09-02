-- fn_recompute_project_progress() only fires on project_activity_status
-- writes (one project's own cells changing) — there is no trigger on
-- activities/matrice_phases, so a Matrice Catalog edit (regating a phase,
-- adding/removing an activity, moving an activity to a different phase)
-- never updates progress_pct for any existing project. The Matrice status
-- page always recomputes live from current catalog state, so it shows the
-- new percentage immediately; progress_pct (and everything derived from it,
-- e.g. the Situații centralizer's Valoare executată) stays frozen at the
-- pre-edit value until someone happens to touch that project's own cells.
-- 20260819000099_fix_progress_phase_gate_v2.sql hit exactly this class of
-- drift once already and patched it with a one-time backfill; this closes
-- the structural gap so it can't silently recur on the next catalog edit.
--
-- Extracts the per-project computation fn_recompute_project_progress()
-- already does into a plain (non-trigger) function so both the trigger and
-- a new bulk recompute call the same logic — no second implementation to
-- keep in sync.
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
    and mp.service_type = any(proj.contract_type);

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

-- Trigger body shrinks to a single call into the shared function above.
create or replace function public.fn_recompute_project_progress()
returns trigger language plpgsql security definer as $$
begin
  perform public.recompute_project_progress(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

-- Callable from the Matrice Catalog admin actions after any edit that can
-- change eligibility or the activity set (phase gating, activity add/
-- remove/move, phase add/remove) — cheap enough to just run for every
-- project rather than compute which ones are actually affected.
create or replace function public.recompute_all_project_progress()
returns void language plpgsql security definer as $$
declare
  proj_id bigint;
begin
  for proj_id in select id from public.projects loop
    perform public.recompute_project_progress(proj_id);
  end loop;
end;
$$;

-- Called from the Matrice Catalog admin server actions (already gated on
-- requireAdmin() at the app layer) via supabase.rpc(...), same pattern as
-- create_note/get_mention_candidates.
grant execute on function public.recompute_all_project_progress() to authenticated;

-- One-time correction for any project that's already drifted under today's
-- catalog shape, same rationale as 20260819000099's own backfill.
select public.recompute_all_project_progress();
