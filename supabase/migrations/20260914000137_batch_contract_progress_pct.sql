-- contract_progress_pct(bigint) (20260908000128) is called once per contract
-- from getContractRefsForCentralizer (situations/actions.ts), which fans out
-- into one RPC round-trip per row — on the full unfiltered contracts table,
-- this is an N+1 that dominates /situations page load time. This adds a
-- set-returning sibling that computes every contract's progress in one
-- query (same join/logic as contract_progress_pct, grouped by contract
-- instead of filtered to one), so the app can fetch all of them in a single
-- round trip. contract_progress_pct itself is left in place — still used
-- wherever a single contract's progress is needed on its own (e.g.
-- computeSituationFigures/finalizeSituationAction).
create or replace function public.contract_progress_pct_batch()
returns table (contract_id bigint, progress_pct int) language sql stable as $$
  select
    c.id,
    case
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
  group by c.id;
$$;

grant execute on function public.contract_progress_pct_batch() to authenticated;
